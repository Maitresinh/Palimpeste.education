"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ResetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");
    const [success, setSuccess] = useState(false);

    const form = useForm({
        defaultValues: {
            password: "",
            confirmPassword: "",
        },
        onSubmit: async ({ value }) => {
            if (!token) {
                toast.error("Token manquant");
                return;
            }
            if (value.password !== value.confirmPassword) {
                toast.error("Les mots de passe ne correspondent pas");
                return;
            }
            try {
                await authClient.resetPassword({
                    newPassword: value.password,
                    token,
                });
                setSuccess(true);
                toast.success("Mot de passe réinitialisé avec succès");
                setTimeout(() => router.push("/login"), 2000);
            } catch (error: any) {
                toast.error(error.message || "Une erreur est survenue");
            }
        },
        validators: {
            onSubmit: z.object({
                password: z.string()
                    .min(12, "12 caractères minimum")
                    .regex(/[A-Z]/, "Une majuscule requise")
                    .regex(/[a-z]/, "Une minuscule requise")
                    .regex(/[0-9]/, "Un chiffre requis"),
                confirmPassword: z.string(),
            }),
        },
    });

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-red-600">Lien invalide</CardTitle>
                        <CardDescription>
                            Le lien de réinitialisation est invalide ou a expiré.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Link href="/forgot-password">
                            <Button>Demander un nouveau lien</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-green-600">Mot de passe réinitialisé !</CardTitle>
                        <CardDescription>
                            Redirection vers la page de connexion...
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Nouveau mot de passe</CardTitle>
                    <CardDescription>
                        Choisissez un nouveau mot de passe sécurisé.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            form.handleSubmit();
                        }}
                        className="space-y-4"
                    >
                        <form.Field name="password">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>Nouveau mot de passe</Label>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="password"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                    {field.state.meta.errors.map((error) => (
                                        <p key={error?.message} className="text-red-500 text-sm">
                                            {error?.message}
                                        </p>
                                    ))}
                                    <p className="text-xs text-muted-foreground">
                                        12 caractères minimum, avec majuscule, minuscule et chiffre
                                    </p>
                                </div>
                            )}
                        </form.Field>

                        <form.Field name="confirmPassword">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>Confirmer le mot de passe</Label>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="password"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                    />
                                </div>
                            )}
                        </form.Field>

                        <form.Subscribe>
                            {(state) => (
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={!state.canSubmit || state.isSubmitting}
                                >
                                    {state.isSubmitting ? "Réinitialisation..." : "Réinitialiser"}
                                </Button>
                            )}
                        </form.Subscribe>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement...</div>}>
            <ResetPasswordForm />
        </Suspense>
    );
}
