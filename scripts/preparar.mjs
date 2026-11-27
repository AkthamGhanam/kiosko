// npm run setup: crea .env si falta, aplica migraciones y carga el catálogo.
import { copyFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Creado .env desde .env.example");
}
execSync("npx prisma migrate deploy", { stdio: "inherit" });
execSync("npx prisma db seed", { stdio: "inherit" });
console.log("\nListo. Ejecuta: npm run dev  y abre http://localhost:3000");
