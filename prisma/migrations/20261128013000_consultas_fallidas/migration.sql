-- CreateTable
CREATE TABLE "consultas_fallidas" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "texto" TEXT NOT NULL,
    "respuesta" TEXT NOT NULL,
    "motivo" TEXT NOT NULL,
    "canal" TEXT NOT NULL DEFAULT 'voz',
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "consultas_fallidas_creado_en_idx" ON "consultas_fallidas"("creado_en");
