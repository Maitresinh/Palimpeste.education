import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import { createContext } from "@lectio/api/context";
import { appRouter } from "@lectio/api/routers/index";
import { auth } from "@lectio/auth";
import { db, document, groupMember, user, eq, and, sql } from "@lectio/db";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { writeFile } from "node:fs/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";

// ============================================
// STRUCTURED LOGGING - JSON logs for production
// ============================================
const isProduction = process.env.NODE_ENV === "production";

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

const log = {
  _log(level: LogLevel, message: string, context?: Record<string, unknown>, error?: Error) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
    };

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: isProduction ? undefined : error.stack,
      };
    }

    if (isProduction) {
      // JSON output for log aggregators (e.g., CloudWatch, Datadog)
      console.log(JSON.stringify(entry));
    } else {
      // Human-readable output for development
      const prefix = `[${entry.timestamp}] [${level.toUpperCase()}]`;
      console.log(prefix, message, context ? JSON.stringify(context) : "");
      if (error) console.error(error);
    }
  },

  debug(message: string, context?: Record<string, unknown>) {
    if (!isProduction) this._log("debug", message, context);
  },
  info(message: string, context?: Record<string, unknown>) {
    this._log("info", message, context);
  },
  warn(message: string, context?: Record<string, unknown>) {
    this._log("warn", message, context);
  },
  error(message: string, error?: Error, context?: Record<string, unknown>) {
    this._log("error", message, context, error);
  },
};

// ============================================
// RATE LIMITING - Protection contre DDoS/brute force
// ============================================
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Nettoyer les entrées expirées toutes les 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

function createRateLimiter(maxRequests: number, windowMs: number) {
  return async (c: any, next: () => Promise<void>) => {
    const ip = c.req.header("x-forwarded-for")?.split(",")[0]?.trim()
      || c.req.header("x-real-ip")
      || "unknown";
    const key = `${ip}:${c.req.path}`;
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      entry = { count: 1, resetTime: now + windowMs };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    // Ajouter les headers de rate limit
    c.header("X-RateLimit-Limit", maxRequests.toString());
    c.header("X-RateLimit-Remaining", Math.max(0, maxRequests - entry.count).toString());
    c.header("X-RateLimit-Reset", Math.ceil(entry.resetTime / 1000).toString());

    if (entry.count > maxRequests) {
      return c.json(
        { error: "Too many requests. Please try again later." },
        429
      );
    }

    await next();
  };
}

// Rate limiters pour différents endpoints
const authRateLimiter = createRateLimiter(10, 60 * 1000);      // 10 req/min pour auth
const uploadRateLimiter = createRateLimiter(20, 60 * 1000);    // 20 req/min pour upload
const apiRateLimiter = createRateLimiter(200, 60 * 1000);      // 200 req/min pour API générale

// ============================================
// PATH TRAVERSAL PROTECTION
// ============================================
function validateFilePath(filepath: string, allowedDir: string): string | null {
  // Résoudre les chemins absolus
  const resolvedPath = path.resolve(process.cwd(), filepath);
  const uploadsDir = path.resolve(process.cwd(), allowedDir);

  // Vérifier que le chemin résolu reste dans le dossier autorisé
  if (!resolvedPath.startsWith(uploadsDir + path.sep) && resolvedPath !== uploadsDir) {
    log.warn("Path traversal attempt detected", { attemptedPath: filepath });
    return null;
  }

  return resolvedPath;
}

const app = new Hono();

// Logger HTTP uniquement en développement
if (!isProduction) {
  app.use(logger());
}
app.use(
  "/*",
  cors({
    origin: process.env.CORS_ORIGIN || "",
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Rate limiting sur les endpoints d'authentification
app.use("/api/auth/*", authRateLimiter);
app.on(["POST", "GET"], "/api/auth/*", (c) => auth.handler(c.req.raw));

// Rate limiting sur l'upload
app.use("/api/upload/*", uploadRateLimiter);

// Endpoint pour uploader un EPUB
app.post("/api/upload/epub", async (c) => {
  try {
    // Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File;
    const groupId = formData.get("groupId") as string | null;
    const isPublic = formData.get("isPublic") as string | null;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Vérifier le type MIME
    if (file.type !== "application/epub+zip") {
      return c.json({ error: "Only EPUB files are allowed" }, 400);
    }

    // Récupérer le rôle de l'utilisateur
    const [userData] = await db.select({ role: user.role, storageUsed: user.storageUsed, storageQuota: user.storageQuota })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    const userRole = userData?.role;

    // Vérifier les permissions pour upload public
    if (isPublic === "true") {
      if (userRole !== "ADMIN") {
        return c.json({ error: "Seuls les administrateurs peuvent ajouter des livres publics" }, 403);
      }
    }

    // Vérifier les permissions pour upload personnel (sans groupId)
    if (!groupId && isPublic !== "true") {
      // Les STUDENTS ne peuvent pas uploader de livres personnels
      if (userRole === "STUDENT") {
        return c.json({ error: "Les élèves ne peuvent pas importer de livres personnels" }, 403);
      }
    }

    // Vérifier les permissions pour upload dans un groupe
    if (groupId) {
      // Check user's role within this specific group
      const membership = await db.query.groupMember.findFirst({
        where: (gm, { and, eq }) => and(eq(gm.groupId, groupId), eq(gm.userId, session.user.id)),
      });

      const groupRole = membership?.role;
      // Only OWNER or ADMIN of the group can upload books to it
      if (groupRole !== "OWNER" && groupRole !== "ADMIN") {
        return c.json({ error: "Seuls les administrateurs peuvent ajouter des livres" }, 403);
      }
    }

    // Vérifier le quota de stockage (userData already fetched above)
    if (userData) {
      const newTotal = (userData.storageUsed || 0) + file.size;
      if (newTotal > (userData.storageQuota || 500 * 1024 * 1024)) {
        const usedMB = Math.round((userData.storageUsed || 0) / 1024 / 1024);
        const quotaMB = Math.round((userData.storageQuota || 500 * 1024 * 1024) / 1024 / 1024);
        return c.json({
          error: `Quota de stockage dépassé (${usedMB}/${quotaMB} MB utilisés)`,
          code: "QUOTA_EXCEEDED"
        }, 413);
      }
    }

    // Créer le dossier uploads s'il n'existe pas
    const uploadsDir = path.join(process.cwd(), "uploads");
    await mkdir(uploadsDir, { recursive: true });

    // Générer un nom de fichier unique
    const fileId = crypto.randomUUID();
    const filename = file.name;
    const filepath = path.join(uploadsDir, `${fileId}.epub`);

    // Sauvegarder le fichier
    const buffer = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(buffer));

    // Extraire les métadonnées (Titre et Auteur)
    let title = filename.replace(".epub", "");
    let author: string | null = null;

    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(buffer);

      const containerFile = zip.file("META-INF/container.xml");
      if (containerFile) {
        const containerXml = await containerFile.async("string");
        const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);

        if (rootfileMatch) {
          const opfPath = rootfileMatch[1];
          const opfFile = zip.file(opfPath);

          if (opfFile) {
            const opfXml = await opfFile.async("string");

            // Extraire le titre
            const titleMatch = opfXml.match(/<dc:title[^>]*>(.*?)<\/dc:title>/i);
            if (titleMatch) {
              title = titleMatch[1];
            }

            // Extraire l'auteur
            const authorMatch = opfXml.match(/<dc:creator[^>]*>(.*?)<\/dc:creator>/i);
            if (authorMatch) {
              author = authorMatch[1];
            }
          }
        }
      }
    } catch (e) {
      log.warn("Error extracting metadata", { error: e instanceof Error ? e.message : String(e) });
      // Fallback to filename if extraction fails
    }

    // Enregistrer dans la base de données
    const [newDocument] = await db
      .insert(document)
      .values({
        id: fileId,
        title: title,
        author: author,
        filename: filename,
        filepath: `uploads/${fileId}.epub`,
        filesize: file.size.toString(),
        mimeType: file.type,
        ownerId: session.user.id,
        groupId: groupId || null,
        isPublic: isPublic === "true" ? "true" : "false",
      })
      .returning();

    // Mettre à jour le stockage utilisé
    await db.update(user)
      .set({ storageUsed: sql`${user.storageUsed} + ${file.size}` })
      .where(eq(user.id, session.user.id));

    return c.json({
      success: true,
      document: newDocument,
    });
  } catch (error) {
    log.error("Upload error", error instanceof Error ? error : new Error(String(error)));
    return c.json({ error: "Upload failed" }, 500);
  }
});

// Endpoint pour uploader une image (logo, etc.) - Admin only
app.post("/api/upload/image", async (c) => {
  try {
    // Vérifier l'authentification
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    // Vérifier que l'utilisateur est admin
    const [userData] = await db.select({ role: user.role })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (!userData || userData.role !== "ADMIN") {
      return c.json({ error: "Admin access required" }, 403);
    }

    const formData = await c.req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return c.json({ error: "No file provided" }, 400);
    }

    // Vérifier le type MIME (images uniquement)
    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/gif", "image/webp", "image/svg+xml"];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: "Only image files are allowed (PNG, JPG, GIF, WebP, SVG)" }, 400);
    }

    // Limite de taille: 5MB
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: "File too large. Maximum size is 5MB." }, 413);
    }

    // Créer le dossier uploads/site s'il n'existe pas
    const uploadsDir = path.join(process.cwd(), "uploads", "site");
    await mkdir(uploadsDir, { recursive: true });

    // Générer un nom de fichier unique
    const fileId = crypto.randomUUID();
    const ext = file.name.split(".").pop() || "png";
    const filename = `${fileId}.${ext}`;
    const filepath = path.join(uploadsDir, filename);

    // Sauvegarder le fichier
    const buffer = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(buffer));

    log.info("Image uploaded", { filename, user: session.user.id });

    return c.json({
      success: true,
      url: `/api/site-assets/${filename}`,
      filename,
    });
  } catch (error) {
    log.error("Image upload error", error instanceof Error ? error : new Error(String(error)));
    return c.json({ error: "Upload failed" }, 500);
  }
});

// Servir les fichiers statiques du site (logos, etc.)
app.get("/api/site-assets/:filename", async (c) => {
  try {
    const filename = c.req.param("filename");

    // Protection contre path traversal
    const filepath = validateFilePath(`uploads/site/${filename}`, "uploads/site");
    if (!filepath) {
      return c.json({ error: "Invalid file path" }, 400);
    }

    const file = Bun.file(filepath);
    if (!(await file.exists())) {
      return c.json({ error: "File not found" }, 404);
    }

    // Déterminer le type MIME
    let mimeType = "image/png";
    if (filename.endsWith(".jpg") || filename.endsWith(".jpeg")) mimeType = "image/jpeg";
    else if (filename.endsWith(".gif")) mimeType = "image/gif";
    else if (filename.endsWith(".webp")) mimeType = "image/webp";
    else if (filename.endsWith(".svg")) mimeType = "image/svg+xml";

    return new Response(file, {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": file.size.toString(),
        "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "",
        "Access-Control-Allow-Credentials": "true",
        "Cache-Control": "public, max-age=86400", // Cache 24h
      },
    });
  } catch (error) {
    log.error("Site asset serve error", error instanceof Error ? error : new Error(String(error)));
    return c.json({ error: "Failed to serve file" }, 500);
  }
});

// Servir les fichiers EPUB
app.get("/api/files/:fileId", async (c) => {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const fileId = c.req.param("fileId");

    // Récupérer les infos du fichier depuis la DB
    const [doc] = await db
      .select()
      .from(document)
      .where(eq(document.id, fileId))
      .limit(1);

    if (!doc) {
      return c.json({ error: "Document not found" }, 404);
    }

    // Vérifier les permissions
    const isOwner = doc.ownerId === session.user.id;
    const isPublicBook = doc.isPublic === "true";
    let hasAccess = isOwner || isPublicBook;

    if (!hasAccess && doc.groupId) {
      // Vérifier si l'utilisateur est membre du groupe
      const [membership] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, doc.groupId),
            eq(groupMember.userId, session.user.id)
          )
        )
        .limit(1);

      if (membership) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Protection contre path traversal
    const filepath = validateFilePath(doc.filepath, "uploads");
    if (!filepath) {
      return c.json({ error: "Invalid file path" }, 400);
    }

    log.debug("Serving file", { fileId });

    // Lire le fichier
    const file = Bun.file(filepath);
    if (!(await file.exists())) {
      log.warn("File not found on disk", { fileId });
      return c.json({ error: "File not found on disk" }, 404);
    }

    // Retourner le fichier avec les bons headers
    return new Response(file, {
      headers: {
        "Content-Type": "application/epub+zip",
        "Content-Length": file.size.toString(),
        "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "",
        "Access-Control-Allow-Credentials": "true",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    log.error("File serve error", error instanceof Error ? error : new Error(String(error)), { fileId: c.req.param("fileId") });
    return c.json({ error: "Failed to serve file" }, 500);
  }
});

// Rate limiting sur l'API tRPC
app.use("/trpc/*", apiRateLimiter);

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: (_opts, context) => {
      return createContext({ context });
    },
  }),
);

// Rate limiting sur les endpoints API généraux
app.use("/api/files/*", apiRateLimiter);
app.use("/api/cover/*", apiRateLimiter);

// Healthcheck endpoint pour monitoring/Docker
app.get("/health", async (c) => {
  const startTime = Date.now();
  let dbStatus = "ok";

  try {
    // Test de connexion à la DB
    await db.execute("SELECT 1");
  } catch (err) {
    dbStatus = "error";
  }

  const memoryUsage = process.memoryUsage();

  return c.json({
    status: dbStatus === "ok" ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: dbStatus,
    memory: {
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + " MB",
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + " MB",
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + " MB",
    },
    responseTime: Date.now() - startTime + " ms",
  }, dbStatus === "ok" ? 200 : 503);
});

app.get("/", (c) => {
  return c.text("OK");
});

// Endpoint pour extraire la cover d'un EPUB
app.get("/api/cover/:fileId", async (c) => {
  try {
    const session = await auth.api.getSession({
      headers: c.req.raw.headers,
    });

    if (!session?.user) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const fileId = c.req.param("fileId");

    // Récupérer les infos du fichier depuis la DB pour avoir le vrai path
    const [doc] = await db
      .select()
      .from(document)
      .where(eq(document.id, fileId))
      .limit(1);

    if (!doc) {
      return c.json({ error: "Document not found" }, 404);
    }

    // Vérifier les permissions
    const isOwner = doc.ownerId === session.user.id;
    const isPublicBook = doc.isPublic === "true";
    let hasAccess = isOwner || isPublicBook;

    if (!hasAccess && doc.groupId) {
      const [membership] = await db
        .select()
        .from(groupMember)
        .where(
          and(
            eq(groupMember.groupId, doc.groupId),
            eq(groupMember.userId, session.user.id)
          )
        )
        .limit(1);

      if (membership) {
        hasAccess = true;
      }
    }

    if (!hasAccess) {
      return c.json({ error: "Forbidden" }, 403);
    }

    // Protection contre path traversal
    const filepath = validateFilePath(doc.filepath, "uploads");
    if (!filepath) {
      return c.json({ error: "Invalid file path" }, 400);
    }

    const file = Bun.file(filepath);
    if (!(await file.exists())) {
      return c.json({ error: "File not found" }, 404);
    }

    // Utiliser JSZip ou lire directement avec Bun
    const { Glob } = await import("bun");
    const JSZip = (await import("jszip")).default;

    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);

    // Chercher le fichier container.xml pour trouver le rootfile
    const containerFile = zip.file("META-INF/container.xml");
    if (!containerFile) {
      return c.json({ error: "Invalid EPUB: no container.xml" }, 400);
    }

    const containerXml = await containerFile.async("string");
    const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
    if (!rootfileMatch) {
      return c.json({ error: "Invalid EPUB: no rootfile" }, 400);
    }

    const opfPath = rootfileMatch[1];
    const opfFile = zip.file(opfPath);
    if (!opfFile) {
      return c.json({ error: "Invalid EPUB: OPF not found" }, 400);
    }

    const opfXml = await opfFile.async("string");
    const opfDir = opfPath.substring(0, opfPath.lastIndexOf("/") + 1);

    // Chercher la cover dans le manifest
    // Méthode 1: chercher un item avec properties="cover-image"
    let coverPath: string | null = null;
    const coverImageMatch = opfXml.match(/<item[^>]*properties="cover-image"[^>]*href="([^"]+)"/);
    if (coverImageMatch) {
      coverPath = opfDir + coverImageMatch[1];
    }

    // Méthode 2: chercher meta cover puis l'item correspondant
    if (!coverPath) {
      const metaCoverMatch = opfXml.match(/<meta[^>]*name="cover"[^>]*content="([^"]+)"/);
      if (metaCoverMatch) {
        const coverId = metaCoverMatch[1];
        const itemMatch = opfXml.match(new RegExp(`<item[^>]*id="${coverId}"[^>]*href="([^"]+)"`));
        if (itemMatch) {
          coverPath = opfDir + itemMatch[1];
        }
      }
    }

    // Méthode 3: chercher un item avec id="cover" ou id="cover-image"
    if (!coverPath) {
      const coverIdMatch = opfXml.match(/<item[^>]*id="(?:cover|cover-image|coverimage)"[^>]*href="([^"]+)"/i);
      if (coverIdMatch) {
        coverPath = opfDir + coverIdMatch[1];
      }
    }

    if (!coverPath) {
      // Retourner une image placeholder
      return c.redirect("/placeholder-cover.png");
    }

    // Normaliser le chemin (enlever les ./ et résoudre les ..)
    coverPath = coverPath.replace(/^\.\//, "");

    const coverFile = zip.file(coverPath);
    if (!coverFile) {
      return c.redirect("/placeholder-cover.png");
    }

    const coverBuffer = await coverFile.async("arraybuffer");

    // Déterminer le type MIME
    let mimeType = "image/jpeg";
    if (coverPath.endsWith(".png")) mimeType = "image/png";
    else if (coverPath.endsWith(".gif")) mimeType = "image/gif";
    else if (coverPath.endsWith(".webp")) mimeType = "image/webp";

    return new Response(coverBuffer, {
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=86400", // Cache 24h
        "Access-Control-Allow-Origin": process.env.CORS_ORIGIN || "",
        "Access-Control-Allow-Credentials": "true",
      },
    });
  } catch (error) {
    log.error("Cover extraction failed", error instanceof Error ? error : new Error(String(error)), { fileId: c.req.param("fileId") });
    return c.json({ error: "Failed to extract cover" }, 500);
  }
});

// Startup log
log.info("Server starting", { port: 3000, env: process.env.NODE_ENV || "development" });

export default {
  port: 3000,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};
