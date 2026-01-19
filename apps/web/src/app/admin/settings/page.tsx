"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Settings, Upload, Save, Loader2, Image as ImageIcon, RefreshCw, ZoomIn, Sun, Moon } from "lucide-react";
import { toast } from "sonner";

import { trpc } from "@/utils/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

export default function AdminSettingsPage() {
    const queryClient = useQueryClient();
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Récupérer la configuration actuelle
    const { data: config, isLoading } = useQuery(trpc.site.getAllConfigs.queryOptions());

    // État du formulaire
    const [formData, setFormData] = useState({
        siteName: "",
        siteLogo: "",
        siteLogoInvert: true,
        siteLogoZoom: 100,
        siteTagline: "",
        siteSubtitle: "",
        ctaTitle: "",
        ctaDescription: "",
    });

    // État pour le preview du logo uploadé
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [uploadingLogo, setUploadingLogo] = useState(false);

    // Charger les données dans le formulaire quand elles arrivent
    useEffect(() => {
        if (config) {
            setFormData({
                siteName: config.siteName,
                siteLogo: config.siteLogo,
                siteLogoInvert: config.siteLogoInvert,
                siteLogoZoom: config.siteLogoZoom,
                siteTagline: config.siteTagline,
                siteSubtitle: config.siteSubtitle,
                ctaTitle: config.ctaTitle,
                ctaDescription: config.ctaDescription,
            });
        }
    }, [config]);

    // Mutation pour sauvegarder
    const updateMutation = useMutation({
        ...trpc.site.updateConfig.mutationOptions(),
        onSuccess: () => {
            // Invalider le cache pour forcer le rechargement
            queryClient.invalidateQueries({ queryKey: ["site"] });
            toast.success("Paramètres enregistrés", {
                description: "Les modifications ont été appliquées avec succès.",
            });
        },
        onError: (error) => {
            toast.error("Erreur", {
                description: error.message || "Impossible d'enregistrer les paramètres.",
            });
        },
    });

    const handleInputChange = (field: keyof typeof formData, value: string | boolean | number) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await updateMutation.mutateAsync(formData);
    };

    // Gestion de l'upload de logo
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Preview local immédiat
        const reader = new FileReader();
        reader.onload = (e) => {
            setLogoPreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);

        setUploadingLogo(true);

        try {
            // Upload le fichier vers l'API
            const formDataUpload = new FormData();
            formDataUpload.append("file", file);

            const serverUrl = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
            const response = await fetch(`${serverUrl}/api/upload/image`, {
                method: "POST",
                body: formDataUpload,
                credentials: "include",
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Upload failed");
            }

            const { url } = await response.json();

            // Mettre à jour le champ avec l'URL du fichier uploadé (URL complète du serveur)
            handleInputChange("siteLogo", `${serverUrl}${url}`);
            setLogoPreview(null);
            toast.success("Logo uploadé", {
                description: "Le logo a été uploadé avec succès.",
            });
        } catch (error) {
            console.error("Error uploading logo:", error);
            setLogoPreview(null);
            toast.error("Erreur d'upload", {
                description: error instanceof Error ? error.message : "Erreur lors de l'upload du logo",
            });
        } finally {
            setUploadingLogo(false);
        }
    };

    // Calculer la taille du logo preview
    const logoScale = formData.siteLogoZoom / 100;
    const logoSrc = logoPreview || formData.siteLogo;

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold">Paramètres du site</h1>
                    <p className="text-muted-foreground">
                        Personnalisez l'apparence et les textes de votre plateforme
                    </p>
                </div>
                <div className="grid gap-6 md:grid-cols-2">
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <Skeleton className="h-6 w-32" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Skeleton className="h-20 w-full" />
                            <Skeleton className="h-20 w-full" />
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Settings className="h-8 w-8" />
                    Paramètres du site
                </h1>
                <p className="text-muted-foreground">
                    Personnalisez l'apparence et les textes de votre plateforme
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Identité du site */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Identité du site</CardTitle>
                        <CardDescription>
                            Nom et logo affichés sur toutes les pages
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="siteName">Nom du site</Label>
                            <Input
                                id="siteName"
                                value={formData.siteName}
                                onChange={(e) => handleInputChange("siteName", e.target.value)}
                                placeholder="Conpagina"
                            />
                        </div>

                        <div className="space-y-4">
                            <Label>Logo</Label>

                            {/* Aperçu du logo avec les deux thèmes */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Fond clair */}
                                <div className="rounded-lg border bg-white p-4 flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Sun className="h-3 w-3" />
                                        <span>Mode clair</span>
                                    </div>
                                    <div
                                        className="h-20 flex items-center justify-center overflow-hidden"
                                        style={{ transform: `scale(${logoScale})` }}
                                    >
                                        {uploadingLogo ? (
                                            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                        ) : logoSrc ? (
                                            <img
                                                src={logoSrc}
                                                alt="Logo preview (light)"
                                                className="max-h-full max-w-full object-contain"
                                            />
                                        ) : (
                                            <ImageIcon className="h-8 w-8 text-gray-400" />
                                        )}
                                    </div>
                                </div>

                                {/* Fond sombre */}
                                <div className="rounded-lg border bg-gray-900 p-4 flex flex-col items-center gap-2">
                                    <div className="flex items-center gap-1 text-xs text-gray-400">
                                        <Moon className="h-3 w-3" />
                                        <span>Mode sombre</span>
                                    </div>
                                    <div
                                        className="h-20 flex items-center justify-center overflow-hidden"
                                        style={{ transform: `scale(${logoScale})` }}
                                    >
                                        {uploadingLogo ? (
                                            <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                        ) : logoSrc ? (
                                            <img
                                                src={logoSrc}
                                                alt="Logo preview (dark)"
                                                className={`max-h-full max-w-full object-contain ${formData.siteLogoInvert ? "invert" : ""}`}
                                            />
                                        ) : (
                                            <ImageIcon className="h-8 w-8 text-gray-600" />
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* URL du logo + Upload */}
                            <div className="flex gap-2">
                                <Input
                                    id="siteLogo"
                                    value={formData.siteLogo}
                                    onChange={(e) => handleInputChange("siteLogo", e.target.value)}
                                    placeholder="/logo.png ou URL externe"
                                    className="flex-1"
                                />
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="icon"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingLogo}
                                >
                                    {uploadingLogo ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Upload className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />

                            {/* Option d'inversion */}
                            <div className="flex items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                    <Label htmlFor="logoInvert" className="text-sm font-medium cursor-pointer">
                                        Inverser les couleurs en mode sombre
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Active le filtre invert() sur le logo en mode sombre (idéal pour les logos noirs)
                                    </p>
                                </div>
                                <Switch
                                    id="logoInvert"
                                    checked={formData.siteLogoInvert}
                                    onCheckedChange={(checked) => handleInputChange("siteLogoInvert", checked)}
                                />
                            </div>

                            {/* Taille / Zoom */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="flex items-center gap-2">
                                        <ZoomIn className="h-4 w-4" />
                                        Taille du logo
                                    </Label>
                                    <span className="text-sm text-muted-foreground">{formData.siteLogoZoom}%</span>
                                </div>
                                <Slider
                                    value={[formData.siteLogoZoom]}
                                    onValueChange={([value]) => handleInputChange("siteLogoZoom", value)}
                                    min={50}
                                    max={200}
                                    step={5}
                                    className="w-full"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Ajustez la taille d'affichage du logo (50% - 200%)
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Textes de la page d'accueil */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Page d'accueil</CardTitle>
                        <CardDescription>
                            Textes affichés aux visiteurs non connectés
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="siteTagline">Slogan principal</Label>
                            <Input
                                id="siteTagline"
                                value={formData.siteTagline}
                                onChange={(e) => handleInputChange("siteTagline", e.target.value)}
                                placeholder="Plateforme de lecture collaborative."
                            />
                            <p className="text-xs text-muted-foreground">
                                Première ligne sous le logo
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="siteSubtitle">Sous-titre</Label>
                            <Input
                                id="siteSubtitle"
                                value={formData.siteSubtitle}
                                onChange={(e) => handleInputChange("siteSubtitle", e.target.value)}
                                placeholder="Lisez, annotez et discutez ensemble."
                            />
                            <p className="text-xs text-muted-foreground">
                                Deuxième ligne sous le logo
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Section CTA */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Appel à l'action</CardTitle>
                        <CardDescription>
                            Section en bas de la page d'accueil avant le bouton d'inscription
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="ctaTitle">Titre</Label>
                            <Input
                                id="ctaTitle"
                                value={formData.ctaTitle}
                                onChange={(e) => handleInputChange("ctaTitle", e.target.value)}
                                placeholder="Prêt à commencer ?"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ctaDescription">Description</Label>
                            <Textarea
                                id="ctaDescription"
                                value={formData.ctaDescription}
                                onChange={(e) => handleInputChange("ctaDescription", e.target.value)}
                                placeholder="Créez votre compte gratuitement et commencez à lire."
                                rows={2}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Boutons d'action */}
                <div className="flex items-center justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            if (config) {
                                setFormData({
                                    siteName: config.siteName,
                                    siteLogo: config.siteLogo,
                                    siteLogoInvert: config.siteLogoInvert,
                                    siteLogoZoom: config.siteLogoZoom,
                                    siteTagline: config.siteTagline,
                                    siteSubtitle: config.siteSubtitle,
                                    ctaTitle: config.ctaTitle,
                                    ctaDescription: config.ctaDescription,
                                });
                                toast.info("Formulaire réinitialisé");
                            }
                        }}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Réinitialiser
                    </Button>
                    <Button type="submit" disabled={updateMutation.isPending}>
                        {updateMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Enregistrement...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Enregistrer
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
