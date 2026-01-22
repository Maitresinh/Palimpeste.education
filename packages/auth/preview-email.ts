/**
 * Script pour prévisualiser les emails sans le serveur react-email
 * Usage: bun preview-email.ts [template]
 * Exemple: bun preview-email.ts verification
 */
import { render } from "@react-email/components";
import { createElement } from "react";
import { writeFileSync } from "fs";
import { join } from "path";

import { VerificationEmail } from "./src/emails/verification";
import { ResetPasswordEmail } from "./src/emails/reset-password";
import { TwoFactorEmail } from "./src/emails/two-factor";

type TemplateConfig = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  component: React.ComponentType<any>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any;
};

const templates: Record<string, TemplateConfig> = {
  verification: {
    component: VerificationEmail,
    props: VerificationEmail.PreviewProps,
  },
  "reset-password": {
    component: ResetPasswordEmail,
    props: ResetPasswordEmail.PreviewProps,
  },
  "two-factor": {
    component: TwoFactorEmail,
    props: TwoFactorEmail.PreviewProps,
  },
};

async function main() {
  const templateName = process.argv[2];

  if (!templateName || !templates[templateName]) {
    console.log("Templates disponibles:");
    for (const name of Object.keys(templates)) {
      console.log(`  - ${name}`);
    }
    console.log("\nUsage: bun preview-email.ts <template>");
    process.exit(1);
  }

  const { component, props } = templates[templateName];
  let html = await render(createElement(component, props));

  // Remplacer l'URL du logo par un chemin local pour le preview
  html = html.replace(
    /http:\/\/localhost:3001\/logo\.png/g,
    "logo.png"
  );

  const outputPath = join(import.meta.dir, `preview-${templateName}.html`);
  writeFileSync(outputPath, html);

  console.log(`Preview genere: ${outputPath}`);

  // Ouvrir dans le navigateur
  const open = await import("open").then((m) => m.default).catch(() => null);
  if (open) {
    await open(outputPath);
  } else {
    console.log("Installe 'open' pour ouvrir automatiquement: bun add -d open");
  }
}

main();
