"use client";

import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";

export interface FeatureText {
    title: string;
    description: string;
}

export interface FeatureTexts {
    epub: FeatureText;
    annotations: FeatureText;
    discussions: FeatureText;
    groups: FeatureText;
    progress: FeatureText;
    customization: FeatureText;
}

export interface SiteConfig {
    siteName: string;
    siteLogo: string;
    siteLogoInvert: boolean;
    siteLogoZoom: number;
    siteTagline: string;
    siteSubtitle: string;
    ctaTitle: string;
    ctaDescription: string;
    homepageFeatures: string[];
    featureTexts: FeatureTexts;
}

// Toutes les features disponibles par défaut
const ALL_FEATURES = ["epub", "annotations", "discussions", "groups", "progress", "customization"];

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
    homepageFeatures: ALL_FEATURES,
    featureTexts: {
        epub: {
            title: "Livres EPUB",
            description: "Importez et lisez vos livres numériques directement dans le navigateur.",
        },
        annotations: {
            title: "Annotations",
            description: "Surlignez les passages importants et ajoutez vos commentaires.",
        },
        discussions: {
            title: "Discussions",
            description: "Créez des threads de discussion sur n'importe quelle annotation.",
        },
        groups: {
            title: "Classes & Clubs",
            description: "Organisez vos élèves en groupes pour la lecture collaborative.",
        },
        progress: {
            title: "Progression",
            description: "Suivez automatiquement votre avancement dans chaque livre.",
        },
        customization: {
            title: "Personnalisation",
            description: "Thèmes, polices et taille de texte adaptés à votre confort.",
        },
    },
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
