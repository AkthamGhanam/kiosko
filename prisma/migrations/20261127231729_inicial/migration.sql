-- CreateTable
CREATE TABLE "productos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "alias" TEXT NOT NULL DEFAULT '',
    "categoria" TEXT NOT NULL,
    "precio_kg_centavos" INTEGER NOT NULL,
    "stock_gramos" INTEGER NOT NULL,
    "imagen" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "estado" TEXT NOT NULL DEFAULT 'confirmado',
    "canal" TEXT NOT NULL DEFAULT 'tactil',
    "total_centavos" INTEGER NOT NULL,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "items_pedido" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "pedido_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "nombre_producto" TEXT NOT NULL,
    "gramos" INTEGER NOT NULL,
    "precio_kg_centavos" INTEGER NOT NULL,
    "subtotal_centavos" INTEGER NOT NULL,
    CONSTRAINT "items_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "items_pedido_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "movimientos_inventario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "producto_id" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "gramos" INTEGER NOT NULL,
    "stock_resultante" INTEGER NOT NULL,
    "pedido_id" INTEGER,
    "nota" TEXT,
    "creado_en" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "movimientos_inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "movimientos_inventario_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "productos_slug_key" ON "productos"("slug");

-- CreateIndex
CREATE INDEX "movimientos_inventario_producto_id_creado_en_idx" ON "movimientos_inventario"("producto_id", "creado_en");
