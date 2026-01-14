#!/usr/bin/env bun

/**
 * Script interactif pour configurer Polar
 * Usage: cd apps/server && bun run setup-polar.ts
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

console.log("🚀 Configuration de Polar pour Pendant\n");
console.log("Ce script va vous guider pour configurer Polar.\n");

const envPath = join(process.cwd(), ".env");

// Lire le fichier .env actuel
let envContent = "";
try {
  envContent = readFileSync(envPath, "utf-8");
} catch {
  console.log("⚠️  Aucun fichier .env trouvé, création d'un nouveau...\n");
}

console.log("📋 Instructions :\n");
console.log("1. Allez sur https://polar.sh et créez un compte (ou connectez-vous)");
console.log("2. Allez dans Settings → Access Tokens");
console.log("3. Créez un nouveau token avec TOUTES les permissions");
console.log("4. Copiez le token (il commence par 'polar_sandbox_...')\n");

console.log("5. Créez un produit :");
console.log("   - Allez dans Products → Create Product");
console.log("   - Name: 'Pro Plan'");
console.log("   - Ajoutez un prix récurrent (ex: 9.99€/mois)");
console.log("   - Copiez le Product ID (il commence par 'prod_...')\n");

console.log("════════════════════════════════════════════════════════════\n");

// Prompt pour le token
console.log("Entrez votre POLAR_ACCESS_TOKEN (polar_sandbox_...):");
console.log("(Ou appuyez sur Entrée pour ignorer - la création de compte fonctionnera mais pas le checkout)\n");

const stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");

let input = "";
let step = 0;
const values: string[] = [];

const prompts = [
  "POLAR_ACCESS_TOKEN (polar_sandbox_...)",
  "POLAR_PRODUCT_ID (prod_...)",
];

process.stdout.write(`\n${prompts[0]}: `);

stdin.on("data", (key: string) => {
  // Ctrl+C
  if (key === "\u0003") {
    process.exit(0);
  }

  // Enter
  if (key === "\r" || key === "\n") {
    values.push(input.trim());
    input = "";
    step++;

    if (step < prompts.length) {
      process.stdout.write(`\n${prompts[step]}: `);
    } else {
      stdin.pause();
      finishSetup();
    }
    return;
  }

  // Backspace
  if (key === "\u007F") {
    if (input.length > 0) {
      input = input.slice(0, -1);
      process.stdout.write("\b \b");
    }
    return;
  }

  // Normal character
  if (key >= " " && key <= "~") {
    input += key;
    process.stdout.write(key);
  }
});

function finishSetup() {
  const [accessToken, productId] = values;

  console.log("\n\n════════════════════════════════════════════════════════════\n");
  console.log("📝 Configuration :\n");
  console.log(`POLAR_ACCESS_TOKEN: ${accessToken ? "✅ Défini" : "⚠️  Vide (création de compte uniquement)"}`);
  console.log(`POLAR_PRODUCT_ID: ${productId ? `✅ ${productId}` : "⚠️  Vide"}`);

  // Mettre à jour le fichier .env
  const lines = envContent.split("\n");
  const newLines: string[] = [];
  const seenKeys = new Set<string>();

  for (const line of lines) {
    if (line.trim().startsWith("POLAR_ACCESS_TOKEN=")) {
      newLines.push(`POLAR_ACCESS_TOKEN=${accessToken}`);
      seenKeys.add("POLAR_ACCESS_TOKEN");
    } else if (line.trim().startsWith("POLAR_PRODUCT_ID=")) {
      newLines.push(`POLAR_PRODUCT_ID=${productId}`);
      seenKeys.add("POLAR_PRODUCT_ID");
    } else if (line.trim().startsWith("POLAR_SUCCESS_URL=")) {
      newLines.push(line);
      seenKeys.add("POLAR_SUCCESS_URL");
    } else {
      newLines.push(line);
    }
  }

  // Ajouter les variables manquantes
  if (!seenKeys.has("POLAR_ACCESS_TOKEN")) {
    newLines.push(`POLAR_ACCESS_TOKEN=${accessToken}`);
  }
  if (!seenKeys.has("POLAR_PRODUCT_ID")) {
    newLines.push(`POLAR_PRODUCT_ID=${productId}`);
  }
  if (!seenKeys.has("POLAR_SUCCESS_URL")) {
    newLines.push("POLAR_SUCCESS_URL=http://localhost:3001/success?checkout_id={CHECKOUT_ID}");
  }

  // Écrire le fichier
  writeFileSync(envPath, newLines.join("\n"));

  console.log("\n✅ Fichier .env mis à jour !\n");

  if (accessToken) {
    console.log("🧪 Test de la configuration...\n");
    // Tester la configuration
    import("./test-polar.ts");
  } else {
    console.log("⚠️  POLAR_ACCESS_TOKEN n'est pas configuré.");
    console.log("   La création de compte fonctionnera, mais pas le checkout.\n");
    console.log("📖 Pour configurer Polar plus tard, consultez GET_POLAR_TOKEN.md\n");
    process.exit(0);
  }
}



