/**
 * Script pour créer un compte administrateur
 * 
 * Usage: bun run create-admin.ts
 */

import { db, user, eq } from "@lectio/db";

async function createAdmin() {
  console.log("🔐 Création d'un compte administrateur...\n");

  const adminEmail = "admin@lectio.local";
  const adminPassword = "admin123456"; // À changer en production !
  const adminName = "Administrateur";

  try {
    // Vérifier si l'admin existe déjà
    const [existingAdmin] = await db
      .select()
      .from(user)
      .where(eq(user.email, adminEmail))
      .limit(1);

    if (existingAdmin) {
      console.log("⚠️  Un compte admin existe déjà avec cet email.");
      console.log(`   Email: ${existingAdmin.email}`);
      console.log(`   Rôle: ${existingAdmin.role}`);

      if (existingAdmin.role !== "ADMIN") {
        console.log("\n🔄 Mise à jour du rôle vers ADMIN...");
        await db
          .update(user)
          .set({ role: "ADMIN" })
          .where(eq(user.id, existingAdmin.id));
        console.log("✅ Rôle mis à jour vers ADMIN");
      }

      return;
    }

    // Créer le compte admin
    const [newAdmin] = await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        name: adminName,
        email: adminEmail,
        emailVerified: true,
        role: "ADMIN",
      })
      .returning();

    if (!newAdmin) {
      throw new Error("Erreur lors de la création de l'admin");
    }

    console.log("✅ Compte administrateur créé avec succès!\n");
    console.log("📧 Email:", adminEmail);
    console.log("🔑 Mot de passe:", adminPassword);
    console.log("👤 Nom:", adminName);
    console.log("🎭 Rôle:", newAdmin.role);
    console.log("\n⚠️  IMPORTANT: Changez le mot de passe après la première connexion!");
    console.log("\n💡 Note: Pour vous connecter, utilisez le formulaire de connexion");
    console.log("   avec ces identifiants. Le mot de passe sera haché automatiquement");
    console.log("   lors de la première connexion via Better Auth.");

  } catch (error) {
    console.error("❌ Erreur lors de la création de l'admin:", error);
    process.exit(1);
  }

  process.exit(0);
}

createAdmin();

