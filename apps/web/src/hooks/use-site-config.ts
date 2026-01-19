"use client";

import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export interface SiteConfig {
    siteName: string;
    siteLogo: string;
    siteLogoInvert: boolean;
    siteLogoZoom: number;
    siteTagline: string;
    siteSubtitle: string;
    ctaTitle: string;
    ctaDescription: string;
}

// Valeurs par défaut utilisées pendant le chargement
const DEFAULT_CONFIG: SiteConfig = {
    siteName: "Conpagina",
    siteLogo: "/logo_conpagina.png",
    siteLogoInvert: true,
    siteLogoZoom: 100,
    siteTagline: "Plateforme de lecture collaborative.",
    siteSubtitle: "Lisez, annotez et discutez ensemble.",
    ctaTitle: "Prêt à commencer ?",
    ctaDescription: "Créez votre compte gratuitement et commencez à lire.",
};

export function useSiteConfig() {
    const query = useQuery({
        ...trpc.site.getPublicConfig.queryOptions(),
        staleTime: 1000 * 60 * 5, // 5 minutes - la config ne change pas souvent
        gcTime: 1000 * 60 * 30, // 30 minutes
    });

    return {
        ...query,
        // Retourner les valeurs par défaut pendant le chargement
        config: query.data ?? DEFAULT_CONFIG,
    };
}
