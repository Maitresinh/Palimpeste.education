"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/utils/trpc";
import { Skeleton } from "@/components/ui/skeleton";

export default function PrivacyPage() {
    const { data: legal, isLoading } = useQuery(trpc.site.getLegalConfig.queryOptions());
    const { data: site } = useQuery(trpc.site.getPublicConfig.queryOptions());

    if (isLoading) {
        return (
            <div className="max-w-3xl mx-auto px-4 py-8">
                <Skeleton className="h-10 w-80 mb-6" />
                <Skeleton className="h-4 w-48 mb-8" />
                <div className="space-y-8">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i}>
                            <Skeleton className="h-6 w-56 mb-4" />
                            <Skeleton className="h-4 w-full mb-2" />
                            <Skeleton className="h-4 w-5/6" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-3xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold mb-6">Politique de Confidentialité</h1>

            <p className="text-muted-foreground mb-8">
                Dernière mise à jour : Janvier 2026
            </p>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">1. Responsable du traitement</h2>
                <p className="text-muted-foreground">
                    Le responsable du traitement des données est {legal?.companyName},
                    situé à {legal?.address}. Pour toute question relative à vos données personnelles,
                    vous pouvez nous contacter à{" "}
                    <a href={`mailto:${legal?.contactEmail}`} className="text-primary hover:underline">
                        {legal?.contactEmail}
                    </a>.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">2. Données collectées</h2>
                <p className="text-muted-foreground mb-4">
                    Dans le cadre de l'utilisation de {site?.siteName}, nous collectons les données suivantes :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li><strong>Données d'identification :</strong> nom, adresse email</li>
                    <li><strong>Données d'utilisation :</strong> annotations, commentaires, progression de lecture</li>
                    <li><strong>Données techniques :</strong> logs de connexion, adresse IP (à des fins de sécurité)</li>
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">3. Finalités du traitement</h2>
                <p className="text-muted-foreground mb-4">
                    Vos données sont utilisées pour :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li>Créer et gérer votre compte utilisateur</li>
                    <li>Permettre la lecture et l'annotation collaborative de documents</li>
                    <li>Sauvegarder votre progression et vos annotations</li>
                    <li>Assurer la sécurité et le bon fonctionnement du service</li>
                    <li>Vous envoyer des notifications relatives à votre compte (vérification d'email, réinitialisation de mot de passe)</li>
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">4. Base légale</h2>
                <p className="text-muted-foreground">
                    Le traitement de vos données repose sur :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
                    <li><strong>L'exécution du contrat :</strong> pour fournir le service de lecture collaborative</li>
                    <li><strong>Votre consentement :</strong> pour l'envoi de communications optionnelles</li>
                    <li><strong>L'intérêt légitime :</strong> pour la sécurité et l'amélioration du service</li>
                </ul>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">5. Durée de conservation</h2>
                <p className="text-muted-foreground">
                    Vos données sont conservées pendant toute la durée de votre utilisation du service.
                    En cas de suppression de compte, vos données personnelles seront supprimées dans un délai de 30 jours,
                    à l'exception des données que nous sommes légalement tenus de conserver.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">6. Vos droits</h2>
                <p className="text-muted-foreground mb-4">
                    Conformément au RGPD, vous disposez des droits suivants :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2">
                    <li><strong>Droit d'accès :</strong> obtenir une copie de vos données personnelles</li>
                    <li><strong>Droit de rectification :</strong> corriger des données inexactes</li>
                    <li><strong>Droit à l'effacement :</strong> demander la suppression de vos données</li>
                    <li><strong>Droit à la portabilité :</strong> recevoir vos données dans un format structuré</li>
                    <li><strong>Droit d'opposition :</strong> vous opposer à certains traitements</li>
                    <li><strong>Droit à la limitation :</strong> limiter le traitement de vos données</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                    Pour exercer ces droits, contactez-nous à{" "}
                    <a href={`mailto:${legal?.contactEmail}`} className="text-primary hover:underline">
                        {legal?.contactEmail}
                    </a>.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">7. Sécurité</h2>
                <p className="text-muted-foreground">
                    Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger
                    vos données personnelles contre tout accès non autorisé, perte ou destruction.
                    Les mots de passe sont stockés de manière sécurisée (hashés) et les communications
                    sont chiffrées via HTTPS.
                </p>
            </section>

            <section className="mb-8">
                <h2 className="text-xl font-semibold mb-4">8. Contact</h2>
                <p className="text-muted-foreground">
                    Pour toute question concernant cette politique de confidentialité ou pour exercer vos droits,
                    vous pouvez nous contacter :
                </p>
                <ul className="list-disc list-inside text-muted-foreground space-y-2 mt-4">
                    <li>Par email :{" "}
                        <a href={`mailto:${legal?.contactEmail}`} className="text-primary hover:underline">
                            {legal?.contactEmail}
                        </a>
                    </li>
                    <li>Par courrier : {legal?.address}</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                    Vous avez également le droit d'introduire une réclamation auprès de la CNIL
                    (Commission Nationale de l'Informatique et des Libertés).
                </p>
            </section>

            <div className="border-t pt-6 mt-8">
                <Link href="/" className="text-primary hover:underline">
                    ← Retour à l'accueil
                </Link>
            </div>
        </div>
    );
}
