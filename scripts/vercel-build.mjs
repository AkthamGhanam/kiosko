// Build para Vercel (o cualquier hosting sin disco persistente).
// Si DATABASE_URL es Postgres (por ejemplo Neon, gratis desde el panel de Vercel),
// se genera una copia del esquema con provider "postgresql", se crean las tablas
// y se carga el catálogo sin pisar el stock existente. Con SQLite hace el build normal.
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";

const run = (cmd) => execSync(cmd, { stdio: "inherit" });
const url = process.env.DATABASE_URL ?? "";

if (/^postgres(ql)?:\/\//.test(url)) {
  const directa = process.env.DATABASE_URL_UNPOOLED ? '\n  directUrl = env("DATABASE_URL_UNPOOLED")' : "";
  const esquema = readFileSync("prisma/schema.prisma", "utf8").replace(
    /datasource db \{[^}]*\}/,
    `datasource db {\n  provider = "postgresql"\n  url      = env("DATABASE_URL")${directa}\n}`,
  );
  mkdirSync("prisma/postgres", { recursive: true });
  writeFileSync("prisma/postgres/schema.prisma", esquema);
  run("npx prisma generate --schema prisma/postgres/schema.prisma");
  run("npx prisma db push --skip-generate --schema prisma/postgres/schema.prisma");
  run("npx tsx prisma/seed.ts");
} else {
  if (process.env.VERCEL) {
    console.error("\nFalta una base Postgres: en Vercel ve a Storage → Create Database → Neon y vuelve a desplegar.\n");
    process.exit(1);
  }
  run("npx prisma generate");
}
run("npx next build");
