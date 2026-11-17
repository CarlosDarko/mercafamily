// Recetario de MercaFamily: recetas sencillas y saludables de cocina de casa.
// Cantidades para 3 personas (dos adultos y un peque). 'q' es lo que se busca en el catálogo de Mercadona.
// basic: true para lo que casi siempre hay en casa (sal, aceite, especias): sale desmarcado al añadir a la lista.
// slot: comida, cena o ambas. tags: legumbre, pescado, carne, huevo, verdura, pasta, arroz.
// season: meses en los que mejor está (1 enero ... 12 diciembre). Sin season, todo el año.

const ACEITE = { q: 'aceite de oliva virgen extra', amount: 'un chorro', basic: true }
const SAL = { q: 'sal fina', amount: 'al gusto', basic: true }

import { MORE } from './recipes-more.js'

const BASE = [
  // ---------- Legumbre ----------
  {
    id: 'lentejas-verduras',
    name: 'Lentejas estofadas con verduras',
    slot: 'comida',
    tags: ['legumbre', 'verdura'],
    time: 40,
    kids: true,
    ingredients: [{ q: 'lenteja pardina', amount: '300 g' }, { q: 'zanahoria', amount: '2' }, { q: 'patata', amount: '2' }, { q: 'cebolla', amount: '1' }, { q: 'pimiento verde', amount: '1' }, { q: 'tomate triturado', amount: '200 g' }, { q: 'pimentón dulce', amount: '1 cucharadita', basic: true }, { q: 'hoja de laurel', amount: '1', basic: true }, ACEITE, SAL],
    steps: ['Pica la cebolla, el pimiento y la zanahoria y sofríelos 10 minutos con un chorro de aceite.', 'Añade el tomate y el pimentón y deja 2 minutos más.', 'Echa las lentejas lavadas, la patata en trozos, el laurel y agua hasta cubrir de sobra.', 'Cuece a fuego medio unos 30 minutos, hasta que estén tiernas. Sala al final.']
  },
  {
    id: 'lentejas-arroz',
    name: 'Lentejas con arroz',
    slot: 'comida',
    tags: ['legumbre', 'arroz'],
    time: 35,
    kids: true,
    ingredients: [{ q: 'lenteja cocida', amount: '2 botes' }, { q: 'arroz redondo', amount: '120 g' }, { q: 'cebolla', amount: '1' }, { q: 'zanahoria', amount: '1' }, { q: 'tomate triturado', amount: '150 g' }, { q: 'comino molido', amount: 'una pizca', basic: true }, ACEITE, SAL],
    steps: ['Sofríe la cebolla y la zanahoria picadas.', 'Añade el tomate, el comino y el arroz y remueve un minuto.', 'Cubre con el doble de agua que de arroz y cuece 15 minutos.', 'Añade las lentejas escurridas y deja 5 minutos más.']
  },
  {
    id: 'garbanzos-espinacas',
    name: 'Garbanzos con espinacas',
    slot: 'comida',
    tags: ['legumbre', 'verdura'],
    time: 25,
    kids: false,
    season: [10, 11, 12, 1, 2, 3, 4],
    ingredients: [{ q: 'garbanzo cocido', amount: '2 botes' }, { q: 'espinacas baby', amount: '300 g' }, { q: 'ajo', amount: '2 dientes' }, { q: 'pan', amount: '1 rebanada' }, { q: 'pimentón dulce', amount: '1 cucharadita', basic: true }, { q: 'comino molido', amount: 'una pizca', basic: true }, ACEITE, SAL],
    steps: ['Dora el ajo y la rebanada de pan en aceite y májalos con el pimentón y el comino.', 'Saltea las espinacas en la misma sartén hasta que se reduzcan.', 'Añade los garbanzos escurridos, el majado y un vaso de agua.', 'Cuece 10 minutos a fuego suave.']
  },
  {
    id: 'potaje-bacalao',
    name: 'Potaje de garbanzos con bacalao',
    slot: 'comida',
    tags: ['legumbre', 'pescado', 'verdura'],
    time: 35,
    kids: false,
    season: [2, 3, 4],
    ingredients: [{ q: 'garbanzo cocido', amount: '2 botes' }, { q: 'bacalao desalado', amount: '300 g' }, { q: 'espinacas baby', amount: '200 g' }, { q: 'cebolla', amount: '1' }, { q: 'huevos', amount: '2' }, { q: 'pimentón dulce', amount: '1 cucharadita', basic: true }, ACEITE, SAL],
    steps: ['Cuece los huevos 10 minutos y pélalos.', 'Sofríe la cebolla picada y añade el pimentón.', 'Echa los garbanzos, las espinacas y agua hasta cubrir y cuece 10 minutos.', 'Añade el bacalao en trozos y cuece 5 minutos más. Sirve con el huevo picado.']
  },
  {
    id: 'alubias-verduras',
    name: 'Alubias blancas con verduras',
    slot: 'comida',
    tags: ['legumbre', 'verdura'],
    time: 30,
    kids: true,
    ingredients: [{ q: 'alubia blanca cocida', amount: '2 botes' }, { q: 'pimiento rojo', amount: '1' }, { q: 'cebolla', amount: '1' }, { q: 'zanahoria', amount: '2' }, { q: 'calabacín', amount: '1' }, { q: 'tomate triturado', amount: '200 g' }, ACEITE, SAL],
    steps: ['Pica todas las verduras en dados.', 'Sofríelas 10 minutos con aceite y añade el tomate.', 'Echa las alubias escurridas y un vaso de agua.', 'Cuece 10 minutos a fuego suave y rectifica de sal.']
  },
  {
    id: 'alubias-rojas',
    name: 'Alubias rojas estofadas',
    slot: 'comida',
    tags: ['legumbre'],
    time: 30,
    kids: true,
    season: [10, 11, 12, 1, 2, 3],
    ingredients: [{ q: 'alubia roja cocida', amount: '2 botes' }, { q: 'cebolla', amount: '1' }, { q: 'pimiento verde', amount: '1' }, { q: 'zanahoria', amount: '1' }, { q: 'tomate triturado', amount: '150 g' }, { q: 'pimentón dulce', amount: '1 cucharadita', basic: true }, ACEITE, SAL],
    steps: ['Sofríe la cebolla, el pimiento y la zanahoria picados.', 'Añade el tomate y el pimentón.', 'Echa las alubias con un poco de su caldo y un vaso de agua.', 'Cuece 15 minutos y aplasta unas pocas para espesar.']
  },
  {
    id: 'ensalada-garbanzos',
    name: 'Ensalada de garbanzos',
    slot: 'ambas',
    tags: ['legumbre', 'verdura'],
    time: 10,
    kids: true,
    season: [5, 6, 7, 8, 9],
    ingredients: [{ q: 'garbanzo cocido', amount: '2 botes' }, { q: 'tomate', amount: '2' }, { q: 'pepino', amount: '1' }, { q: 'pimiento rojo', amount: '1/2' }, { q: 'cebolla morada', amount: '1/2' }, { q: 'atún al natural', amount: '2 latas' }, { q: 'vinagre de jerez', amount: 'un chorrito', basic: true }, ACEITE, SAL],
    steps: ['Enjuaga y escurre los garbanzos.', 'Pica las verduras en dados pequeños.', 'Mezcla todo con el atún escurrido.', 'Aliña con aceite, vinagre y sal.']
  },
  {
    id: 'ensalada-lentejas',
    name: 'Ensalada de lentejas',
    slot: 'ambas',
    tags: ['legumbre', 'verdura'],
    time: 10,
    kids: false,
    season: [5, 6, 7, 8, 9],
    ingredients: [{ q: 'lenteja cocida', amount: '2 botes' }, { q: 'tomate cherry', amount: '200 g' }, { q: 'pimiento verde', amount: '1' }, { q: 'cebolla morada', amount: '1/2' }, { q: 'huevos', amount: '2' }, { q: 'vinagre de manzana', amount: 'un chorrito', basic: true }, ACEITE, SAL],
    steps: ['Cuece los huevos 10 minutos.', 'Enjuaga las lentejas y escúrrelas.', 'Pica las verduras y el huevo.', 'Mezcla y aliña con aceite, vinagre y sal.']
  },
  {
    id: 'hummus-crudites',
    name: 'Hummus con palitos de verdura',
    slot: 'cena',
    tags: ['legumbre', 'verdura'],
    time: 10,
    kids: true,
    ingredients: [{ q: 'garbanzo cocido', amount: '1 bote' }, { q: 'limón', amount: '1' }, { q: 'ajo', amount: '1 diente' }, { q: 'zanahoria', amount: '3' }, { q: 'pepino', amount: '1' }, { q: 'pan de pita', amount: '1 paquete' }, { q: 'comino molido', amount: 'una pizca', basic: true }, ACEITE, SAL],
    steps: ['Tritura los garbanzos con el zumo de limón, el ajo, el comino, un chorro de aceite y un poco de agua.', 'Corta la zanahoria y el pepino en palitos.', 'Tuesta el pan de pita y sírvelo con el hummus y las verduras.']
  },
  {
    id: 'garbanzos-salteados',
    name: 'Garbanzos salteados con verduras y huevo',
    slot: 'cena',
    tags: ['legumbre', 'verdura', 'huevo'],
    time: 15,
    kids: true,
    ingredients: [{ q: 'garbanzo cocido', amount: '1 bote' }, { q: 'calabacín', amount: '1' }, { q: 'pimiento rojo', amount: '1/2' }, { q: 'cebolla', amount: '1/2' }, { q: 'huevos', amount: '3' }, ACEITE, SAL],
    steps: ['Saltea la cebolla, el pimiento y el calabacín en dados.', 'Añade los garbanzos escurridos y dora 3 minutos.', 'Echa los huevos batidos y remueve hasta que cuajen.']
  },

  // ---------- Pescado ----------
  {
    id: 'merluza-horno-patatas',
    name: 'Merluza al horno con patatas',
    slot: 'ambas',
    tags: ['pescado'],
    time: 35,
    kids: true,
    ingredients: [{ q: 'filetes de merluza del cabo sin piel', amount: '500 g' }, { q: 'patata', amount: '3' }, { q: 'cebolla', amount: '1' }, { q: 'limón', amount: '1' }, { q: 'ajo', amount: '2 dientes' }, { q: 'perejil', amount: 'un poco', basic: true }, ACEITE, SAL],
    steps: ['Corta las patatas y la cebolla en rodajas finas y hornéalas a 200 °C con aceite y sal 20 minutos.', 'Pon encima la merluza con ajo y perejil picados.', 'Hornea 10 minutos más y sirve con limón.']
  },
  {
    id: 'merluza-salsa-verde',
    name: 'Merluza en salsa verde',
    slot: 'ambas',
    tags: ['pescado'],
    time: 20,
    kids: true,
    ingredients: [{ q: 'merluza rodajas', amount: '500 g' }, { q: 'ajo', amount: '3 dientes' }, { q: 'perejil', amount: '1 manojo' }, { q: 'harina de trigo', amount: '1 cucharada', basic: true }, { q: 'guisantes', amount: '150 g' }, ACEITE, SAL],
    steps: ['Dora el ajo picado en aceite sin que se queme.', 'Añade la harina, remueve y echa un vaso de agua poco a poco.', 'Pon la merluza, los guisantes y el perejil picado.', 'Cuece 6 minutos moviendo la cazuela para que espese la salsa.']
  },
  {
    id: 'salmon-verduras',
    name: 'Salmón al horno con verduras',
    slot: 'ambas',
    tags: ['pescado', 'verdura'],
    time: 25,
    kids: true,
    ingredients: [{ q: 'salmón lomos', amount: '3 lomos' }, { q: 'calabacín', amount: '1' }, { q: 'pimiento rojo', amount: '1' }, { q: 'cebolla', amount: '1' }, { q: 'limón', amount: '1' }, ACEITE, SAL],
    steps: ['Corta las verduras en tiras y hornéalas a 200 °C con aceite 10 minutos.', 'Pon el salmón encima con sal y unas rodajas de limón.', 'Hornea 12 minutos más.']
  },
  {
    id: 'lubina-espalda',
    name: 'Lubina a la espalda con ensalada',
    slot: 'ambas',
    tags: ['pescado', 'verdura'],
    time: 25,
    kids: false,
    ingredients: [{ q: 'lubina', amount: '2 piezas' }, { q: 'ajo', amount: '3 dientes' }, { q: 'lechuga', amount: '1' }, { q: 'tomate', amount: '2' }, { q: 'vinagre de jerez', amount: 'un chorrito', basic: true }, ACEITE, SAL],
    steps: ['Hornea la lubina abierta a 200 °C unos 15 minutos.', 'Dora el ajo en láminas con aceite y un chorrito de vinagre.', 'Riega el pescado con el refrito y sírvelo con ensalada.']
  },
  {
    id: 'bacalao-tomate',
    name: 'Bacalao con tomate',
    slot: 'ambas',
    tags: ['pescado'],
    time: 25,
    kids: true,
    ingredients: [{ q: 'bacalao desalado', amount: '500 g' }, { q: 'tomate triturado', amount: '400 g' }, { q: 'cebolla', amount: '1' }, { q: 'pimiento verde', amount: '1' }, { q: 'harina de trigo', amount: 'un poco', basic: true }, ACEITE, SAL],
    steps: ['Sofríe la cebolla y el pimiento picados 10 minutos.', 'Añade el tomate y cuece 10 minutos.', 'Enharina ligeramente el bacalao, dóralo y ponlo en la salsa 5 minutos.']
  },
  {
    id: 'sardinas-ensalada',
    name: 'Sardinas a la plancha con ensalada',
    slot: 'ambas',
    tags: ['pescado', 'verdura'],
    time: 15,
    kids: false,
    season: [5, 6, 7, 8, 9],
    ingredients: [{ q: 'sardinas frescas', amount: '600 g' }, { q: 'lechuga', amount: '1' }, { q: 'tomate', amount: '2' }, { q: 'cebolla morada', amount: '1/2' }, { q: 'sal gruesa', amount: 'al gusto', basic: true }, ACEITE],
    steps: ['Limpia las sardinas y ponles sal gruesa.', 'Hazlas a la plancha muy caliente 2 o 3 minutos por cada lado.', 'Sirve con ensalada de lechuga, tomate y cebolla.']
  },
  {
    id: 'atun-pimientos',
    name: 'Atún a la plancha con pimientos',
    slot: 'ambas',
    tags: ['pescado', 'verdura'],
    time: 20,
    kids: false,
    season: [6, 7, 8, 9],
    ingredients: [{ q: 'rodajas de atún de aleta amarilla', amount: '450 g' }, { q: 'pimiento rojo', amount: '2' }, { q: 'pimiento verde', amount: '1' }, { q: 'cebolla', amount: '1' }, ACEITE, SAL],
    steps: ['Pocha los pimientos y la cebolla en tiras a fuego medio 15 minutos.', 'Haz el atún a la plancha 1 o 2 minutos por cada lado.', 'Sirve el atún sobre los pimientos.']
  },
  {
    id: 'dorada-horno',
    name: 'Dorada al horno con patata y cebolla',
    slot: 'ambas',
    tags: ['pescado'],
    time: 35,
    kids: true,
    ingredients: [{ q: 'dorada', amount: '2 piezas' }, { q: 'patata', amount: '3' }, { q: 'cebolla', amount: '1' }, { q: 'limón', amount: '1' }, ACEITE, SAL],
    steps: ['Hornea las patatas y la cebolla en rodajas a 200 °C 20 minutos.', 'Pon encima las doradas con sal, aceite y limón.', 'Hornea 15 minutos más.']
  },
  {
    id: 'sepia-plancha',
    name: 'Sepia a la plancha con ajo y perejil',
    slot: 'cena',
    tags: ['pescado'],
    time: 15,
    kids: false,
    ingredients: [{ q: 'sepia limpia', amount: '500 g' }, { q: 'ajo', amount: '2 dientes' }, { q: 'perejil', amount: 'un poco', basic: true }, { q: 'lechuga', amount: '1' }, { q: 'limón', amount: '1' }, ACEITE, SAL],
    steps: ['Corta la sepia en tiras y hazla a la plancha muy caliente 4 minutos.', 'Añade ajo y perejil picados con un chorro de aceite.', 'Sirve con ensalada y limón.']
  },
  {
    id: 'boquerones-horno',
    name: 'Boquerones al horno',
    slot: 'cena',
    tags: ['pescado'],
    time: 20,
    kids: false,
    season: [4, 5, 6, 7, 8, 9],
    ingredients: [{ q: 'boquerones', amount: '500 g' }, { q: 'ajo', amount: '2 dientes' }, { q: 'perejil', amount: 'un poco', basic: true }, { q: 'limón', amount: '1' }, { q: 'tomate', amount: '2' }, ACEITE, SAL],
    steps: ['Pon los boquerones abiertos en una bandeja con ajo, perejil, sal y aceite.', 'Hornea a 200 °C 8 minutos.', 'Sirve con limón y tomate aliñado.']
  },
  {
    id: 'pescadilla-horno',
    name: 'Pescadilla al horno con tomate',
    slot: 'cena',
    tags: ['pescado'],
    time: 20,
    kids: false,
    ingredients: [{ q: 'pescadilla de merluza', amount: '1 paquete' }, { q: 'tomate', amount: '3' }, { q: 'cebolla', amount: '1' }, { q: 'orégano', amount: 'una pizca', basic: true }, ACEITE, SAL],
    steps: ['Pon tomate y cebolla en rodajas en una bandeja.', 'Coloca encima la pescadilla descongelada con sal, orégano y aceite.', 'Hornea a 200 °C 15 minutos.']
  },
  {
    id: 'calabacin-relleno-atun',
    name: 'Calabacines rellenos de atún',
    slot: 'cena',
    tags: ['pescado', 'verdura'],
    time: 30,
    kids: true,
    ingredients: [{ q: 'calabacín', amount: '3' }, { q: 'atún al natural', amount: '3 latas' }, { q: 'tomate frito', amount: '150 g' }, { q: 'cebolla', amount: '1' }, { q: 'queso rallado', amount: '60 g' }, ACEITE, SAL],
    steps: ['Parte los calabacines a lo largo y vacíalos con una cuchara.', 'Sofríe la cebolla con la pulpa picada y mezcla con atún y tomate.', 'Rellena, cubre con queso y hornea a 200 °C 15 minutos.']
  },
  {
    id: 'pasta-atun-tomate',
    name: 'Macarrones con atún y tomate',
    slot: 'comida',
    tags: ['pasta', 'pescado'],
    time: 20,
    kids: true,
    ingredients: [{ q: 'macarrón', amount: '300 g' }, { q: 'tomate triturado', amount: '400 g' }, { q: 'atún al natural', amount: '3 latas' }, { q: 'cebolla', amount: '1' }, { q: 'orégano', amount: 'una pizca', basic: true }, ACEITE, SAL],
    steps: ['Cuece la pasta según el paquete.', 'Sofríe la cebolla picada, añade el tomate y el orégano y cuece 10 minutos.', 'Mezcla la salsa con el atún escurrido y la pasta.']
  },
  {
    id: 'ensalada-pasta-atun',
    name: 'Ensalada de pasta con atún',
    slot: 'ambas',
    tags: ['pasta', 'pescado', 'verdura'],
    time: 15,
    kids: true,
    season: [5, 6, 7, 8, 9],
    ingredients: [{ q: 'hélices', amount: '250 g' }, { q: 'atún al natural', amount: '2 latas' }, { q: 'tomate cherry', amount: '200 g' }, { q: 'maíz dulce', amount: '1 lata' }, { q: 'aceitunas', amount: 'un puñado' }, ACEITE, SAL],
    steps: ['Cuece la pasta, escúrrela y enfríala con agua.', 'Mezcla con el atún, los tomates partidos, el maíz y las aceitunas.', 'Aliña con aceite y sal.']
  },

  // ---------- Huevo ----------
  {
    id: 'tortilla-patata',
    name: 'Tortilla de patata',
    slot: 'cena',
    tags: ['huevo'],
    time: 35,
    kids: true,
    ingredients: [{ q: 'huevos', amount: '6' }, { q: 'patata', amount: '4' }, { q: 'cebolla', amount: '1' }, { q: 'aceite de oliva', amount: 'para freír', basic: true }, SAL],
    steps: ['Corta la patata y la cebolla en láminas finas y fríelas a fuego medio 20 minutos.', 'Escúrrelas y mézclalas con los huevos batidos y sal.', 'Cuaja en la sartén 3 minutos por cada lado.']
  },
  {
    id: 'tortilla-calabacin',
    name: 'Tortilla de calabacín',
    slot: 'cena',
    tags: ['huevo', 'verdura'],
    time: 20,
    kids: true,
    ingredients: [{ q: 'huevos', amount: '5' }, { q: 'calabacín', amount: '2' }, { q: 'cebolla', amount: '1' }, ACEITE, SAL],
    steps: ['Pocha la cebolla y el calabacín en dados 10 minutos.', 'Mezcla con los huevos batidos y sal.', 'Cuaja la tortilla por los dos lados.']
  },
  {
    id: 'tortilla-francesa-ensalada',
    name: 'Tortilla francesa con ensalada',
    slot: 'cena',
    tags: ['huevo', 'verdura'],
    time: 10,
    kids: true,
    ingredients: [{ q: 'huevos', amount: '5' }, { q: 'lechuga', amount: '1' }, { q: 'tomate', amount: '2' }, { q: 'pepino', amount: '1' }, ACEITE, SAL],
    steps: ['Prepara una ensalada con la lechuga, el tomate y el pepino.', 'Haz las tortillas francesas de dos en dos huevos.', 'Sirve juntas.']
  },
  {
    id: 'revuelto-esparragos',
    name: 'Revuelto de espárragos trigueros',
    slot: 'cena',
    tags: ['huevo', 'verdura'],
    time: 15,
    kids: false,
    season: [3, 4, 5, 6],
    ingredients: [{ q: 'espárragos verdes', amount: '1 manojo' }, { q: 'huevos', amount: '5' }, { q: 'ajo', amount: '1 diente' }, { q: 'pan', amount: 'para acompañar' }, ACEITE, SAL],
    steps: ['Corta los espárragos en trozos y saltéalos con el ajo 6 minutos.', 'Añade los huevos batidos con sal.', 'Remueve a fuego suave hasta que cuajen jugosos.']
  },
  {
    id: 'huevos-pisto',
    name: 'Huevos con pisto',
    slot: 'cena',
    tags: ['huevo', 'verdura'],
    time: 35,
    kids: true,
    season: [6, 7, 8, 9, 10],
    ingredients: [{ q: 'calabacín', amount: '1' }, { q: 'berenjena', amount: '1' }, { q: 'pimiento rojo', amount: '1' }, { q: 'pimiento verde', amount: '1' }, { q: 'cebolla', amount: '1' }, { q: 'tomate triturado', amount: '400 g' }, { q: 'huevos', amount: '3' }, ACEITE, SAL],
    steps: ['Pica todas las verduras en dados.', 'Pocha la cebolla y los pimientos 10 minutos, añade la berenjena y el calabacín y luego el tomate.', 'Cuece 15 minutos.', 'Haz huecos, casca los huevos y tapa hasta que cuajen.']
  },
  {
    id: 'huevos-rellenos',
    name: 'Huevos rellenos de atún',
    slot: 'cena',
    tags: ['huevo', 'pescado'],
    time: 20,
    kids: true,
    season: [5, 6, 7, 8, 9],
    ingredients: [{ q: 'huevos', amount: '6' }, { q: 'atún al natural', amount: '2 latas' }, { q: 'tomate frito', amount: '3 cucharadas' }, { q: 'lechuga', amount: '1' }],
    steps: ['Cuece los huevos 10 minutos, enfríalos y pártelos por la mitad.', 'Mezcla las yemas con el atún y el tomate.', 'Rellena las claras y sirve sobre lechuga.']
  },

  // ---------- Verdura ----------
  {
    id: 'crema-calabacin',
    name: 'Crema de calabacín',
    slot: 'cena',
    tags: ['verdura'],
    time: 25,
    kids: true,
    ingredients: [{ q: 'calabacín', amount: '3' }, { q: 'patata', amount: '1' }, { q: 'cebolla', amount: '1' }, { q: 'queso en porciones', amount: '3' }, ACEITE, SAL],
    steps: ['Sofríe la cebolla picada.', 'Añade el calabacín y la patata en trozos y cubre de agua.', 'Cuece 15 minutos y tritura con los quesitos.']
  },
  {
    id: 'crema-calabaza',
    name: 'Crema de calabaza y zanahoria',
    slot: 'cena',
    tags: ['verdura'],
    time: 30,
    kids: true,
    season: [9, 10, 11, 12, 1, 2],
    ingredients: [{ q: 'calabaza', amount: '600 g' }, { q: 'zanahoria', amount: '2' }, { q: 'cebolla', amount: '1' }, { q: 'patata', amount: '1' }, ACEITE, SAL],
    steps: ['Sofríe la cebolla picada.', 'Añade la calabaza, la zanahoria y la patata en trozos y cubre de agua.', 'Cuece 20 minutos y tritura.']
  },
  {
    id: 'crema-verduras',
    name: 'Crema de verduras',
    slot: 'cena',
    tags: ['verdura'],
    time: 30,
    kids: true,
    ingredients: [{ q: 'puerro', amount: '2' }, { q: 'zanahoria', amount: '2' }, { q: 'calabacín', amount: '1' }, { q: 'patata', amount: '1' }, { q: 'judía verde', amount: '150 g' }, ACEITE, SAL],
    steps: ['Pocha el puerro.', 'Añade el resto de verduras en trozos y cubre de agua.', 'Cuece 20 minutos y tritura.']
  },
  {
    id: 'pisto',
    name: 'Pisto con pan tostado',
    slot: 'cena',
    tags: ['verdura'],
    time: 35,
    kids: true,
    season: [6, 7, 8, 9, 10],
    ingredients: [{ q: 'calabacín', amount: '1' }, { q: 'berenjena', amount: '1' }, { q: 'pimiento rojo', amount: '1' }, { q: 'pimiento verde', amount: '1' }, { q: 'cebolla', amount: '1' }, { q: 'tomate triturado', amount: '400 g' }, { q: 'pan', amount: 'para tostar' }, ACEITE, SAL],
    steps: ['Pica las verduras en dados.', 'Pocha la cebolla y los pimientos, añade la berenjena y el calabacín.', 'Añade el tomate y cuece 15 minutos. Sirve con pan tostado.']
  },
  {
    id: 'espinacas-catalana',
    name: 'Espinacas a la catalana',
    slot: 'ambas',
    tags: ['verdura'],
    time: 15,
    kids: false,
    season: [10, 11, 12, 1, 2, 3, 4],
    ingredients: [{ q: 'espinacas baby', amount: '500 g' }, { q: 'pasas', amount: '40 g' }, { q: 'piñones', amount: '30 g' }, { q: 'ajo', amount: '1 diente' }, ACEITE, SAL],
    steps: ['Hidrata las pasas en agua caliente 5 minutos.', 'Dora el ajo y los piñones en aceite.', 'Añade las espinacas y las pasas y saltea hasta que se reduzcan.']
  },
  {
    id: 'escalivada',
    name: 'Escalivada con bonito',
    slot: 'cena',
    tags: ['verdura', 'pescado'],
    time: 50,
    kids: false,
    season: [6, 7, 8, 9, 10],
    ingredients: [{ q: 'berenjena', amount: '2' }, { q: 'pimiento rojo', amount: '2' }, { q: 'cebolla', amount: '2' }, { q: 'bonito del norte en aceite de oliva', amount: '1 lata' }, { q: 'pan de payés', amount: 'para acompañar' }, ACEITE, SAL],
    steps: ['Asa las verduras enteras en el horno a 200 °C unos 45 minutos.', 'Déjalas templar, pélalas y córtalas en tiras.', 'Aliña con aceite y sal y sirve con el bonito y pan.']
  },
  {
    id: 'judias-patata',
    name: 'Judías verdes con patata',
    slot: 'cena',
    tags: ['verdura'],
    time: 25,
    kids: true,
    ingredients: [{ q: 'judía verde', amount: '500 g' }, { q: 'patata', amount: '2' }, { q: 'ajo', amount: '2 dientes' }, { q: 'pimentón dulce', amount: 'una pizca', basic: true }, ACEITE, SAL],
    steps: ['Cuece las judías y la patata en trozos 15 minutos.', 'Escúrrelas.', 'Saltéalas con ajo laminado y una pizca de pimentón.']
  },
  {
    id: 'coliflor-gratinada',
    name: 'Coliflor gratinada',
    slot: 'cena',
    tags: ['verdura'],
    time: 30,
    kids: true,
    season: [10, 11, 12, 1, 2, 3],
    ingredients: [{ q: 'coliflor', amount: '1' }, { q: 'leche semidesnatada', amount: '400 ml' }, { q: 'harina de trigo', amount: '2 cucharadas', basic: true }, { q: 'queso rallado', amount: '80 g' }, { q: 'nuez moscada', amount: 'una pizca', basic: true }, ACEITE, SAL],
    steps: ['Cuece la coliflor en ramilletes 10 minutos.', 'Haz una bechamel ligera con aceite, harina y leche.', 'Cubre la coliflor con la bechamel y el queso y gratina 10 minutos.']
  },
  {
    id: 'brocoli-ajo',
    name: 'Brócoli salteado con ajo y huevo cocido',
    slot: 'cena',
    tags: ['verdura', 'huevo'],
    time: 15,
    kids: false,
    season: [10, 11, 12, 1, 2, 3],
    ingredients: [{ q: 'brócoli', amount: '1' }, { q: 'ajo', amount: '2 dientes' }, { q: 'huevos', amount: '3' }, ACEITE, SAL],
    steps: ['Cuece los huevos 10 minutos.', 'Cuece el brócoli en ramilletes 4 minutos.', 'Saltéalo con el ajo laminado y sirve con el huevo en cuartos.']
  },
  {
    id: 'gazpacho',
    name: 'Gazpacho con huevo y jamón',
    slot: 'ambas',
    tags: ['verdura'],
    time: 15,
    kids: true,
    season: [6, 7, 8, 9],
    ingredients: [{ q: 'tomate pera', amount: '1 kg' }, { q: 'pepino', amount: '1' }, { q: 'pimiento verde', amount: '1' }, { q: 'ajo', amount: '1 diente' }, { q: 'vinagre de jerez', amount: 'un chorro', basic: true }, { q: 'huevos', amount: '2' }, { q: 'taquitos de jamón', amount: '1 paquete' }, ACEITE, SAL],
    steps: ['Tritura el tomate, el pepino, el pimiento y el ajo.', 'Añade aceite, vinagre y sal y vuelve a triturar.', 'Enfría y sirve con huevo cocido y taquitos de jamón.']
  },
  {
    id: 'salmorejo',
    name: 'Salmorejo',
    slot: 'ambas',
    tags: ['verdura'],
    time: 15,
    kids: true,
    season: [6, 7, 8, 9],
    ingredients: [{ q: 'tomate pera', amount: '1 kg' }, { q: 'barra de pan', amount: '150 g' }, { q: 'ajo', amount: '1 diente' }, { q: 'huevos', amount: '2' }, { q: 'taquitos de jamón', amount: '1 paquete' }, ACEITE, SAL],
    steps: ['Tritura el tomate con el ajo.', 'Añade el pan troceado y aceite y tritura hasta que quede espeso.', 'Sirve frío con huevo cocido y jamón.']
  },
  {
    id: 'verduras-horno',
    name: 'Verduras al horno con pollo',
    slot: 'ambas',
    tags: ['verdura', 'carne'],
    time: 40,
    kids: true,
    ingredients: [{ q: 'contramuslo de pollo', amount: '6' }, { q: 'patata', amount: '2' }, { q: 'zanahoria', amount: '2' }, { q: 'pimiento rojo', amount: '1' }, { q: 'cebolla', amount: '1' }, { q: 'calabacín', amount: '1' }, { q: 'romero', amount: 'una pizca', basic: true }, ACEITE, SAL],
    steps: ['Corta las verduras en trozos grandes.', 'Ponlas en una bandeja con el pollo, aceite, sal y romero.', 'Hornea a 200 °C 35 minutos dándoles la vuelta a mitad.']
  },
  {
    id: 'menestra',
    name: 'Menestra de verduras',
    slot: 'ambas',
    tags: ['verdura'],
    time: 25,
    kids: false,
    season: [3, 4, 5],
    ingredients: [{ q: 'menestra congelada', amount: '1 bolsa' }, { q: 'alcachofa', amount: '3' }, { q: 'cebolla', amount: '1' }, { q: 'taquitos de jamón', amount: '1 paquete' }, ACEITE, SAL],
    steps: ['Cuece la menestra y las alcachofas limpias según el paquete.', 'Sofríe la cebolla con el jamón.', 'Añade las verduras escurridas y saltea 3 minutos.']
  },
  {
    id: 'berenjenas-rellenas',
    name: 'Berenjenas rellenas de carne y verdura',
    slot: 'comida',
    tags: ['verdura', 'carne'],
    time: 45,
    kids: true,
    season: [6, 7, 8, 9, 10],
    ingredients: [{ q: 'berenjena', amount: '3' }, { q: 'carne picada de pollo', amount: '300 g' }, { q: 'cebolla', amount: '1' }, { q: 'tomate frito', amount: '200 g' }, { q: 'queso rallado', amount: '60 g' }, ACEITE, SAL],
    steps: ['Parte las berenjenas por la mitad y hornéalas 20 minutos a 200 °C.', 'Vacíalas y sofríe la pulpa con la cebolla y la carne.', 'Añade el tomate, rellena, pon queso y gratina 10 minutos.']
  },
  {
    id: 'ensalada-completa',
    name: 'Ensalada completa',
    slot: 'cena',
    tags: ['verdura', 'pescado', 'huevo'],
    time: 15,
    kids: true,
    ingredients: [{ q: 'lechuga', amount: '1' }, { q: 'tomate', amount: '2' }, { q: 'zanahoria', amount: '1' }, { q: 'maíz dulce', amount: '1 lata' }, { q: 'atún al natural', amount: '2 latas' }, { q: 'huevos', amount: '3' }, ACEITE, SAL],
    steps: ['Cuece los huevos 10 minutos.', 'Corta las verduras y ralla la zanahoria.', 'Mezcla con el maíz, el atún y el huevo y aliña.']
  },

  // ---------- Arroz y pasta ----------
  {
    id: 'paella-verduras',
    name: 'Paella de verduras',
    slot: 'comida',
    tags: ['arroz', 'verdura'],
    time: 40,
    kids: true,
    ingredients: [{ q: 'arroz redondo', amount: '300 g' }, { q: 'judía verde', amount: '150 g' }, { q: 'alcachofa', amount: '3' }, { q: 'pimiento rojo', amount: '1' }, { q: 'tomate triturado', amount: '150 g' }, { q: 'caldo de verduras', amount: '1 l' }, { q: 'colorante alimentario', amount: 'una pizca', basic: true }, ACEITE, SAL],
    steps: ['Sofríe las verduras troceadas 10 minutos en la paellera.', 'Añade el tomate y el arroz y remueve.', 'Echa el caldo caliente con el colorante y cuece 18 minutos sin remover.', 'Deja reposar 5 minutos tapada con un paño.']
  },
  {
    id: 'arroz-pollo',
    name: 'Arroz con pollo y verduras',
    slot: 'comida',
    tags: ['arroz', 'carne', 'verdura'],
    time: 40,
    kids: true,
    ingredients: [{ q: 'muslo de pollo', amount: '600 g' }, { q: 'arroz redondo', amount: '300 g' }, { q: 'pimiento rojo', amount: '1' }, { q: 'guisantes', amount: '150 g' }, { q: 'tomate triturado', amount: '150 g' }, { q: 'caldo de pollo', amount: '1 l' }, ACEITE, SAL],
    steps: ['Dora el pollo troceado con sal.', 'Añade el pimiento y el tomate y sofríe 5 minutos.', 'Echa el arroz, los guisantes y el caldo caliente.', 'Cuece 18 minutos y deja reposar.']
  },
  {
    id: 'arroz-cubana',
    name: 'Arroz a la cubana',
    slot: 'ambas',
    tags: ['arroz', 'huevo'],
    time: 25,
    kids: true,
    ingredients: [{ q: 'arroz redondo', amount: '250 g' }, { q: 'tomate frito', amount: '300 g' }, { q: 'huevos', amount: '3' }, { q: 'plátano de canarias', amount: '3' }, { q: 'ajo', amount: '1 diente' }, ACEITE, SAL],
    steps: ['Cuece el arroz 18 minutos con el ajo y sal.', 'Calienta el tomate.', 'Fríe los huevos y los plátanos partidos a lo largo.', 'Sirve el arroz con el tomate, el huevo y el plátano.']
  },
  {
    id: 'arroz-verduras-salteado',
    name: 'Arroz salteado con verduras y huevo',
    slot: 'cena',
    tags: ['arroz', 'verdura', 'huevo'],
    time: 25,
    kids: true,
    ingredients: [{ q: 'arroz largo', amount: '250 g' }, { q: 'zanahoria', amount: '2' }, { q: 'guisantes', amount: '150 g' }, { q: 'cebollas tiernas', amount: '1' }, { q: 'huevos', amount: '3' }, { q: 'salsa de soja', amount: 'un chorrito', basic: true }, ACEITE],
    steps: ['Cuece el arroz y escúrrelo.', 'Saltea la cebolleta, la zanahoria en dados y los guisantes.', 'Añade el arroz y la soja y saltea 3 minutos.', 'Haz una tortilla, córtala en tiras y mézclala.']
  },
  {
    id: 'espaguetis-verduras',
    name: 'Espaguetis integrales con verduras',
    slot: 'comida',
    tags: ['pasta', 'verdura'],
    time: 25,
    kids: true,
    ingredients: [{ q: 'espaguetis integrales', amount: '300 g' }, { q: 'calabacín', amount: '1' }, { q: 'pimiento rojo', amount: '1' }, { q: 'champiñón', amount: '200 g' }, { q: 'tomate triturado', amount: '400 g' }, { q: 'queso rallado', amount: 'para servir' }, ACEITE, SAL],
    steps: ['Cuece la pasta según el paquete.', 'Saltea las verduras en dados 8 minutos.', 'Añade el tomate y cuece 10 minutos.', 'Mezcla con la pasta y sirve con queso.']
  },
  {
    id: 'macarrones-bolonesa',
    name: 'Macarrones a la boloñesa',
    slot: 'comida',
    tags: ['pasta', 'carne'],
    time: 30,
    kids: true,
    ingredients: [{ q: 'macarrón', amount: '300 g' }, { q: 'carne picada vacuno', amount: '300 g' }, { q: 'tomate triturado', amount: '400 g' }, { q: 'cebolla', amount: '1' }, { q: 'zanahoria', amount: '1' }, { q: 'queso rallado', amount: '60 g' }, ACEITE, SAL],
    steps: ['Cuece la pasta.', 'Sofríe la cebolla y la zanahoria picadas y añade la carne.', 'Echa el tomate y cuece 15 minutos.', 'Mezcla con la pasta y sirve con queso.']
  },
  {
    id: 'pasta-brocoli',
    name: 'Pasta con brócoli y ajo',
    slot: 'comida',
    tags: ['pasta', 'verdura'],
    time: 20,
    kids: false,
    season: [10, 11, 12, 1, 2, 3],
    ingredients: [{ q: 'hélices', amount: '300 g' }, { q: 'brócoli', amount: '1' }, { q: 'ajo', amount: '3 dientes' }, { q: 'queso rallado', amount: '60 g' }, ACEITE, SAL],
    steps: ['Cuece la pasta y el brócoli en ramilletes en la misma olla.', 'Dora el ajo laminado en aceite.', 'Mezcla todo y sirve con queso.']
  },
  {
    id: 'lasana-verduras',
    name: 'Lasaña de verduras',
    slot: 'comida',
    tags: ['pasta', 'verdura'],
    time: 50,
    kids: true,
    ingredients: [{ q: 'placas de lasaña', amount: '12' }, { q: 'calabacín', amount: '1' }, { q: 'berenjena', amount: '1' }, { q: 'cebolla', amount: '1' }, { q: 'tomate frito', amount: '300 g' }, { q: 'bechamel', amount: '500 ml' }, { q: 'queso rallado', amount: '80 g' }, ACEITE, SAL],
    steps: ['Hidrata las placas según el paquete.', 'Sofríe las verduras en dados y añade el tomate.', 'Monta capas de placa, verdura y bechamel.', 'Cubre con queso y hornea a 200 °C 25 minutos.']
  },
  {
    id: 'sopa-fideos',
    name: 'Sopa de fideos con huevo',
    slot: 'cena',
    tags: ['pasta', 'huevo'],
    time: 15,
    kids: true,
    season: [10, 11, 12, 1, 2, 3],
    ingredients: [{ q: 'caldo de pollo', amount: '1,5 l' }, { q: 'fideo', amount: '120 g' }, { q: 'huevos', amount: '2' }],
    steps: ['Cuece los huevos 10 minutos.', 'Calienta el caldo y echa los fideos 4 minutos.', 'Sirve con el huevo picado.']
  },
  {
    id: 'cuscus-verduras',
    name: 'Cuscús con verduras y garbanzos',
    slot: 'ambas',
    tags: ['verdura', 'legumbre'],
    time: 20,
    kids: true,
    ingredients: [{ q: 'cous cous', amount: '250 g' }, { q: 'garbanzo cocido', amount: '1 bote' }, { q: 'calabacín', amount: '1' }, { q: 'zanahoria', amount: '2' }, { q: 'pimiento rojo', amount: '1' }, { q: 'comino molido', amount: 'una pizca', basic: true }, ACEITE, SAL],
    steps: ['Hidrata el cuscús con el mismo volumen de agua caliente y sal 5 minutos.', 'Saltea las verduras en dados con el comino.', 'Añade los garbanzos y mezcla con el cuscús.']
  },
  {
    id: 'pizza-integral-verduras',
    name: 'Pizza casera de verduras',
    slot: 'cena',
    tags: ['verdura'],
    time: 25,
    kids: true,
    ingredients: [{ q: 'masa de pizza', amount: '1' }, { q: 'tomate frito', amount: '150 g' }, { q: 'mozzarella', amount: '1 bolsa' }, { q: 'champiñón', amount: '150 g' }, { q: 'pimiento rojo', amount: '1/2' }, { q: 'cebolla', amount: '1/2' }, { q: 'orégano', amount: 'una pizca', basic: true }],
    steps: ['Extiende la masa y cúbrela con tomate.', 'Pon las verduras en láminas y la mozzarella.', 'Hornea a 220 °C unos 12 minutos y espolvorea orégano.']
  },

  // ---------- Carne (con moderación) ----------
  {
    id: 'pollo-horno-limon',
    name: 'Pollo al horno con patatas y limón',
    slot: 'comida',
    tags: ['carne'],
    time: 50,
    kids: true,
    ingredients: [{ q: 'medio pollo troceado', amount: '2' }, { q: 'patata', amount: '4' }, { q: 'limón', amount: '1' }, { q: 'ajo', amount: '4 dientes' }, { q: 'tomillo', amount: 'una pizca', basic: true }, ACEITE, SAL],
    steps: ['Pon el pollo y las patatas en trozos en una bandeja.', 'Añade ajo, tomillo, zumo de limón, aceite y sal.', 'Hornea a 200 °C 45 minutos dándole la vuelta a mitad.']
  },
  {
    id: 'pechuga-verduras',
    name: 'Pechuga a la plancha con verduras salteadas',
    slot: 'ambas',
    tags: ['carne', 'verdura'],
    time: 20,
    kids: true,
    ingredients: [{ q: 'pechuga de pollo filetes', amount: '500 g' }, { q: 'calabacín', amount: '1' }, { q: 'pimiento rojo', amount: '1' }, { q: 'champiñón', amount: '150 g' }, ACEITE, SAL],
    steps: ['Saltea las verduras en tiras 8 minutos.', 'Haz la pechuga a la plancha con sal 3 minutos por cada lado.', 'Sirve juntas.']
  },
  {
    id: 'pollo-curry',
    name: 'Pollo al curry suave con arroz',
    slot: 'comida',
    tags: ['carne', 'arroz'],
    time: 30,
    kids: true,
    ingredients: [{ q: 'pechuga de pollo', amount: '500 g' }, { q: 'cebolla', amount: '1' }, { q: 'yogur natural', amount: '2' }, { q: 'tomate triturado', amount: '200 g' }, { q: 'curry', amount: '2 cucharaditas', basic: true }, { q: 'arroz basmati aromático', amount: '250 g' }, ACEITE, SAL],
    steps: ['Cuece el arroz.', 'Sofríe la cebolla, añade el pollo en dados y el curry.', 'Añade el tomate y cuece 10 minutos. Fuera del fuego, mezcla el yogur. Sirve con el arroz.']
  },
  {
    id: 'albondigas-tomate',
    name: 'Albóndigas en salsa de tomate',
    slot: 'comida',
    tags: ['carne'],
    time: 40,
    kids: true,
    ingredients: [{ q: 'carne picada vacuno y cerdo', amount: '500 g' }, { q: 'huevos', amount: '1' }, { q: 'pan rallado', amount: '3 cucharadas', basic: true }, { q: 'tomate triturado', amount: '400 g' }, { q: 'cebolla', amount: '1' }, { q: 'guisantes', amount: '150 g' }, ACEITE, SAL],
    steps: ['Mezcla la carne con el huevo, el pan rallado y sal y forma bolitas.', 'Dóralas en una cazuela con aceite y resérvalas.', 'Sofríe la cebolla, añade el tomate y los guisantes.', 'Vuelve a echar las albóndigas y cuece 15 minutos.']
  },
  {
    id: 'lomo-pimientos',
    name: 'Lomo a la plancha con pimientos',
    slot: 'cena',
    tags: ['carne', 'verdura'],
    time: 20,
    kids: true,
    ingredients: [{ q: 'lomo de cerdo filetes', amount: '500 g' }, { q: 'pimiento verde', amount: '2' }, { q: 'pimiento rojo', amount: '1' }, ACEITE, SAL],
    steps: ['Fríe los pimientos en tiras a fuego medio 12 minutos.', 'Haz el lomo a la plancha con sal.', 'Sirve con los pimientos.']
  },
  {
    id: 'pavo-salteado',
    name: 'Pavo salteado con verduras',
    slot: 'cena',
    tags: ['carne', 'verdura'],
    time: 20,
    kids: true,
    ingredients: [{ q: 'filetes pechuga de pavo', amount: '400 g' }, { q: 'brócoli', amount: '1/2' }, { q: 'zanahoria', amount: '2' }, { q: 'cebollas tiernas', amount: '1' }, { q: 'salsa de soja', amount: 'un chorrito', basic: true }, ACEITE],
    steps: ['Corta el pavo en tiras y las verduras en trozos pequeños.', 'Saltea el pavo a fuego fuerte y resérvalo.', 'Saltea las verduras 6 minutos, vuelve a echar el pavo y la soja.']
  },
  {
    id: 'ternera-guisada',
    name: 'Ternera guisada con patatas',
    slot: 'comida',
    tags: ['carne'],
    time: 75,
    kids: true,
    season: [10, 11, 12, 1, 2, 3],
    ingredients: [{ q: 'tacos de vacuno para guisar', amount: '500 g' }, { q: 'patata', amount: '3' }, { q: 'zanahoria', amount: '2' }, { q: 'cebolla', amount: '1' }, { q: 'tomate triturado', amount: '150 g' }, { q: 'hoja de laurel', amount: '1', basic: true }, ACEITE, SAL],
    steps: ['Dora la carne en trozos y resérvala.', 'Sofríe la cebolla y la zanahoria, añade el tomate.', 'Vuelve a echar la carne, el laurel y agua hasta cubrir y cuece 50 minutos.', 'Añade la patata y cuece 20 minutos más.']
  },
  {
    id: 'hamburguesas-pollo',
    name: 'Hamburguesas caseras de pollo con ensalada',
    slot: 'cena',
    tags: ['carne', 'verdura'],
    time: 25,
    kids: true,
    ingredients: [{ q: 'carne picada de pollo', amount: '500 g' }, { q: 'pan de hamburguesa', amount: '3' }, { q: 'lechuga', amount: '1' }, { q: 'tomate', amount: '2' }, { q: 'queso lonchas', amount: '3' }, ACEITE, SAL],
    steps: ['Forma 3 hamburguesas con la carne y sal.', 'Hazlas a la plancha 4 minutos por cada lado.', 'Monta con pan, lechuga, tomate y queso. Sirve con más ensalada.']
  },
  {
    id: 'fajitas-pollo',
    name: 'Fajitas de pollo con verduras',
    slot: 'cena',
    tags: ['carne', 'verdura'],
    time: 20,
    kids: true,
    ingredients: [{ q: 'tortillas de trigo', amount: '1 paquete' }, { q: 'pechuga de pollo', amount: '400 g' }, { q: 'pimiento rojo', amount: '1' }, { q: 'pimiento verde', amount: '1' }, { q: 'cebolla', amount: '1' }, { q: 'tomate', amount: '2' }, { q: 'pimentón dulce', amount: 'una pizca', basic: true }, ACEITE, SAL],
    steps: ['Saltea las verduras en tiras.', 'Añade el pollo en tiras con pimentón y sal hasta que se dore.', 'Calienta las tortillas y rellénalas con tomate picado.']
  },
  {
    id: 'muslos-pollo-verduras',
    name: 'Muslos de pollo guisados con champiñones',
    slot: 'comida',
    tags: ['carne', 'verdura'],
    time: 45,
    kids: true,
    ingredients: [{ q: 'muslo de pollo', amount: '6' }, { q: 'champiñón', amount: '250 g' }, { q: 'cebolla', amount: '1' }, { q: 'zanahoria', amount: '2' }, { q: 'patata', amount: '2' }, ACEITE, SAL],
    steps: ['Dora los muslos con sal.', 'Añade la cebolla, la zanahoria y los champiñones y sofríe 5 minutos.', 'Echa agua hasta la mitad y cuece 25 minutos.', 'Añade la patata en dados y cuece 15 minutos más.']
  }
]

// Las de este archivo más las de recipes-more.js (exprés, divertidas, de temporada…)
const seen = new Set()
export const KB = [...BASE.map((r) => ({ ...r, express: r.time <= 10 })), ...MORE].filter((r) => !seen.has(r.id) && seen.add(r.id))

// Lo que sí es comida de verdad para el filtro 'rápidas'
export const QUICK_MIN = 20
