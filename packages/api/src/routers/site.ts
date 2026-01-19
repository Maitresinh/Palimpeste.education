import { z } from "zod";
import {
    db,
    systemConfig,
    sql,
} from "@lectio/db";
import { publicProcedure, adminProcedure, router } from "../index";

// Clés de configuration du site
export const SITE_CONFIG_KEYS = {
    SITE_NAME: "site_name",
    SITE_LOGO: "site_logo",
    SITE_LOGO_INVERT: "site_logo_invert",
    SITE_LOGO_ZOOM: "site_logo_zoom",
    SITE_TAGLINE: "site_tagline",
    SITE_SUBTITLE: "site_subtitle",
    CTA_TITLE: "cta_title",
    CTA_DESCRIPTION: "cta_description",
} as const;

// Valeurs par défaut
const DEFAULT_CONFIG: Record<string, string> = {
    [SITE_CONFIG_KEYS.SITE_NAME]: "Conpagina",
    [SITE_CONFIG_KEYS.SITE_LOGO]: "/logo_conpagina.png",
    [SITE_CONFIG_KEYS.SITE_LOGO_INVERT]: "true",
    [SITE_CONFIG_KEYS.SITE_LOGO_ZOOM]: "100",
    [SITE_CONFIG_KEYS.SITE_TAGLINE]: "Plateforme de lecture collaborative.",
    [SITE_CONFIG_KEYS.SITE_SUBTITLE]: "Lisez, annotez et discutez ensemble.",
    [SITE_CONFIG_KEYS.CTA_TITLE]: "Prêt à commencer ?",
    [SITE_CONFIG_KEYS.CTA_DESCRIPTION]: "Créez votre compte gratuitement et commencez à lire.",
};

export const siteRouter = router({
    // Récupérer la configuration publique du site
    getPublicConfig: publicProcedure.query(async () => {
        const configs = await db
            .select()
            .from(systemConfig)
            .where(
                sql`${systemConfig.key} IN (${sql.join(
                    Object.values(SITE_CONFIG_KEYS).map((k) => sql`${k}`),
                    sql`, `
                )})`
            );

        // Construire l'objet de configuration avec les valeurs par défaut
        const configMap: Record<string, string> = { ...DEFAULT_CONFIG };

        for (const config of configs) {
            configMap[config.key] = config.value;
        }

        return {
            siteName: configMap[SITE_CONFIG_KEYS.SITE_NAME],
            siteLogo: configMap[SITE_CONFIG_KEYS.SITE_LOGO],
            siteLogoInvert: configMap[SITE_CONFIG_KEYS.SITE_LOGO_INVERT] === "true",
            siteLogoZoom: parseInt(configMap[SITE_CONFIG_KEYS.SITE_LOGO_ZOOM] ?? "100", 10),
            siteTagline: configMap[SITE_CONFIG_KEYS.SITE_TAGLINE],
            siteSubtitle: configMap[SITE_CONFIG_KEYS.SITE_SUBTITLE],
            ctaTitle: configMap[SITE_CONFIG_KEYS.CTA_TITLE],
            ctaDescription: configMap[SITE_CONFIG_KEYS.CTA_DESCRIPTION],
        };
    }),

    // Mettre à jour la configuration du site (admin only)
    updateConfig: adminProcedure
        .input(
            z.object({
                siteName: z.string().min(1).max(100).optional(),
                siteLogo: z.string().optional(),
                siteLogoInvert: z.boolean().optional(),
                siteLogoZoom: z.number().min(50).max(200).optional(),
                siteTagline: z.string().max(200).optional(),
                siteSubtitle: z.string().max(200).optional(),
                ctaTitle: z.string().max(100).optional(),
                ctaDescription: z.string().max(300).optional(),
            })
        )
        .mutation(async ({ input }) => {
            const updates: { key: string; value: string }[] = [];

            if (input.siteName !== undefined) {
                updates.push({ key: SITE_CONFIG_KEYS.SITE_NAME, value: input.siteName });
            }
            if (input.siteLogo !== undefined) {
                updates.push({ key: SITE_CONFIG_KEYS.SITE_LOGO, value: input.siteLogo });
            }
            if (input.siteLogoInvert !== undefined) {
                updates.push({ key: SITE_CONFIG_KEYS.SITE_LOGO_INVERT, value: input.siteLogoInvert.toString() });
            }
            if (input.siteLogoZoom !== undefined) {
                updates.push({ key: SITE_CONFIG_KEYS.SITE_LOGO_ZOOM, value: input.siteLogoZoom.toString() });
            }
            if (input.siteTagline !== undefined) {
                updates.push({ key: SITE_CONFIG_KEYS.SITE_TAGLINE, value: input.siteTagline });
            }
            if (input.siteSubtitle !== undefined) {
                updates.push({ key: SITE_CONFIG_KEYS.SITE_SUBTITLE, value: input.siteSubtitle });
            }
            if (input.ctaTitle !== undefined) {
                updates.push({ key: SITE_CONFIG_KEYS.CTA_TITLE, value: input.ctaTitle });
            }
            if (input.ctaDescription !== undefined) {
                updates.push({ key: SITE_CONFIG_KEYS.CTA_DESCRIPTION, value: input.ctaDescription });
            }

            // Upsert chaque configuration
            for (const update of updates) {
                await db
                    .insert(systemConfig)
                    .values({
                        key: update.key,
                        value: update.value,
                    })
                    .onConflictDoUpdate({
                        target: systemConfig.key,
                        set: {
                            value: update.value,
                        },
                    });
            }

            return { success: true };
        }),

    // Récupérer toutes les configurations (admin only) - pour le formulaire d'édition
    getAllConfigs: adminProcedure.query(async () => {
        const configs = await db
            .select()
            .from(systemConfig)
            .where(
                sql`${systemConfig.key} IN (${sql.join(
                    Object.values(SITE_CONFIG_KEYS).map((k) => sql`${k}`),
                    sql`, `
                )})`
            );

        // Construire l'objet de configuration avec les valeurs par défaut
        const configMap: Record<string, string> = { ...DEFAULT_CONFIG };

        for (const config of configs) {
            configMap[config.key] = config.value;
        }

        return {
            siteName: configMap[SITE_CONFIG_KEYS.SITE_NAME],
            siteLogo: configMap[SITE_CONFIG_KEYS.SITE_LOGO],
            siteLogoInvert: configMap[SITE_CONFIG_KEYS.SITE_LOGO_INVERT] === "true",
            siteLogoZoom: parseInt(configMap[SITE_CONFIG_KEYS.SITE_LOGO_ZOOM] ?? "100", 10),
            siteTagline: configMap[SITE_CONFIG_KEYS.SITE_TAGLINE],
            siteSubtitle: configMap[SITE_CONFIG_KEYS.SITE_SUBTITLE],
            ctaTitle: configMap[SITE_CONFIG_KEYS.CTA_TITLE],
            ctaDescription: configMap[SITE_CONFIG_KEYS.CTA_DESCRIPTION],
        };
    }),
});
