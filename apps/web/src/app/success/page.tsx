import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout_id: string }>;
}) {
  const params = await searchParams;
  const checkout_id = params.checkout_id;

  return (
    <div className="container mx-auto px-4 py-16 flex items-center justify-center min-h-screen">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <CardTitle className="text-2xl">Paiement réussi ! 🎉</CardTitle>
          <CardDescription>
            Votre abonnement Pro a été activé avec succès
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {checkout_id && (
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-xs text-gray-500 mb-1">ID de transaction</p>
              <p className="text-sm font-mono break-all">{checkout_id}</p>
            </div>
          )}
          <div className="text-sm text-gray-600">
            <p className="font-semibold mb-2">Vous avez maintenant accès à :</p>
            <ul className="list-disc list-inside space-y-1">
              <li>Toutes les fonctionnalités Pro</li>
              <li>Support prioritaire</li>
              <li>Stockage étendu</li>
              <li>API avancée</li>
            </ul>
          </div>
          <div className="pt-4 space-y-2">
            <Button asChild className="w-full">
              <Link href="/dashboard">Retour au Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
