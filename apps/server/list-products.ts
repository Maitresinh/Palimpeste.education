#!/usr/bin/env bun

/**
 * Script pour lister tous les produits et leurs prix
 */

import "dotenv/config";
import { Polar } from "@polar-sh/sdk";

const accessToken = process.env.POLAR_ACCESS_TOKEN;

if (!accessToken) {
  console.error("❌ POLAR_ACCESS_TOKEN manquant");
  process.exit(1);
}

const polarClient = new Polar({
  accessToken,
  server: "sandbox",
});

console.log("📦 Liste complète des produits et prix Polar\n");

const products = await polarClient.products.list({ limit: 50 });

if (!products.result.items || products.result.items.length === 0) {
  console.log("Aucun produit trouvé");
  process.exit(0);
}

for (const product of products.result.items) {
  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`📦 ${product.name}`);
  console.log(`   ID: ${product.id}`);
  console.log(`   Description: ${product.description || "N/A"}`);
  
  if (product.prices && product.prices.length > 0) {
    console.log(`\n   💰 Prix disponibles:`);
    product.prices.forEach((price: any, idx: number) => {
      const amount = price.priceAmount / 100;
      const currency = price.priceCurrency;
      const type = price.type;
      const recurring = price.recurring_interval;
      
      console.log(`      ${idx + 1}. ${amount} ${currency} - ${type}`);
      if (recurring) {
        console.log(`         🔄 Récurrent: ${recurring}`);
        console.log(`         ✅ Compatible avec l'abonnement Pro`);
      } else {
        console.log(`         ⚠️  Paiement unique (incompatible avec abonnement)`);
      }
      console.log(`         Price ID: ${price.id}`);
    });
  } else {
    console.log(`   ⚠️  Aucun prix configuré`);
  }
}

console.log(`\n═══════════════════════════════════════════════════\n`);
console.log("💡 Pour configurer votre .env :\n");
console.log("   Copiez l'ID du produit avec un prix RÉCURRENT");
console.log("   et ajoutez dans apps/server/.env :");
console.log("");
console.log("   POLAR_PRODUCT_ID=votre_product_id_ici");
console.log("");



