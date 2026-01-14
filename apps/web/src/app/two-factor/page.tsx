"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/loader";

function TwoFactorForm() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm({
        defaultValues: {
            code: "",
        },
        onSubmit: async ({ value }) => {
            setIsLoading(true);
            try {
                await authClient.twoFactor.verifyOtp({
                    code: value.code,
                });
                toast.success("Vérification réussie");
                router.push("/dashboard");
            } catch (error: any) {
                toast.error(error.message || "Code invalide");
            } finally {
                setIsLoading(false);
            }
        },
        validators: {
            onSubmit: z.object({
                code: z.string().length(6, "Le code doit contenir 6 chiffres"),
            }),
        },
    });

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <CardTitle>Vérification en deux étapes</CardTitle>
                    <CardDescription>
                        Un code de vérification a été envoyé à votre adresse email. Entrez-le ci-dessous.
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
                        <form.Field name="code">
                            {(field) => (
                                <div className="space-y-2">
                                    <Label htmlFor={field.name}>Code de vérification</Label>
                                    <Input
                                        id={field.name}
                                        name={field.name}
                                        type="text"
                                        inputMode="numeric"
                                        maxLength={6}
                                        value={field.state.value}
                                        onBlur={field.handleBlur}
                                        onChange={(e) => field.handleChange(e.target.value.replace(/\D/g, ""))}
                                        placeholder="000000"
                                        className="text-center text-2xl tracking-widest"
                                    />
                                    {field.state.meta.errors.map((error) => (
                                        <p key={error?.message} className="text-red-500 text-sm text-center">
                                            {error?.message}
                                        </p>
                                    ))}
                                </div>
                            )}
                        </form.Field>

                        <Button
                            type="submit"
                            className="w-full"
                            disabled={isLoading}
                        >
                            {isLoading ? "Vérification..." : "Vérifier"}
                        </Button>

                        <p className="text-center text-sm text-muted-foreground">
                            Vous n'avez pas reçu le code ?{" "}
                            <button
                                type="button"
                                className="text-primary hover:underline"
                                onClick={async () => {
                                    try {
                                        await authClient.twoFactor.sendOtp();
                                        toast.success("Nouveau code envoyé");
                                    } catch (error: any) {
                                        toast.error("Erreur lors de l'envoi du code");
                                    }
                                }}
                            >
                                Renvoyer
                            </button>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}

export default function TwoFactorPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader /></div>}>
            <TwoFactorForm />
        </Suspense>
    );
}
