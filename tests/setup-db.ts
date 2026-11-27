import { execSync } from "node:child_process";

// Crea o sincroniza una base SQLite solo para los tests (prisma/test.db).
export default function setup() {
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "ignore",
  });
}
