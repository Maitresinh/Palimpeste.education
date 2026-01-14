"use client";

import Link from "next/link";
import { CheckCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EmailVerifiedPage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-green-50 to-white dark:from-green-950/20 dark:to-background">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="mx-auto mb-4 w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                    </div>
                    <CardTitle className="text-2xl text-green-600 dark:text-green-400">
                        Email vérifié !
                    </CardTitle>
                    <CardDescription className="text-base">
                        Votre compte a été activé avec succès. Vous pouvez maintenant accéder à toutes les fonctionnalités de Conpagina.
                    </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                    <Link href="/dashboard">
                        <Button className="w-full" size="lg">
                            Accéder au tableau de bord
                        </Button>
                    </Link>
                    <p className="text-sm text-muted-foreground">
                        Bienvenue sur Conpagina ! Commencez par explorer vos documents.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
