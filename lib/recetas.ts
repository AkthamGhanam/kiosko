// Conocimiento de ventas: qué llevar para cada plato. Solo se sugieren productos
// del catálogo (por slug) y en cantidades típicas para una preparación casera.
// Para agregar un plato basta con sumar una entrada.
import { fonetica, normalizar } from "./texto";

export type Receta = {
  plato: string;
  claves: string[]; // cómo lo puede decir el cliente
  items: { slug: string; gramos: number; para: string }[];
  consejo: string; // una frase corta de vendedora
};

export const RECETAS: Receta[] = [
  {
    plato: "hallacas",
    claves: ["hallaca", "hallacas", "ayaca", "ayacas", "hayaca", "hayacas", "yaca", "yacas", "llaca", "llacas"],
    items: [
      { slug: "onoto", gramos: 50, para: "el color de la masa y el guiso" },
      { slug: "comino", gramos: 25, para: "el guiso" },
      { slug: "ajo-polvo", gramos: 50, para: "el guiso" },
      { slug: "pimienta-negra", gramos: 25, para: "el guiso" },
      { slug: "pasas", gramos: 150, para: "el adorno" },
      { slug: "almendras", gramos: 100, para: "el adorno" },
    ],
    consejo: "El onoto es el secreto del color dorado de la masa.",
  },
  {
    plato: "café",
    claves: ["cafe", "cafecito", "guayoyo", "marroncito", "cafe de olla", "cafe con canela"],
    items: [
      { slug: "canela", gramos: 100, para: "aromatizar el café" },
      { slug: "clavo", gramos: 100, para: "un toque especiado" },
      { slug: "nuez-moscada", gramos: 100, para: "espolvorear" },
    ],
    consejo: "Una pizca de canela en el colador cambia el café.",
  },
  {
    plato: "pan de jamón",
    claves: ["pan de jamon", "panes de jamon"],
    items: [
      { slug: "pasas", gramos: 200, para: "el relleno" },
      { slug: "almendras", gramos: 50, para: "decorar" },
    ],
    consejo: "Remoja las pasas un rato antes para que queden jugosas.",
  },
  {
    plato: "torta negra",
    claves: ["torta negra", "bizcocho negro", "torta de navidad"],
    items: [
      { slug: "pasas", gramos: 250, para: "la mezcla" },
      { slug: "nueces", gramos: 100, para: "la mezcla" },
      { slug: "canela", gramos: 25, para: "el aroma" },
      { slug: "nuez-moscada", gramos: 10, para: "el aroma" },
      { slug: "clavo", gramos: 10, para: "el aroma" },
    ],
    consejo: "Mientras más días reposen las frutas, más sabrosa queda.",
  },
  {
    plato: "chocolate caliente",
    claves: ["chocolate caliente", "chocolate"],
    items: [
      { slug: "canela", gramos: 25, para: "el aroma" },
      { slug: "clavo", gramos: 10, para: "un toque especiado" },
      { slug: "nuez-moscada", gramos: 10, para: "espolvorear" },
    ],
    consejo: "Una rama de canela hirviendo con la leche hace la diferencia.",
  },
  {
    plato: "arroz con leche",
    claves: ["arroz con leche"],
    items: [
      { slug: "canela", gramos: 25, para: "cocinar y espolvorear" },
      { slug: "clavo", gramos: 10, para: "el aroma" },
      { slug: "pasas", gramos: 100, para: "acompañar" },
    ],
    consejo: "Agrega las pasas al final para que no se deshagan.",
  },
  {
    plato: "ponche crema",
    claves: ["ponche crema", "ponche"],
    items: [
      { slug: "nuez-moscada", gramos: 10, para: "el toque final" },
      { slug: "canela", gramos: 15, para: "decorar" },
    ],
    consejo: "La nuez moscada recién rallada es la que más perfuma.",
  },
  {
    plato: "pollo al horno",
    claves: ["pollo al horno", "pollo horneado", "pollo asado", "pollo"],
    items: [
      { slug: "paprika", gramos: 50, para: "el color y el sabor" },
      { slug: "ajo-polvo", gramos: 50, para: "el adobo" },
      { slug: "oregano", gramos: 25, para: "el adobo" },
      { slug: "pimienta-negra", gramos: 25, para: "el adobo" },
    ],
    consejo: "Adóbalo desde la noche anterior y queda mucho más sabroso.",
  },
  {
    plato: "carne mechada",
    claves: ["carne mechada", "pabellon", "pabellon criollo", "mechada"],
    items: [
      { slug: "comino", gramos: 25, para: "el guiso" },
      { slug: "ajo-polvo", gramos: 50, para: "el guiso" },
      { slug: "onoto", gramos: 25, para: "el color" },
      { slug: "oregano", gramos: 15, para: "el guiso" },
      { slug: "pimienta-negra", gramos: 25, para: "el guiso" },
    ],
    consejo: "Un poquito de comino basta: es fuerte.",
  },
  {
    plato: "asado negro",
    claves: ["asado negro", "asado"],
    items: [
      { slug: "pimienta-negra", gramos: 25, para: "el adobo" },
      { slug: "ajo-polvo", gramos: 50, para: "el adobo" },
      { slug: "clavo", gramos: 10, para: "el toque dulce especiado" },
    ],
    consejo: "Dos o tres clavitos le dan ese sabor de casa.",
  },
  {
    plato: "curry",
    claves: ["curry", "pollo al curry", "comida india"],
    items: [
      { slug: "curry", gramos: 50, para: "la salsa" },
      { slug: "comino", gramos: 25, para: "la salsa" },
      { slug: "ajo-polvo", gramos: 25, para: "la base" },
    ],
    consejo: "Sofríe el curry un minuto en aceite para que suelte el aroma.",
  },
  {
    plato: "granola casera",
    claves: ["granola", "desayuno", "desayuno saludable", "bowl"],
    items: [
      { slug: "avena", gramos: 500, para: "la base" },
      { slug: "almendras", gramos: 100, para: "lo crujiente" },
      { slug: "pasas", gramos: 100, para: "lo dulce" },
      { slug: "linaza", gramos: 100, para: "la fibra" },
      { slug: "ajonjoli", gramos: 50, para: "lo tostado" },
    ],
    consejo: "Tuéstala en el horno con un poco de miel y queda espectacular.",
  },
  {
    plato: "pasapalos",
    claves: ["pasapalos", "fiesta", "reunion", "picar", "para picar", "cumpleanos", "ver el partido", "para el partido", "ver el juego", "para el juego", "una parranda", "la rumba"],
    items: [
      { slug: "mani-salado", gramos: 500, para: "picar" },
      { slug: "merey", gramos: 250, para: "picar" },
      { slug: "mani-confitado", gramos: 250, para: "lo dulce" },
      { slug: "chocolate-mani", gramos: 250, para: "lo dulce" },
    ],
    consejo: "Para unas 10 personas, con esto alcanza bien.",
  },
  {
    plato: "carne asada",
    claves: ["carne", "carne asada", "parrilla", "parrillada", "bistec", "bisteck", "carne guisada", "costillas", "res"],
    items: [
      { slug: "ajo-polvo", gramos: 50, para: "el adobo" },
      { slug: "pimienta-negra", gramos: 25, para: "el adobo" },
      { slug: "paprika", gramos: 50, para: "el color" },
      { slug: "comino", gramos: 25, para: "un toque criollo" },
      { slug: "oregano", gramos: 15, para: "el aroma" },
    ],
    consejo: "Sálala justo antes de ponerla al fuego para que no suelte el jugo.",
  },
  {
    plato: "pescado",
    claves: ["pescado", "pescados", "pargo", "mero", "atun", "salmon", "camarones", "mariscos", "ceviche", "pescado frito"],
    items: [
      { slug: "ajo-polvo", gramos: 50, para: "el adobo" },
      { slug: "paprika", gramos: 25, para: "el color" },
      { slug: "oregano", gramos: 15, para: "el aroma" },
      { slug: "pimienta-negra", gramos: 25, para: "el adobo" },
    ],
    consejo: "Con limón, ajo y un poquito de paprika queda doradito y sabroso.",
  },
  {
    plato: "caraotas negras",
    claves: ["caraotas", "caraota", "frijoles", "porotos", "granos", "lentejas", "arvejas"],
    items: [
      { slug: "comino", gramos: 25, para: "el sabor criollo" },
      { slug: "ajo-polvo", gramos: 50, para: "el sofrito" },
      { slug: "onoto", gramos: 25, para: "el color" },
      { slug: "pimienta-negra", gramos: 15, para: "el toque final" },
    ],
    consejo: "Una pizca de comino al final hace que sepan a caraotas de casa.",
  },
  {
    plato: "sopa",
    claves: ["sopa", "sancocho", "hervido", "consome", "crema de auyama", "cruzado"],
    items: [
      { slug: "comino", gramos: 25, para: "el caldo" },
      { slug: "ajo-polvo", gramos: 50, para: "el caldo" },
      { slug: "onoto", gramos: 25, para: "el color" },
      { slug: "oregano", gramos: 15, para: "el aroma" },
      { slug: "pimienta-negra", gramos: 15, para: "el toque final" },
    ],
    consejo: "El orégano va al final, así no pierde el aroma.",
  },
  {
    plato: "pasta",
    claves: ["pasta", "espaguetis", "espagueti", "salsa", "salsa de tomate", "bolonesa", "macarrones", "fideos"],
    items: [
      { slug: "oregano", gramos: 25, para: "la salsa" },
      { slug: "ajo-polvo", gramos: 50, para: "la salsa" },
      { slug: "pimienta-negra", gramos: 15, para: "el toque final" },
    ],
    consejo: "Deja la salsa a fuego bajo unos minutos con el orégano y queda mucho más rica.",
  },
  {
    plato: "ensalada",
    claves: ["ensalada", "ensaladas", "algo saludable", "dieta"],
    items: [
      { slug: "nueces", gramos: 100, para: "lo crujiente" },
      { slug: "almendras", gramos: 100, para: "lo crujiente" },
      { slug: "pasas", gramos: 100, para: "un toque dulce" },
      { slug: "ajonjoli", gramos: 50, para: "espolvorear" },
    ],
    consejo: "Tuesta el ajonjolí un minuto en sartén seco y cambia todo el sabor.",
  },
  {
    plato: "papas y verduras",
    claves: ["papas", "papa", "papas al horno", "verduras", "vegetales", "arroz"],
    items: [
      { slug: "paprika", gramos: 25, para: "el color" },
      { slug: "ajo-polvo", gramos: 25, para: "el sabor" },
      { slug: "oregano", gramos: 15, para: "el aroma" },
      { slug: "pimienta-negra", gramos: 15, para: "el toque final" },
    ],
    consejo: "Con un chorrito de aceite y paprika quedan doraditas al horno.",
  },
  {
    plato: "arepas",
    claves: ["arepa", "arepas", "reina pepiada", "arepa rellena", "domino", "arepera"],
    items: [
      { slug: "comino", gramos: 100, para: "el relleno" },
      { slug: "ajo-polvo", gramos: 100, para: "el relleno" },
      { slug: "onoto", gramos: 100, para: "el color del guiso" },
      { slug: "pimienta-negra", gramos: 100, para: "el relleno" },
      { slug: "oregano", gramos: 100, para: "el guiso" },
    ],
    consejo: "Para el relleno de carne, un toque de comino y onoto hace la diferencia.",
  },
  {
    plato: "empanadas",
    claves: ["empanada", "empanadas", "pastelitos", "pastelito"],
    items: [
      { slug: "comino", gramos: 100, para: "el guiso" },
      { slug: "ajo-polvo", gramos: 100, para: "el guiso" },
      { slug: "onoto", gramos: 100, para: "el color" },
      { slug: "pimienta-negra", gramos: 100, para: "el guiso" },
      { slug: "oregano", gramos: 100, para: "el guiso" },
      { slug: "paprika", gramos: 100, para: "el color" },
    ],
    consejo: "Deja enfriar bien el guiso antes de rellenar.",
  },
  {
    plato: "arroz con pollo",
    claves: ["arroz con pollo", "arroz amarillo", "arroz con carne"],
    items: [
      { slug: "onoto", gramos: 100, para: "el color amarillo" },
      { slug: "comino", gramos: 100, para: "el sabor" },
      { slug: "ajo-polvo", gramos: 100, para: "el sofrito" },
      { slug: "oregano", gramos: 100, para: "el aroma" },
      { slug: "pimienta-negra", gramos: 100, para: "el toque final" },
      { slug: "paprika", gramos: 100, para: "el color" },
    ],
    consejo: "El onoto le da el color sin cambiar el sabor.",
  },
  {
    plato: "paella",
    claves: ["paella", "arroz marinero", "arroz con mariscos"],
    items: [
      { slug: "paprika", gramos: 100, para: "el sofrito" },
      { slug: "ajo-polvo", gramos: 100, para: "el sofrito" },
      { slug: "onoto", gramos: 100, para: "el color" },
      { slug: "pimienta-negra", gramos: 100, para: "el toque final" },
      { slug: "oregano", gramos: 100, para: "el aroma" },
    ],
    consejo: "No revuelvas el arroz al final, así se forma la costrita.",
  },
  {
    plato: "pollo frito",
    claves: ["pollo frito", "pollo empanizado", "alitas", "alas de pollo", "nuggets", "milanesa"],
    items: [
      { slug: "paprika", gramos: 100, para: "el empanizado" },
      { slug: "ajo-polvo", gramos: 100, para: "el adobo" },
      { slug: "pimienta-negra", gramos: 100, para: "el adobo" },
      { slug: "oregano", gramos: 100, para: "el empanizado" },
      { slug: "comino", gramos: 100, para: "el adobo" },
      { slug: "curry", gramos: 100, para: "un toque distinto" },
    ],
    consejo: "Mezcla las especias con la harina, no solo con el pollo.",
  },
  {
    plato: "pollo guisado",
    claves: ["pollo guisado", "pollo en salsa", "guiso de pollo", "guisado"],
    items: [
      { slug: "onoto", gramos: 100, para: "el color" },
      { slug: "comino", gramos: 100, para: "el guiso" },
      { slug: "ajo-polvo", gramos: 100, para: "el sofrito" },
      { slug: "oregano", gramos: 100, para: "el guiso" },
      { slug: "pimienta-negra", gramos: 100, para: "el toque final" },
    ],
    consejo: "Sofríe primero las especias en el aceite y suelta más sabor.",
  },
  {
    plato: "pernil",
    claves: ["pernil", "pernil horneado", "cochino", "lechon", "cerdo", "chuletas", "costillas de cerdo"],
    items: [
      { slug: "ajo-polvo", gramos: 100, para: "el adobo" },
      { slug: "oregano", gramos: 100, para: "el adobo" },
      { slug: "comino", gramos: 100, para: "el adobo" },
      { slug: "pimienta-negra", gramos: 100, para: "el adobo" },
      { slug: "paprika", gramos: 100, para: "el dorado" },
      { slug: "clavo", gramos: 100, para: "clavarlo en la piel" },
      { slug: "onoto", gramos: 100, para: "el color" },
    ],
    consejo: "Adóbalo la noche anterior y queda jugoso.",
  },
  {
    plato: "pavo navideño",
    claves: ["pavo", "pavo relleno", "pavo navideno", "pavo al horno"],
    items: [
      { slug: "ajo-polvo", gramos: 100, para: "el adobo" },
      { slug: "paprika", gramos: 100, para: "el dorado" },
      { slug: "pimienta-negra", gramos: 100, para: "el adobo" },
      { slug: "oregano", gramos: 100, para: "el adobo" },
      { slug: "nuez-moscada", gramos: 100, para: "el relleno" },
      { slug: "clavo", gramos: 100, para: "el aroma" },
      { slug: "pasas", gramos: 100, para: "el relleno" },
      { slug: "almendras", gramos: 100, para: "el relleno" },
    ],
    consejo: "Ponle mantequilla con especias debajo de la piel.",
  },
  {
    plato: "ensalada de gallina",
    claves: ["ensalada de gallina", "ensalada de pollo", "ensalada navidena"],
    items: [
      { slug: "pasas", gramos: 100, para: "el toque dulce" },
      { slug: "almendras", gramos: 100, para: "lo crujiente" },
      { slug: "nueces", gramos: 100, para: "lo crujiente" },
      { slug: "pimienta-negra", gramos: 100, para: "el aliño" },
    ],
    consejo: "Las pasas y las nueces le dan el toque navideño.",
  },
  {
    plato: "dulce de lechosa",
    claves: ["dulce de lechosa", "dulce de higos", "dulce de guayaba", "dulces navidenos", "conserva de coco"],
    items: [
      { slug: "canela", gramos: 100, para: "el almíbar" },
      { slug: "clavo", gramos: 100, para: "el almíbar" },
      { slug: "nuez-moscada", gramos: 100, para: "un toque final" },
    ],
    consejo: "Cocina a fuego lento con la canela en rama hasta que brille.",
  },
  {
    plato: "majarete",
    claves: ["majarete", "natilla", "quesillo", "flan", "bienmesabe", "pudin", "budin", "manjar"],
    items: [
      { slug: "canela", gramos: 100, para: "espolvorear" },
      { slug: "nuez-moscada", gramos: 100, para: "el aroma" },
      { slug: "clavo", gramos: 100, para: "el aroma" },
    ],
    consejo: "Espolvorea canela justo al servir.",
  },
  {
    plato: "tortas y galletas",
    claves: ["torta", "tortas", "ponque", "bizcocho", "quesitos", "muffins", "cupcakes", "galletas", "galleta", "polvorosas", "brownie", "brownies", "pie de manzana", "postre", "postres", "reposteria", "hornear algo dulce", "torta de zanahoria", "pan dulce"],
    items: [
      { slug: "canela", gramos: 100, para: "la masa" },
      { slug: "nuez-moscada", gramos: 100, para: "la masa" },
      { slug: "nueces", gramos: 100, para: "la masa o decorar" },
      { slug: "pasas", gramos: 100, para: "la masa" },
      { slug: "almendras", gramos: 100, para: "decorar" },
      { slug: "clavo", gramos: 100, para: "un toque especiado" },
    ],
    consejo: "Una pizca de nuez moscada realza la canela.",
  },
  {
    plato: "galletas de avena",
    claves: ["galletas de avena", "barras de cereal", "barritas", "barras energeticas", "barra de granola"],
    items: [
      { slug: "avena", gramos: 100, para: "la base" },
      { slug: "pasas", gramos: 100, para: "lo dulce" },
      { slug: "mani-tostado", gramos: 100, para: "lo crujiente" },
      { slug: "almendras", gramos: 100, para: "lo crujiente" },
      { slug: "linaza", gramos: 100, para: "la fibra" },
      { slug: "ajonjoli", gramos: 100, para: "espolvorear" },
      { slug: "canela", gramos: 100, para: "el aroma" },
    ],
    consejo: "Tuesta la avena unos minutos antes y queda más crujiente.",
  },
  {
    plato: "batido",
    claves: ["batido", "batidos", "smoothie", "merengada", "licuado", "avena caliente", "atol", "chicha"],
    items: [
      { slug: "avena", gramos: 100, para: "espesar" },
      { slug: "linaza", gramos: 100, para: "la fibra" },
      { slug: "almendras", gramos: 100, para: "la proteína" },
      { slug: "canela", gramos: 100, para: "el sabor" },
      { slug: "nuez-moscada", gramos: 100, para: "un toque" },
    ],
    consejo: "Remoja la linaza 10 minutos antes de licuarla.",
  },
  {
    plato: "turrón",
    claves: ["turron", "turrones", "dulce de ajonjoli", "alegrias", "conserva de mani", "nougat", "crema de mani", "mantequilla de mani"],
    items: [
      { slug: "mani-tostado", gramos: 100, para: "la base" },
      { slug: "almendras", gramos: 100, para: "la mezcla" },
      { slug: "ajonjoli", gramos: 100, para: "la mezcla" },
      { slug: "merey", gramos: 100, para: "la mezcla" },
    ],
    consejo: "Tuesta los frutos secos antes y suelta todo el sabor.",
  },
  {
    plato: "comida china",
    claves: ["comida china", "arroz chino", "arroz frito", "chop suey", "lumpias", "wok", "salteado", "teriyaki"],
    items: [
      { slug: "ajonjoli", gramos: 100, para: "decorar" },
      { slug: "ajo-polvo", gramos: 100, para: "el salteado" },
      { slug: "pimienta-negra", gramos: 100, para: "el salteado" },
      { slug: "mani-tostado", gramos: 100, para: "lo crujiente" },
      { slug: "merey", gramos: 100, para: "el pollo con merey" },
    ],
    consejo: "El ajonjolí tostado al final es lo que da el sabor de restaurante.",
  },
  {
    plato: "comida árabe",
    claves: ["comida arabe", "shawarma", "kebab", "falafel", "hummus", "kibbe", "tabule", "comida libanesa"],
    items: [
      { slug: "comino", gramos: 100, para: "el adobo" },
      { slug: "paprika", gramos: 100, para: "el adobo" },
      { slug: "ajo-polvo", gramos: 100, para: "el adobo" },
      { slug: "pimienta-negra", gramos: 100, para: "el adobo" },
      { slug: "ajonjoli", gramos: 100, para: "la tahini" },
      { slug: "canela", gramos: 100, para: "un toque en la carne" },
    ],
    consejo: "Un poquito de canela en la carne es el secreto árabe.",
  },
  {
    plato: "comida mexicana",
    claves: ["comida mexicana", "tacos", "taco", "burritos", "fajitas", "nachos", "chili", "quesadillas", "enchiladas", "guacamole"],
    items: [
      { slug: "comino", gramos: 100, para: "la carne" },
      { slug: "paprika", gramos: 100, para: "el color" },
      { slug: "oregano", gramos: 100, para: "la carne" },
      { slug: "ajo-polvo", gramos: 100, para: "la carne" },
      { slug: "pimienta-negra", gramos: 100, para: "el toque final" },
    ],
    consejo: "Comino y paprika juntos dan el sabor de los tacos.",
  },
  {
    plato: "hamburguesas",
    claves: ["hamburguesa", "hamburguesas", "carne molida", "albondigas", "pastel de carne", "perros calientes"],
    items: [
      { slug: "paprika", gramos: 100, para: "la carne" },
      { slug: "ajo-polvo", gramos: 100, para: "la carne" },
      { slug: "pimienta-negra", gramos: 100, para: "la carne" },
      { slug: "comino", gramos: 100, para: "la carne" },
      { slug: "oregano", gramos: 100, para: "la carne" },
    ],
    consejo: "Sazona la carne molida y no la amases de más.",
  },
  {
    plato: "barbacoa",
    claves: ["barbacoa", "bbq", "ribs", "costillitas"],
    items: [
      { slug: "paprika", gramos: 100, para: "el adobo" },
      { slug: "ajo-polvo", gramos: 100, para: "el adobo" },
      { slug: "pimienta-negra", gramos: 100, para: "el adobo" },
      { slug: "comino", gramos: 100, para: "el adobo" },
      { slug: "oregano", gramos: 100, para: "el adobo" },
      { slug: "canela", gramos: 100, para: "un toque dulce" },
    ],
    consejo: "Haz un adobo seco con las especias y déjalo reposar.",
  },
  {
    plato: "chivo",
    claves: ["chivo", "cordero", "chivo en coco", "carne de chivo", "ovejo"],
    items: [
      { slug: "comino", gramos: 100, para: "el guiso" },
      { slug: "ajo-polvo", gramos: 100, para: "el adobo" },
      { slug: "oregano", gramos: 100, para: "el adobo" },
      { slug: "pimienta-negra", gramos: 100, para: "el adobo" },
      { slug: "onoto", gramos: 100, para: "el color" },
      { slug: "clavo", gramos: 100, para: "el aroma" },
    ],
    consejo: "El comino es el mejor amigo del chivo.",
  },
  {
    plato: "mondongo",
    claves: ["mondongo", "pisca", "pisca andina", "hervido de gallina", "sopa de pollo"],
    items: [
      { slug: "comino", gramos: 100, para: "el caldo" },
      { slug: "ajo-polvo", gramos: 100, para: "el caldo" },
      { slug: "onoto", gramos: 100, para: "el color" },
      { slug: "oregano", gramos: 100, para: "el caldo" },
      { slug: "pimienta-negra", gramos: 100, para: "el caldo" },
    ],
    consejo: "Agrega el comino al principio para que se integre.",
  },
  {
    plato: "huevos",
    claves: ["huevos", "perico", "revoltillo", "omelette", "tortilla", "huevos revueltos", "desayuno criollo"],
    items: [
      { slug: "paprika", gramos: 100, para: "el color" },
      { slug: "pimienta-negra", gramos: 100, para: "el sabor" },
      { slug: "ajo-polvo", gramos: 100, para: "el sabor" },
      { slug: "oregano", gramos: 100, para: "el aroma" },
    ],
    consejo: "Una pizca de paprika encima y se ven de restaurante.",
  },
  {
    plato: "pizza",
    claves: ["pizza", "pizzas", "calzone", "pan de ajo"],
    items: [
      { slug: "oregano", gramos: 100, para: "la salsa" },
      { slug: "ajo-polvo", gramos: 100, para: "la salsa" },
      { slug: "pimienta-negra", gramos: 100, para: "la salsa" },
      { slug: "paprika", gramos: 100, para: "la masa" },
    ],
    consejo: "El orégano va en la salsa y otro poquito al salir del horno.",
  },
  {
    plato: "lasaña",
    claves: ["lasana", "lasagna", "pasticho", "bechamel", "canelones"],
    items: [
      { slug: "oregano", gramos: 100, para: "la salsa" },
      { slug: "ajo-polvo", gramos: 100, para: "la salsa" },
      { slug: "nuez-moscada", gramos: 100, para: "la bechamel" },
      { slug: "pimienta-negra", gramos: 100, para: "la bechamel" },
      { slug: "paprika", gramos: 100, para: "la carne" },
    ],
    consejo: "La nuez moscada es el secreto de una buena bechamel.",
  },
  {
    plato: "mezcla de frutos secos",
    claves: ["frutos secos", "mix de frutos secos", "mezcla de frutos secos", "gimnasio", "gym", "proteina", "keto", "merienda saludable", "snack saludable"],
    items: [
      { slug: "almendras", gramos: 100, para: "la mezcla" },
      { slug: "nueces", gramos: 100, para: "la mezcla" },
      { slug: "merey", gramos: 100, para: "la mezcla" },
      { slug: "mani-tostado", gramos: 100, para: "la mezcla" },
      { slug: "pasas", gramos: 100, para: "lo dulce" },
      { slug: "linaza", gramos: 100, para: "la fibra" },
    ],
    consejo: "Un puñito al día es una merienda completa.",
  },
  {
    plato: "golosinas",
    claves: ["golosinas", "chucherias", "chuches", "lonchera", "para los ninos", "merienda", "dulces", "algo dulce", "pelicula", "ver una pelicula", "cine en casa"],
    items: [
      { slug: "chocolate-mani", gramos: 100, para: "lo dulce" },
      { slug: "mani-confitado", gramos: 100, para: "lo dulce" },
      { slug: "mani-dandy", gramos: 100, para: "picar" },
      { slug: "pasas", gramos: 100, para: "picar" },
      { slug: "merey", gramos: 100, para: "picar" },
    ],
    consejo: "El maní con chocolate es el favorito de los niños.",
  },
  {
    plato: "pan casero",
    claves: ["pan casero", "pan integral", "pan de avena", "pan de molde", "hacer pan"],
    items: [
      { slug: "linaza", gramos: 100, para: "la masa" },
      { slug: "ajonjoli", gramos: 100, para: "la corteza" },
      { slug: "avena", gramos: 100, para: "la masa" },
      { slug: "nueces", gramos: 100, para: "la masa" },
    ],
    consejo: "Espolvorea ajonjolí encima antes de hornear.",
  },
  {
    plato: "bebidas calientes",
    claves: ["te de canela", "agua de canela", "infusion", "infusiones", "vino caliente", "sangria", "guarapo", "papelon con limon caliente"],
    items: [
      { slug: "canela", gramos: 100, para: "la infusión" },
      { slug: "clavo", gramos: 100, para: "la infusión" },
      { slug: "nuez-moscada", gramos: 100, para: "un toque" },
    ],
    consejo: "Hierve la canela con el clavo cinco minutos y listo.",
  },
];

const RX_COCINAR = /\b(hace[rl]?|p[rl]?epa[rl]a[rl]?|cocina[rl]?|voy a|vamos a|quie[rl]o|receta|que (le )?(pongo|echo|lleva|necesito)|pa[rl]a (unas?|el|la|los|las))\b/;

/** Busca un plato en lo que dijo el cliente. Tolera pronunciación ("allacas", "pabeyon"). */
export function detectarReceta(texto: string): Receta | null {
  const f = ` ${fonetica(texto)} `;
  let mejor: { r: Receta; largo: number } | null = null;
  for (const r of RECETAS) {
    for (const c of r.claves) {
      const fc = fonetica(c);
      if (f.includes(` ${fc} `) || f.includes(` ${fc}s `)) {
        if (!mejor || fc.length > mejor.largo) mejor = { r, largo: fc.length };
      }
    }
  }
  return mejor?.r ?? null;
}

export function quiereCocinar(texto: string) {
  return RX_COCINAR.test(normalizar(texto));
}
