import { defineConfig } from "drizzle-kit";
import "dotenv/config";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/drizzle/schema/schema.ts",
  out: "./src/db/drizzle/migrations",
  dbCredentials: { url: process.env.DATABASE_URL ?? "" },
  verbose: true,
});