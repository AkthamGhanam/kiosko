// Catálogo de ejemplo de Minimarket Especias.
// PRECIOS DE EJEMPLO en USD por kilogramo: reemplázalos por los reales.
export type ProductoSemilla = {
  slug: string;
  nombre: string;
  alias: string[];
  categoria: "Maní y frutos secos" | "Especias" | "Granos y cereales" | "Dulces y frutas secas";
  precioKgUsd: number;
  stockGramos: number;
  color: string; // color del producto para su ilustración
};

export const CATALOGO: ProductoSemilla[] = [
  { slug: "avena", nombre: "Avena en hojuelas", alias: ["avena", "abena", "avena en hojuela"], categoria: "Granos y cereales", precioKgUsd: 3.2, stockGramos: 8000, color: "#d9c19a" },
  { slug: "mani-dandy", nombre: "Maní Dandy", alias: ["dandy", "dandi", "mani dandy", "many dandy"], categoria: "Maní y frutos secos", precioKgUsd: 9.5, stockGramos: 5000, color: "#b5651d" },
  { slug: "paprika", nombre: "Paprika", alias: ["paprica", "pimenton", "pimentón", "paprika dulce"], categoria: "Especias", precioKgUsd: 14.0, stockGramos: 2500, color: "#c0392b" },
  { slug: "mani-salado", nombre: "Maní salado", alias: ["mani salado", "many salado", "mani con sal"], categoria: "Maní y frutos secos", precioKgUsd: 7.8, stockGramos: 6000, color: "#c8955a" },
  { slug: "mani-tostado", nombre: "Maní tostado", alias: ["mani tostado", "many tostado", "mani sin sal"], categoria: "Maní y frutos secos", precioKgUsd: 7.2, stockGramos: 6000, color: "#a8743f" },
  { slug: "mani-confitado", nombre: "Maní confitado", alias: ["mani confitado", "many confitado", "mani dulce", "garrapiñado"], categoria: "Maní y frutos secos", precioKgUsd: 8.9, stockGramos: 3000, color: "#d35d4c" },
  { slug: "comino", nombre: "Comino molido", alias: ["comino", "cumino"], categoria: "Especias", precioKgUsd: 12.5, stockGramos: 2000, color: "#8d6e3f" },
  { slug: "oregano", nombre: "Orégano", alias: ["oregano", "oregano seco"], categoria: "Especias", precioKgUsd: 15.0, stockGramos: 1500, color: "#6b7d3a" },
  { slug: "pimienta-negra", nombre: "Pimienta negra", alias: ["pimienta", "pimienta negra molida"], categoria: "Especias", precioKgUsd: 22.0, stockGramos: 1800, color: "#3d3a36" },
  { slug: "onoto", nombre: "Onoto", alias: ["achiote", "onoto molido"], categoria: "Especias", precioKgUsd: 11.0, stockGramos: 1500, color: "#e2571e" },
  { slug: "curry", nombre: "Curry", alias: ["cury", "curri"], categoria: "Especias", precioKgUsd: 16.0, stockGramos: 1200, color: "#e0a526" },
  { slug: "ajo-polvo", nombre: "Ajo en polvo", alias: ["ajo", "ajo molido"], categoria: "Especias", precioKgUsd: 13.0, stockGramos: 2000, color: "#ede0c4" },
  { slug: "canela", nombre: "Canela molida", alias: ["canela", "canela en polvo"], categoria: "Especias", precioKgUsd: 18.0, stockGramos: 1500, color: "#a0522d" },
  { slug: "nuez-moscada", nombre: "Nuez moscada", alias: ["nuez moscada", "moscada"], categoria: "Especias", precioKgUsd: 35.0, stockGramos: 600, color: "#8b5a2b" },
  { slug: "merey", nombre: "Merey", alias: ["merey", "maranon", "marañon", "anacardo", "cashew"], categoria: "Maní y frutos secos", precioKgUsd: 24.0, stockGramos: 2500, color: "#e8c98e" },
  { slug: "almendras", nombre: "Almendras", alias: ["almendra", "almendras"], categoria: "Maní y frutos secos", precioKgUsd: 21.0, stockGramos: 2500, color: "#c19a6b" },
  { slug: "pasas", nombre: "Pasas", alias: ["pasa", "pasas", "uvas pasas"], categoria: "Dulces y frutas secas", precioKgUsd: 9.0, stockGramos: 3000, color: "#5b2c3f" },
  { slug: "nueces", nombre: "Nueces", alias: ["nuez", "nueces"], categoria: "Maní y frutos secos", precioKgUsd: 26.0, stockGramos: 1500, color: "#9c7a54" },
  { slug: "linaza", nombre: "Linaza", alias: ["linaza", "semillas de linaza"], categoria: "Granos y cereales", precioKgUsd: 6.5, stockGramos: 3000, color: "#7a5230" },
  { slug: "ajonjoli", nombre: "Ajonjolí", alias: ["ajonjoli", "sesamo"], categoria: "Granos y cereales", precioKgUsd: 8.0, stockGramos: 2500, color: "#efe2c0" },
  { slug: "clavo", nombre: "Clavo de olor", alias: ["clavo", "clavitos", "clavos de olor"], categoria: "Especias", precioKgUsd: 30.0, stockGramos: 500, color: "#4e2a1e" },
  { slug: "chocolate-mani", nombre: "Maní con chocolate", alias: ["mani con chocolate", "many con chocolate", "chocomani", "mani de chocolate", "mani chocolate", "chocolate con mani"], categoria: "Dulces y frutas secas", precioKgUsd: 12.0, stockGramos: 2000, color: "#5a3825" },
];
