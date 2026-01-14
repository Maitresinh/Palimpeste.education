import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

// En production (Docker), DATABASE_URL est injecté via docker-compose
// On ne charge le .env que pour le développement local
if (!process.env.DATABASE_URL) {
  dotenv.config({
    path: "../../apps/server/.env",
  });
}

export default defineConfig({
  schema: "./src/schema",
  out: "./src/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "",
  },
});
