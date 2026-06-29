// Mock data — Restaurante La Zíngara carta (extracted from www.lazingara.es current ordering system)
// Real dish data with stock + price. Alérgenos, calorías, descripciones, imagen_url will be enriched in design phase.

export interface MockPlato {
  id: string
  nombre: string
  precio: string
  stock?: string
  categoria: string
  // Enrichment fields (mock — to be added in design):
  descripcion?: string
  imagen_url?: string
  alergenos?: string[]
  calorias?: number
}

export interface MockCategoria {
  id: string
  categoria: string
  puesto: number
  open: boolean
  platos: {
    plato: string
    precio: string
    stock: string
    descripcion?: string
    imagen_url?: string
    alergenos?: string[]
    calorias?: number
  }[]
}

export const mockCarta: MockCategoria[] = [
  {
    id: 'CgNhTzUoabASy9QO3Uqf',
    categoria: 'NUESTRAS RECOMENDACIONES',
    puesto: 0,
    open: false,
    platos: [
      { precio: '26', stock: '10', plato: 'ZAMBURIÑAS A LA PLANCHA' },
      { plato: 'GAMBA DE HUELVA PLANCHA', stock: '', precio: '33' },
      { plato: 'GAMBAS AL AJILLO', stock: '10', precio: '24' },
      { stock: '', precio: '22', plato: 'ANCHOAS DE SANTOÑA CON TOMETE' },
      { stock: '', plato: 'MEJILLONES EN SALSA O AL VAPOR', precio: '16,5' },
      { stock: '10', plato: 'BOLETUS CON LASCAS DE FOIE, HUEVO Y CECINA', precio: '22' },
      { plato: 'MORCILLA DE LEÓN', precio: '10', stock: '' },
      { precio: '27', plato: 'PULPO A LA GALLEGA O A LA PARRILLA', stock: '10' },
      { precio: '20', stock: '', plato: 'ENSALADA DE COGOLLOS CON SARDINA AHUMADA Y VINAGRETA DE PIQUILLOS, ALCAPARRAS Y PISTACHOS' },
      { precio: '18', plato: 'AGUACATE RELLENO DE BACALAO Y CEBOLLA ENCURTIDA', stock: '1' },
      { stock: '10', precio: '20', plato: 'ENSALADA DE JAMÓN IBÉRICO Y FRUTA DE TEMPORADA' },
      { plato: 'JAMÓN IBÉRICO DE GUIJUELO', stock: '10', precio: '33' },
      { precio: '8', plato: 'AJO', stock: '' },
      { stock: '', plato: 'ANCAS DE RANA', precio: '33' },
      { plato: 'ARROZ CON BOGAVANTE', stock: '10', precio: '33/Pers.' },
      { stock: '10', plato: 'ARROZ CON CARABINEROS', precio: '37/Pers.' },
      { precio: '', plato: '— CARNES —', stock: '10' },
      { stock: '10', precio: '22', plato: 'LECHAZO ASADO (DOMINGOS Y FESTIVOS)' },
      { stock: '10', precio: '20', plato: 'MOLLEJAS DE TERNERA GUISADAS' },
      { stock: '', plato: 'CHULETÓN MADURADO DE VACA PREMIUM', precio: '75€/kg' },
      { precio: '33', plato: 'PALETILLA DE LECHAZO', stock: '10' },
      { precio: '22', stock: '', plato: 'CHULETILLAS DE LECHAZO' },
      { stock: '10', precio: '26', plato: 'SOLOMILLO AL QUESO DE VALDEÓN O PIMIENTA' },
      { stock: '10', plato: '— PESCADOS —', precio: '' },
      { precio: '22', plato: 'RODABALLO PLANCHA', stock: '' },
      { plato: 'RAPE PLANCHA', stock: '', precio: '24' },
      { precio: '22', plato: 'COGOTE DE MERLUZA', stock: '' },
      { stock: '', precio: '20', plato: 'MERLUZA PLANCHA, CAZUELA O ROMANA' },
      { plato: 'ANCAS DE RANA', precio: '33', stock: '' },
      { precio: '42', stock: '', plato: 'LUBINA AL HORNO (2 PERSONAS)' },
      { plato: 'LOMO DE BACALAO AL AJO ARRIERO Ó A LA PARRILLA', precio: '20', stock: '10' },
      { plato: 'TRUCHA CON ESCABECHE DE VERDURAS', stock: '10', precio: '15,5' },
      { precio: '22', plato: 'CHIPIRONES PLANCHA CON BASE DE CECINA Y REDUCCIÓN DE VINO', stock: '10' },
    ],
  },
  {
    categoria: 'ENSALADAS',
    id: '3QtuOOa5THsfrL7nyQmK',
    open: false,
    puesto: 1,
    platos: [
      { precio: '18', stock: '12', plato: 'ENSALADA ZÍNGARA' },
      { stock: '1', precio: '18', plato: 'AGUACATE RELLENO DE BACALAO Y CEBOLLA ENCURTIDA' },
      { plato: 'ENSALADA DE VENTRESCA DE BONITO', stock: '10', precio: '20' },
      { stock: '', precio: '20', plato: 'ENSALADA DE COGOLLOS CON SARDINA AHUMADA Y VINAGRETA DE PIQUILLOS, ALCAPARRAS Y PISTACHOS' },
      { plato: 'ENSALADA DE JAMÓN IBÉRICO Y FRUTA DE TEMPORADA', precio: '20', stock: '10' },
      { stock: '10', precio: '13', plato: 'ENSALADA MIXTA' },
    ],
  },
  {
    open: false,
    id: 'uKClYAd8QoYWRkriaPD2',
    categoria: 'ENTRANTES CALIENTES',
    puesto: 2,
    platos: [
      { precio: '26', plato: 'ZAMBURIÑAS A LA PLANCHA', stock: '10' },
      { precio: '33', plato: 'GAMBA DE HUELVA PLANCHA', stock: '' },
      { precio: '24', plato: 'GAMBAS AL AJILLO', stock: '10' },
      { plato: 'BOLETUS CON LASCAS DE FOIE, HUEVO Y CECINA', stock: '10', precio: '22' },
      { precio: '27', stock: '10', plato: 'PULPO A LA GALLEGA O A LA PARRILLA' },
      { plato: 'CALAMARES FRESCOS A LA PLANCHA O A LA ROMANA', precio: '15,5', stock: '10' },
      { stock: '', plato: 'MORCILLA DE LEÓN', precio: '10' },
      { stock: '', precio: '8', plato: 'AJO (PLATO PICANTE EXCLUSIVO DE SANTA MARÍA DEL PÁRAMO)' },
      { precio: '13,5', stock: '10', plato: 'ALUBIAS BLANCAS CON ALMEJAS' },
      { plato: 'ANCAS DE RANA', precio: '33', stock: '' },
      { precio: '17,5', stock: '10', plato: 'REVUELTO ZÍNGARA' },
      { stock: '10', precio: '15', plato: 'HUEVOS FRITOS CON PATATAS, JAMÓN Y CHORIZO FRITO' },
      { stock: '10', plato: 'CROQUETAS CASERAS', precio: '15,5' },
      { plato: 'SOPA ZÍNGARA', precio: '13,5', stock: '' },
      { plato: 'SOPAS DE TRUCHAS (MINI 2 PERS.) PRECIO POR PERSONA', precio: '13,5', stock: '10' },
    ],
  },
  {
    id: 'IKEMbKeqTgBhre4v7T8c',
    categoria: 'ENTRANTES FRIOS',
    puesto: 3,
    open: false,
    platos: [
      { plato: 'LENGUA CURADA', precio: '14', stock: '' },
      { precio: '15', plato: 'ENSALADILLA RUSA', stock: '' },
      { stock: '10', precio: '33', plato: 'JAMÓN IBÉRICO DE GUIJUELO' },
      { precio: '20', plato: 'TABLA DE QUESOS', stock: '10' },
      { plato: 'JAMÓN RECEBO DE GUIJUELO', stock: '10', precio: '22' },
      { precio: '22', plato: 'ANCHOAS DE SANTOÑA CON TOMETE', stock: '' },
      { precio: '5', plato: 'PAN CRISTAL', stock: '10' },
      { precio: '20', stock: '10', plato: 'CECINA DE LEÓN CON I.G.P.' },
      { stock: '10', plato: 'TABLA DE EMBUTIDOS', precio: '22' },
      { plato: 'PASTEL DE CABRACHO', stock: '10', precio: '15,5' },
      { stock: '10', precio: '27', plato: 'PULPO A LA GALLEGA O A LA PARRILLA' },
      { stock: '10', precio: '13', plato: 'ESPÁRRAGOS O PUERROS DOS SALSAS' },
      { plato: 'PIMIENTOS DE FRESNO CON VENTRESCA Y ANCHOA', stock: '', precio: '24' },
    ],
  },
  {
    id: 'lhTxJLM96GoddEF8Tv98',
    categoria: 'PESCADOS',
    open: false,
    puesto: 4,
    platos: [
      { stock: '', precio: '22', plato: 'COGOTE DE MERLUZA' },
      { plato: 'RODABALLO PLANCHA', precio: '22', stock: '' },
      { plato: 'RAPE PLANCHA', stock: '', precio: '24' },
      { precio: '20', stock: '', plato: 'MERLUZA PLANCHA, CAZUELA O ROMANA' },
      { stock: '', precio: '33', plato: 'ANCAS DE RANA' },
      { stock: '10', precio: '15,5', plato: 'TRUCHA CON ESCABECHE DE VERDURAS' },
      { stock: '', plato: 'LUBINA AL HORNO (2 PERSONAS)', precio: '42' },
      { precio: '20', stock: '', plato: 'LOMO DE BACALAO AL AJO ARRIERO Ó LA PARRILLA' },
      { stock: '10', plato: 'CHIPIRONES PLANCHA CON BASE DE CECINA Y REDUCCIÓN DE VINO', precio: '22' },
    ],
  },
  {
    categoria: 'ARROCES',
    puesto: 5,
    id: 'mBKK0sApUtwxnO3QOGVn',
    open: false,
    platos: [
      { precio: '33/Pers.', plato: 'ARROZ CON BOGAVANTE', stock: '10' },
      { stock: '10', precio: '37/Pers.', plato: 'ARROZ CON CARABINEROS' },
    ],
  },
  {
    id: 'EbIg0MOX6CMcb4mm38vT',
    categoria: 'CARNES A LA BRASA',
    open: false,
    puesto: 6,
    platos: [
      { stock: '', precio: '22', plato: 'CHULETILLAS DE LECHAZO' },
      { precio: '46', plato: 'PARRILLADA DE CARNE (PARA DOS PERSONAS)', stock: '10' },
      { plato: 'ENTRECOT DE TERNERA', precio: '42/Kg', stock: '10' },
      { stock: '10', precio: '20', plato: 'PRESA IBÉRICA' },
      { stock: '10', plato: 'CHURRASCO DE TERNERA', precio: '15,5' },
      { precio: '15,5', plato: 'COSTILLAS DE CERDO', stock: '10' },
    ],
  },
  {
    categoria: 'CARNES',
    id: 'JaqzeceXI38FylCZwZ8f',
    open: false,
    puesto: 7,
    platos: [
      { precio: '22', stock: '10', plato: 'LECHAZO ASADO (DOMINGOS Y FESTIVOS)' },
      { stock: '', plato: 'CHULETÓN MADURADO DE VACA PREMIUM', precio: '75€/kg' },
      { stock: '10', plato: 'PALETILLA DE LECHAZO', precio: '33' },
      { precio: '31/Kg', stock: '10', plato: 'CHULETA DE TERNERA' },
      { plato: 'CHURRASCO DE TERNERA', precio: '15,5', stock: '10' },
      { precio: '24', plato: 'PIERNA DE LECHAZO ASADA', stock: '10' },
      { stock: '10', plato: 'FILETE DE TERNERA', precio: '13' },
      { precio: '22', stock: '', plato: 'CHULETILLAS DE LECHAZO' },
      { precio: '20', plato: 'MOLLEJAS DE TERNERA A LA PARRILLA', stock: '10' },
      { plato: 'SOLOMILLO AL FOIE', precio: '29', stock: '10' },
      { precio: '26', plato: 'SOLOMILLO AL QUESO DE VALDEÓN O PIMIENTA', stock: '10' },
      { precio: '22', plato: 'ESCALOPINES DE TERNERA REBOZADOS', stock: '10' },
      { plato: 'CARRILLERA DE TERNERA AL MENCÍA', precio: '22', stock: '10' },
      { stock: '10', precio: '20', plato: 'PRESA IBÉRICA' },
      { plato: 'CARRILLERA IBÉRICA AL VERDEJO', precio: '20', stock: '10' },
      { precio: '42/Kg', stock: '10', plato: 'ENTRECOT DE TERNERA' },
      { stock: '10', plato: 'CALDERETA DE CABRITO DE LA MONTAÑA LEONESA', precio: '20' },
      { stock: '10', precio: '20', plato: 'CECINA DE CHIVO' },
      { stock: '10', plato: 'POR ENCARGO POLLOS DE CORRAL', precio: 'CONSULTAR' },
    ],
  },
]