#!/usr/bin/env bun

/**
 * Script pour tester la configuration Polar
 * Usage: cd apps/server && bun run test-polar.ts
 */

import "dotenv/config";
import { Polar } from "@polar-sh/sdk";

async function testPolarConfig() {
  console.log("🧪 Test de la configuration Polar...\n");

  // Vérifier les variables d'environnement
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  const productId = process.env.POLAR_PRODUCT_ID;
  const successUrl = process.env.POLAR_SUCCESS_URL;

  console.log("📋 Variables d'environnement:");
  console.log(`  POLAR_ACCESS_TOKEN: ${accessToken ? "✅ Définie" : "❌ Manquante"}`);
  console.log(`  POLAR_PRODUCT_ID: ${productId ? `✅ ${productId}` : "❌ Manquante"}`);
  console.log(`  POLAR_SUCCESS_URL: ${successUrl ? `✅ ${successUrl}` : "❌ Manquante"}`);
  console.log();

  if (!accessToken) {
    console.error("❌ POLAR_ACCESS_TOKEN n'est pas défini dans le .env");
    console.log("\n📖 Consultez POLAR_SETUP.md pour plus d'informations");
    process.exit(1);
  }

  // Tester la connexion à l'API Polar
  const polarClient = new Polar({
    accessToken,
    server: "sandbox",
  });

  try {
    console.log("🔌 Test de connexion à l'API Polar (sandbox)...");
    
    // Essayer de lister les produits
    const products = await polarClient.products.list({
      limit: 10,
    });

    console.log(`✅ Connexion réussie! ${products.result.items?.length || 0} produit(s) trouvé(s)\n`);

    if (products.result.items && products.result.items.length > 0) {
      console.log("📦 Produits disponibles:");
      products.result.items.forEach((product: any) => {
        console.log(`  - ${product.name} (ID: ${product.id})`);
        if (product.prices && product.prices.length > 0) {
          product.prices.forEach((price: any) => {
            console.log(`    💰 ${price.priceAmount / 100} ${price.priceCurrency} / ${price.recurring_interval || "one-time"}`);
          });
        }
      });
      console.log();

      // Vérifier si le productId configuré existe
      if (productId) {
        const productExists = products.result.items.some((p: any) => p.id === productId);
        if (productExists) {
          console.log(`✅ Le produit configuré (${productId}) existe`);
        } else {
          console.log(`⚠️  Le produit configuré (${productId}) n'a pas été trouvé`);
          console.log(`   Utilisez un des IDs ci-dessus dans votre .env`);
        }
      } else {
        console.log("⚠️  POLAR_PRODUCT_ID n'est pas défini");
        console.log("   Ajoutez un des IDs ci-dessus dans votre .env");
      }
    } else {
      console.log("⚠️  Aucun produit trouvé");
      console.log("   Créez un produit dans votre dashboard Polar");
      console.log("   https://polar.sh/dashboard");
    }

    console.log("\n✨ Configuration Polar OK!");
    console.log("\n🚀 Vous pouvez maintenant tester le système de checkout:");
    console.log("   1. Lancez les serveurs: bun run dev");
    console.log("   2. Créez un compte utilisateur");
    console.log("   3. Cliquez sur 'Passer à Pro'");
    console.log("   4. Utilisez la carte de test: 4242 4242 4242 4242");

  } catch (error: any) {
    console.error("\n❌ Erreur lors du test de l'API Polar:");
    console.error(`   ${error.message}`);
    
    if (error.statusCode === 401) {
      console.error("\n🔑 Le token d'accès n'est pas valide ou n'a pas les bonnes permissions");
      console.error("   1. Vérifiez que le token est correct dans le .env");
      console.error("   2. Assurez-vous que le token a les permissions nécessaires:");
      console.error("      - customers:read, customers:write");
      console.error("      - products:read");
      console.error("      - checkouts:read, checkouts:write");
      console.error("      - subscriptions:read");
    }
    
    console.log("\n📖 Consultez POLAR_SETUP.md pour plus d'informations");
    process.exit(1);
  }
}

testPolarConfig().catch((error) => {
  console.error("Erreur inattendue:", error);
  process.exit(1);
});



