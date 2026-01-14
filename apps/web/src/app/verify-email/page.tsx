"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Loader from "@/components/loader";

function VerifyEmailContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const token = searchParams.get("token");
    const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!token) {
            setStatus("error");
            setError("Token manquant");
            return;
        }

        const verifyEmail = async () => {
            try {
                await authClient.verifyEmail({
                    query: { token },
                });
                setStatus("success");
                setTimeout(() => router.push("/dashboard"), 3000);
            } catch (err: any) {
                setStatus("error");
                setError(err.message || "Une erreur est survenue");
            }
        };

        verifyEmail();
    }, [token, router]);

    if (status === "loading") {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle>Vérification en cours...</CardTitle>
                    </CardHeader>
                    <CardContent className="flex justify-center">
                        <Loader />
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (status === "error") {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <CardTitle className="text-red-600">Erreur de vérification</CardTitle>
                        <CardDescription>
                            {error || "Le lien de vérification est invalide ou a expiré."}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <p className="text-sm text-muted-foreground">
                            Si vous avez besoin d'un nouveau lien de vérification, connectez-vous et un nouvel email vous sera envoyé.
                        </p>
                        <Link href="/login">
                            <Button>Aller à la connexion</Button>
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
                    <CardTitle className="text-green-600">Email vérifié !</CardTitle>
                    <CardDescription>
                        Votre email a été vérifié avec succès. Redirection vers le tableau de bord...
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center">
                    <Link href="/dashboard">
                        <Button>Aller au tableau de bord</Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader /></div>}>
            <VerifyEmailContent />
        </Suspense>
    );
}
