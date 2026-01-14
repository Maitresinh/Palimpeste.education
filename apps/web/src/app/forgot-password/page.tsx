"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
    const [submitted, setSubmitted] = useState(false);

    const form = useForm({
        defaultValues: {
            email: "",
        },
        onSubmit: async ({ value }) => {
            try {
                const { data, error } = await authClient.requestPasswordReset({
                    email: value.email,
                    redirectTo: `${window.location.origin}/reset-password`,
                });

                if (error) {
                    throw new Error(error.message || "Une erreur est survenue");
                }
                setSubmitted(true);
            } catch (error: any) {
                toast.error(error.message || "Une erreur est survenue");
            }
        },
        validators: {
            onSubmit: z.object({
                email: z.string().email("Email invalide"),
            }),
        },
    });

    if (submitted) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Email envoyé !</CardTitle>
                        <CardDescription>
                            Si un compte existe avec cette adresse email, vous recevrez un lien pour réinitialiser votre mot de passe.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center">
                        <Link href="/login">
                            <Button variant="outline">Retour à la connexion</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Mot de passe oublié</CardTitle>
                    <CardDescription>
                        Entrez votre adresse email pour recevoir un lien de réinitialisation.
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
                        <form.Field name="email">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>Email</Label>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="email"
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value)}
                                        placeholder="votre@email.com"
                                    />
                                    {field.state.meta.errors.map((error) => (
                                        <p key={error?.message} className="text-red-500 text-sm">
                                            {error?.message}
                                        </p>
                                    ))}
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
                                    {state.isSubmitting ? "Envoi..." : "Envoyer le lien"}
                                </Button>
                            )}
                        </form.Subscribe>

                        <div className="text-center">
                            <Link href="/login" className="text-sm text-muted-foreground hover:underline">
                                Retour à la connexion
                            </Link>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
