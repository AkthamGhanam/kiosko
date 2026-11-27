import { PrismaClient } from "@prisma/client";
import { CATALOGO } from "./catalogo";

const prisma = new PrismaClient();

async function main() {
  for (const p of CATALOGO) {
    const data = {
      nombre: p.nombre,
      alias: p.alias.join(","),
      categoria: p.categoria,
      precioKg: Math.round(p.precioKgUsd * 100),
      imagen: `/productos/${p.slug}.svg`,
    };
    const existente = await prisma.producto.findUnique({ where: { slug: p.slug } });
    if (existente) {
      await prisma.producto.update({ where: { slug: p.slug }, data });
      continue;
    }
    const creado = await prisma.producto.create({
      data: { ...data, slug: p.slug, stockGramos: p.stockGramos },
    });
    await prisma.movimientoInventario.create({
      data: {
        productoId: creado.id,
        tipo: "reposicion",
        gramos: p.stockGramos,
        stockResultante: p.stockGramos,
        nota: "Inventario inicial (seed)",
      },
    });
  }
  console.log(`Catálogo listo: ${CATALOGO.length} productos`);
}

main().finally(() => prisma.$disconnect());
