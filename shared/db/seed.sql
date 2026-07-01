-- =============================================================================
-- Restaurante La Zíngara — Seed Data
-- Generated from shared/fixtures/*-mock.ts
-- Idempotent: safe to re-run (ON CONFLICT DO NOTHING)
-- =============================================================================

BEGIN;

-- =============================================================================
-- PLATOS
-- =============================================================================

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-zamburi-as-a-la-plancha'::uuid,
  'ZAMBURIÑAS A LA PLANCHA',
  'Zamburiñas frescas a la plancha con ajo, perejil y un toque de limón. Servidas en su concha.',
  26.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800',
  true,
  195,
  ARRAY['mariscos'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-gamba-de-huelva-plancha'::uuid,
  'GAMBA DE HUELVA PLANCHA',
  'Gamba de Huelva a la plancha con sal gorda. Sabor intenso del Atlántico.',
  33.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1625943553852-781c6dd46faa?w=800',
  false,
  210,
  ARRAY['mariscos'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-gambas-al-ajillo'::uuid,
  'GAMBAS AL AJILLO',
  'Gambas salteadas en aceite de oliva con láminas de ajo y guindilla.',
  24.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1559304822-9e65c54f5a5c?w=800',
  true,
  310,
  ARRAY['mariscos'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-anchoas-de-santo-a-con-tomete'::uuid,
  'ANCHOAS DE SANTOÑA CON TOMETE',
  'Anchoas de Santoña sobre pan cristal con tomate rallado y escamas de sal.',
  22.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1565895405138-6c3a1555da6a?w=800',
  false,
  275,
  ARRAY['gluten'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-mejillones-en-salsa-o-al-vapor'::uuid,
  'MEJILLONES EN SALSA O AL VAPOR',
  'Mejillones frescos al vapor con laurel o en salsa marinera. Ración generosa.',
  16.50::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1605103401418-313c040223cd?w=800',
  false,
  260,
  ARRAY['mariscos'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-boletus-con-lascas-de-foie-huevo-y-cecina'::uuid,
  'BOLETUS CON LASCAS DE FOIE, HUEVO Y CECINA',
  'Boletus salteados coronados con huevo frito, lascas de foie y virutas de cecina.',
  22.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1460306855393-0410f61241c7?w=800',
  true,
  420,
  ARRAY['huevo'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-morcilla-de-le-n'::uuid,
  'MORCILLA DE LEÓN',
  'Morcilla de León con cebolla caramelizada y pimientos asados.',
  10.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
  false,
  340,
  ARRAY[]::text[],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-pulpo-a-la-gallega-o-a-la-parrilla'::uuid,
  'PULPO A LA GALLEGA O A LA PARRILLA',
  'Pulpo cocido con pimentón de la Vera, aceite de oliva y patata gallega o marcado a la parrilla.',
  27.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1622843885830-d964f1658a5a?w=800',
  true,
  250,
  ARRAY['mariscos'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-ensalada-de-cogollos-con-sardina-ahumada-y-vinagreta-de-piquillos-alcaparras-y-pistachos'::uuid,
  'ENSALADA DE COGOLLOS CON SARDINA AHUMADA Y VINAGRETA DE PIQUILLOS, ALCAPARRAS Y PISTACHOS',
  'Cogollos frescos con sardina ahumada y vinagreta de piquillos, alcaparras y pistachos.',
  20.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  false,
  310,
  ARRAY['frutos-secos','lactosa'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-aguacate-relleno-de-bacalao-y-cebolla-encurtida'::uuid,
  'AGUACATE RELLENO DE BACALAO Y CEBOLLA ENCURTIDA',
  'Medio aguacate relleno de bacalao desmigado con cebolla encurtida y toque cítrico.',
  18.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1603569283847-aa295f0d0fd5?w=800',
  true,
  380,
  ARRAY[]::text[],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-ensalada-de-jam-n-ib-rico-y-fruta-de-temporada'::uuid,
  'ENSALADA DE JAMÓN IBÉRICO Y FRUTA DE TEMPORADA',
  'Mezclum de lechugas con jamón ibérico, fruta de temporada, frutos secos y vinagreta de Módena.',
  20.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
  true,
  290,
  ARRAY['frutos-secos'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-jam-n-ib-rico-de-guijuelo'::uuid,
  'JAMÓN IBÉRICO DE GUIJUELO',
  'Jamón ibérico de bellota 100% de Guijuelo, cortado a cuchillo. Ración con pan de cristal.',
  33.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
  true,
  410,
  ARRAY['gluten'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-ajo'::uuid,
  'AJO',
  'Plato picante tradicional de Santa María del Páramo. Patatas, pimentón, ajo y laurel.',
  8.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1548940740-204726a19be3?w=800',
  false,
  350,
  ARRAY[]::text[],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-ancas-de-rana'::uuid,
  'ANCAS DE RANA',
  'Ancas de rana frescas rebozadas y fritas. Tradición leonesa servida con limón.',
  33.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800',
  false,
  380,
  ARRAY['gluten','huevo'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-arroz-con-bogavante'::uuid,
  'ARROZ CON BOGAVANTE',
  'Arroz meloso con bogavante, fumet de marisco y verduras. Precio por persona.',
  33.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800',
  true,
  520,
  ARRAY['mariscos'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-arroz-con-carabineros'::uuid,
  'ARROZ CON CARABINEROS',
  'Arroz seco con carabineros rojos y alioli suave. Sabor intenso. Precio por persona.',
  37.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1594221708779-94832f4320d1?w=800',
  true,
  560,
  ARRAY['mariscos','huevo'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-lechazo-asado-domingos-y-festivos'::uuid,
  'LECHAZO ASADO (DOMINGOS Y FESTIVOS)',
  'Lechazo asado en horno de leña con patatas panadera. Solamente domingos y festivos.',
  22.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
  true,
  680,
  ARRAY[]::text[],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-mollejas-de-ternera-guisadas'::uuid,
  'MOLLEJAS DE TERNERA GUISADAS',
  'Mollejas de ternera guisadas lentamente con vino blanco, ajo y hierbas aromáticas.',
  20.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
  true,
  450,
  ARRAY[]::text[],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-chulet-n-madurado-de-vaca-premium'::uuid,
  'CHULETÓN MADURADO DE VACA PREMIUM',
  'Chuletón de vaca madurado 45 días. A la parrilla con sal Maldon. Peso variable, precio por kg.',
  75.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=800',
  false,
  820,
  ARRAY[]::text[],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-paletilla-de-lechazo'::uuid,
  'PALETILLA DE LECHAZO',
  'Paletilla de lechazo lechal asada al horno. Jugosa y tierna.',
  33.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
  true,
  590,
  ARRAY[]::text[],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-chuletillas-de-lechazo'::uuid,
  'CHULETILLAS DE LECHAZO',
  'Chuletillas de lechazo a la parrilla con sal gorda y patatas fritas.',
  22.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800',
  false,
  550,
  ARRAY[]::text[],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-solomillo-al-queso-de-valde-n-o-pimienta'::uuid,
  'SOLOMILLO AL QUESO DE VALDEÓN O PIMIENTA',
  'Solomillo de ternera al punto con salsa de queso de Valdeón o pimienta verde.',
  26.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800',
  true,
  610,
  ARRAY['lactosa'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-rodaballo-plancha'::uuid,
  'RODABALLO PLANCHA',
  'Rodaballo fresco a la plancha con guarnición de verduritas y patata cocida.',
  22.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1601314002592-b8734bca6604?w=800',
  false,
  280,
  ARRAY[]::text[],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-rape-plancha'::uuid,
  'RAPE PLANCHA',
  'Lomos de rape a la plancha con refrito de ajos y almendras laminadas.',
  24.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1534604973900-c43ab4c2e0ab?w=800',
  false,
  260,
  ARRAY['frutos-secos'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-cogote-de-merluza'::uuid,
  'COGOTE DE MERLUZA',
  'Cogote de merluza al horno con salsa verde y almejas.',
  22.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1559742811-822f03b0d23f?w=800',
  false,
  340,
  ARRAY['mariscos'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-merluza-plancha-cazuela-o-romana'::uuid,
  'MERLUZA PLANCHA, CAZUELA O ROMANA',
  'Merluza fresca a elegir: plancha, en cazuela o rebozada a la romana.',
  20.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1580476262798-bddd9f4b7369?w=800',
  false,
  310,
  ARRAY['gluten'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-lubina-al-horno-2-personas'::uuid,
  'LUBINA AL HORNO (2 PERSONAS)',
  'Lubina salvaje al horno con patatas y verduras. Ración para dos personas.',
  42.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
  false,
  380,
  ARRAY[]::text[],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-lomo-de-bacalao-al-ajo-arriero-la-parrilla'::uuid,
  'LOMO DE BACALAO AL AJO ARRIERO Ó LA PARRILLA',
  'Lomo de bacalao al ajo arriero con pimientos asados o a la parrilla con verduras.',
  20.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1594221624649-46c2bba0c2e3?w=800',
  true,
  350,
  ARRAY[]::text[],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-trucha-con-escabeche-de-verduras'::uuid,
  'TRUCHA CON ESCABECHE DE VERDURAS',
  'Trucha de río con escabeche suave de verduras y hierbas.',
  15.50::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=800',
  true,
  290,
  ARRAY[]::text[],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-chipirones-plancha-con-base-de-cecina-y-reducci-n-de-vino'::uuid,
  'CHIPIRONES PLANCHA CON BASE DE CECINA Y REDUCCIÓN DE VINO',
  'Chipirones a la plancha sobre cama de cecina con reducción de vino tinto.',
  22.00::numeric,
  'NUESTRAS RECOMENDACIONES',
  'carta',
  'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800',
  true,
  330,
  ARRAY['mariscos'],
  0,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-ensalada-z-ngara'::uuid,
  'ENSALADA ZÍNGARA',
  'Mezcla de lechugas con queso de cabra, nueces, pasas y vinagreta de miel.',
  18.00::numeric,
  'ENSALADAS',
  'carta',
  'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=800',
  true,
  340,
  ARRAY['lactosa','frutos-secos'],
  1,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-ensalada-de-ventresca-de-bonito'::uuid,
  'ENSALADA DE VENTRESCA DE BONITO',
  'Ventresca de bonito del norte con pimientos asados, cebolleta y aceitunas.',
  20.00::numeric,
  'ENSALADAS',
  'carta',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  true,
  360,
  ARRAY[]::text[],
  1,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-ensalada-mixta'::uuid,
  'ENSALADA MIXTA',
  'Lechuga, tomate, cebolla, atún, espárragos y aceitunas.',
  13.00::numeric,
  'ENSALADAS',
  'carta',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800',
  true,
  220,
  ARRAY[]::text[],
  1,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-calamares-frescos-a-la-plancha-o-a-la-romana'::uuid,
  'CALAMARES FRESCOS A LA PLANCHA O A LA ROMANA',
  'Calamares frescos a la plancha con ajo y perejil o rebozados a la romana.',
  15.50::numeric,
  'ENTRANTES CALIENTES',
  'carta',
  'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800',
  true,
  340,
  ARRAY['gluten'],
  2,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-ajo-plato-picante-exclusivo-de-santa-mar-a-del-p-ramo'::uuid,
  'AJO (PLATO PICANTE EXCLUSIVO DE SANTA MARÍA DEL PÁRAMO)',
  'Plato picante tradicional con patatas, ajo y pimentón.',
  8.00::numeric,
  'ENTRANTES CALIENTES',
  'carta',
  'https://images.unsplash.com/photo-1548940740-204726a19be3?w=800',
  false,
  350,
  ARRAY[]::text[],
  2,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-alubias-blancas-con-almejas'::uuid,
  'ALUBIAS BLANCAS CON ALMEJAS',
  'Alubias blancas estofadas con almejas frescas y verduritas.',
  13.50::numeric,
  'ENTRANTES CALIENTES',
  'carta',
  'https://images.unsplash.com/photo-1604909052743-94e838986d24?w=800',
  true,
  380,
  ARRAY['mariscos'],
  2,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-revuelto-z-ngara'::uuid,
  'REVUELTO ZÍNGARA',
  'Huevos revueltos con gulas, gambas y setas de temporada.',
  17.50::numeric,
  'ENTRANTES CALIENTES',
  'carta',
  'https://images.unsplash.com/photo-1558730234-d8b2281b0d00?w=800',
  true,
  390,
  ARRAY['huevo','mariscos'],
  2,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-huevos-fritos-con-patatas-jam-n-y-chorizo-frito'::uuid,
  'HUEVOS FRITOS CON PATATAS, JAMÓN Y CHORIZO FRITO',
  'Huevos fritos con puntilla sobre patatas panadera, jamón y chorizo.',
  15.00::numeric,
  'ENTRANTES CALIENTES',
  'carta',
  'https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800',
  true,
  580,
  ARRAY['huevo'],
  2,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-croquetas-caseras'::uuid,
  'CROQUETAS CASERAS',
  'Croquetas cremosas de jamón ibérico y pollo. Salsa brava.',
  15.50::numeric,
  'ENTRANTES CALIENTES',
  'carta',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
  true,
  420,
  ARRAY['gluten','lactosa','huevo'],
  2,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-sopa-z-ngara'::uuid,
  'SOPA ZÍNGARA',
  'Sopa tradicional con pan, ajo, pimentón y huevo escalfado.',
  13.50::numeric,
  'ENTRANTES CALIENTES',
  'carta',
  'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
  false,
  310,
  ARRAY['gluten','huevo'],
  2,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-sopas-de-truchas-mini-2-pers-precio-por-persona'::uuid,
  'SOPAS DE TRUCHAS (MINI 2 PERS.) PRECIO POR PERSONA',
  'Sopa de truchas del río con ajo y pimentón. Plato tradicional de la montaña leonesa.',
  13.50::numeric,
  'ENTRANTES CALIENTES',
  'carta',
  'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=800',
  true,
  320,
  ARRAY['gluten'],
  2,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-lengua-curada'::uuid,
  'LENGUA CURADA',
  'Lengua de ternera curada cortada en finas lonchas.',
  14.00::numeric,
  'ENTRANTES FRIOS',
  'carta',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
  false,
  280,
  ARRAY[]::text[],
  3,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-ensaladilla-rusa'::uuid,
  'ENSALADILLA RUSA',
  'Ensaladilla rusa casera con mayonesa, atún y pimientos.',
  15.00::numeric,
  'ENTRANTES FRIOS',
  'carta',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800',
  false,
  370,
  ARRAY['huevo'],
  3,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-tabla-de-quesos'::uuid,
  'TABLA DE QUESOS',
  'Selección de quesos españoles con membrillo y frutos secos.',
  20.00::numeric,
  'ENTRANTES FRIOS',
  'carta',
  'https://images.unsplash.com/photo-1452195100486-46988398b222?w=800',
  true,
  450,
  ARRAY['lactosa','frutos-secos'],
  3,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-jam-n-recebo-de-guijuelo'::uuid,
  'JAMÓN RECEBO DE GUIJUELO',
  'Jamón de recebo ibérico de Guijuelo. Sabor intenso.',
  22.00::numeric,
  'ENTRANTES FRIOS',
  'carta',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
  true,
  380,
  ARRAY['gluten'],
  3,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-pan-cristal'::uuid,
  'PAN CRISTAL',
  'Pan de cristal crujiente. Acompañamiento ideal.',
  5.00::numeric,
  'ENTRANTES FRIOS',
  'carta',
  'https://images.unsplash.com/photo-1549931319-a545799f3e0c?w=800',
  true,
  180,
  ARRAY['gluten'],
  3,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-cecina-de-le-n-con-i-g-p'::uuid,
  'CECINA DE LEÓN CON I.G.P.',
  'Cecina de León con I.G.P. cortada a cuchillo. Aceite y escamas.',
  20.00::numeric,
  'ENTRANTES FRIOS',
  'carta',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
  true,
  300,
  ARRAY[]::text[],
  3,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-tabla-de-embutidos'::uuid,
  'TABLA DE EMBUTIDOS',
  'Selección de embutidos ibéricos: chorizo, salchichón, lomo y morcilla.',
  22.00::numeric,
  'ENTRANTES FRIOS',
  'carta',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
  true,
  520,
  ARRAY[]::text[],
  3,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-pastel-de-cabracho'::uuid,
  'PASTEL DE CABRACHO',
  'Pastel frío de cabracho con salsa rosa. Textura suave.',
  15.50::numeric,
  'ENTRANTES FRIOS',
  'carta',
  'https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=800',
  true,
  290,
  ARRAY['huevo','lactosa'],
  3,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-esp-rragos-o-puerros-dos-salsas'::uuid,
  'ESPÁRRAGOS O PUERROS DOS SALSAS',
  'Espárragos blancos o puerros con salsa mayonesa y vinagreta.',
  13.00::numeric,
  'ENTRANTES FRIOS',
  'carta',
  'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800',
  true,
  190,
  ARRAY['huevo'],
  3,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-pimientos-de-fresno-con-ventresca-y-anchoa'::uuid,
  'PIMIENTOS DE FRESNO CON VENTRESCA Y ANCHOA',
  'Pimientos de Fresno asados con ventresca de bonito y anchoa.',
  24.00::numeric,
  'ENTRANTES FRIOS',
  'carta',
  'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  false,
  260,
  ARRAY[]::text[],
  3,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-parrillada-de-carne-para-dos-personas'::uuid,
  'PARRILLADA DE CARNE (PARA DOS PERSONAS)',
  'Selección de carnes a la brasa: chuletillas, presa, chorizo y morcilla. Para 2.',
  46.00::numeric,
  'CARNES A LA BRASA',
  'carta',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
  true,
  950,
  ARRAY[]::text[],
  6,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-entrecot-de-ternera'::uuid,
  'ENTRECOT DE TERNERA',
  'Entrecot de ternera gallega madurada a la brasa. Peso variable.',
  42.00::numeric,
  'CARNES A LA BRASA',
  'carta',
  'https://images.unsplash.com/photo-1594041680534-e8c8cdebd659?w=800',
  true,
  650,
  ARRAY[]::text[],
  6,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-presa-ib-rica'::uuid,
  'PRESA IBÉRICA',
  'Presa ibérica a la brasa con pimientos de padrón.',
  20.00::numeric,
  'CARNES A LA BRASA',
  'carta',
  'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800',
  true,
  480,
  ARRAY[]::text[],
  6,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-churrasco-de-ternera'::uuid,
  'CHURRASCO DE TERNERA',
  'Churrasco de ternera a la brasa con patatas.',
  15.50::numeric,
  'CARNES A LA BRASA',
  'carta',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
  true,
  420,
  ARRAY[]::text[],
  6,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-costillas-de-cerdo'::uuid,
  'COSTILLAS DE CERDO',
  'Costillas de cerdo a la brasa con barbecue casero.',
  15.50::numeric,
  'CARNES A LA BRASA',
  'carta',
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
  true,
  580,
  ARRAY[]::text[],
  6,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-chuleta-de-ternera'::uuid,
  'CHULETA DE TERNERA',
  'Chuleta de ternera gallega a la parrilla. Precio por kg.',
  31.00::numeric,
  'CARNES',
  'carta',
  'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800',
  true,
  570,
  ARRAY[]::text[],
  7,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-pierna-de-lechazo-asada'::uuid,
  'PIERNA DE LECHAZO ASADA',
  'Pierna de lechazo asada al horno. Jugosa por dentro.',
  24.00::numeric,
  'CARNES',
  'carta',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
  true,
  620,
  ARRAY[]::text[],
  7,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-filete-de-ternera'::uuid,
  'FILETE DE TERNERA',
  'Filete de ternera a la plancha con patatas.',
  13.00::numeric,
  'CARNES',
  'carta',
  'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800',
  true,
  380,
  ARRAY[]::text[],
  7,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-mollejas-de-ternera-a-la-parrilla'::uuid,
  'MOLLEJAS DE TERNERA A LA PARRILLA',
  'Mollejas de ternera a la parrilla con limón y ajo.',
  20.00::numeric,
  'CARNES',
  'carta',
  'https://images.unsplash.com/photo-1544025162-d76694265947?w=800',
  true,
  450,
  ARRAY[]::text[],
  7,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-solomillo-al-foie'::uuid,
  'SOLOMILLO AL FOIE',
  'Solomillo de ternera con salsa de foie y reducción de Oporto.',
  29.00::numeric,
  'CARNES',
  'carta',
  'https://images.unsplash.com/photo-1432139555190-58524dae6a55?w=800',
  true,
  640,
  ARRAY['lactosa'],
  7,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-escalopines-de-ternera-rebozados'::uuid,
  'ESCALOPINES DE TERNERA REBOZADOS',
  'Escalopines finos rebozados con patatas fritas.',
  22.00::numeric,
  'CARNES',
  'carta',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
  true,
  460,
  ARRAY['gluten','huevo'],
  7,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-carrillera-de-ternera-al-menc-a'::uuid,
  'CARRILLERA DE TERNERA AL MENCÍA',
  'Carrillera estofada al vino Mencía del Bierzo. Se deshace.',
  22.00::numeric,
  'CARNES',
  'carta',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
  true,
  440,
  ARRAY[]::text[],
  7,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-carrillera-ib-rica-al-verdejo'::uuid,
  'CARRILLERA IBÉRICA AL VERDEJO',
  'Carrillera ibérica estofada al vino Verdejo. Tierna y sabrosa.',
  20.00::numeric,
  'CARNES',
  'carta',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
  true,
  450,
  ARRAY[]::text[],
  7,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-caldereta-de-cabrito-de-la-monta-a-leonesa'::uuid,
  'CALDERETA DE CABRITO DE LA MONTAÑA LEONESA',
  'Caldereta de cabrito lechal con patatas. Receta tradicional.',
  20.00::numeric,
  'CARNES',
  'carta',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
  true,
  520,
  ARRAY[]::text[],
  7,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-cecina-de-chivo'::uuid,
  'CECINA DE CHIVO',
  'Cecina de chivo curada al estilo leonés. Sabor intenso.',
  20.00::numeric,
  'CARNES',
  'carta',
  'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?w=800',
  true,
  310,
  ARRAY[]::text[],
  7,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO platos (id, nombre, descripcion, precio, categoria, tipo_menu, imagen_url, disponible, calorias, alergenos, puesto, created_at, updated_at)
VALUES (
  'plato-por-encargo-pollos-de-corral'::uuid,
  'POR ENCARGO POLLOS DE CORRAL',
  'Pollos de corral por encargo. Consultar disponibilidad y precio.',
  0.00::numeric,
  'CARNES',
  'carta',
  'https://images.unsplash.com/photo-1559847844-5315695dadae?w=800',
  true,
  500,
  ARRAY[]::text[],
  7,
  now(),
  now()
)
ON CONFLICT (nombre) DO NOTHING;

-- =============================================================================
-- EVENTOS
-- =============================================================================

INSERT INTO eventos (id, titulo, descripcion, fecha, categoria, imagen_url, capacidad, estado, activo, created_at, updated_at)
VALUES (
  'evt-past-001'::uuid,
  'Cena de Nochevieja',
  'Celebra la última noche del año con un menú especial de gala que incluye uvas de la suerte, cava y cotillón. Música en vivo hasta la madrugada.',
  '2025-12-31T20:00:00Z'::timestamptz,
  'festivo',
  'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=800',
  50,
  'finalizado',
  false,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO eventos (id, titulo, descripcion, fecha, categoria, imagen_url, capacidad, estado, activo, created_at, updated_at)
VALUES (
  'evt-future-001'::uuid,
  'Noche de Flamenco en Vivo',
  'Espectáculo de flamenco con cante, baile y guitarra en directo. Disfruta de una velada única acompañada de una cena con productos de la tierra.',
  '2027-07-15T20:00:00Z'::timestamptz,
  'espectaculo',
  'https://images.unsplash.com/photo-1516306580123-e6e52b5b5b2c?w=800',
  50,
  'programado',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO eventos (id, titulo, descripcion, fecha, categoria, imagen_url, capacidad, estado, activo, created_at, updated_at)
VALUES (
  'evt-future-002'::uuid,
  'Noche de Verano bajo las Estrellas',
  'Cena al aire libre en la terraza con música en directo y un menú especial de verano. Ambiente mágico bajo las estrellas de Santa María del Páramo.',
  '2027-08-10T20:00:00Z'::timestamptz,
  'festivo',
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
  0,
  'programado',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO eventos (id, titulo, descripcion, fecha, categoria, imagen_url, capacidad, estado, activo, created_at, updated_at)
VALUES (
  'evt-future-003'::uuid,
  'Comedia + Cena con el Mago More',
  'Una noche de risas con el humorista local seguidas de un espectáculo de magia de cerca. Menú especial con vino incluido. Reserva anticipada obligatoria.',
  '2027-09-22T20:00:00Z'::timestamptz,
  'espectaculo',
  'https://images.unsplash.com/photo-1541119638495-8d35a01e9e6d?w=800',
  50,
  'programado',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO eventos (id, titulo, descripcion, fecha, categoria, imagen_url, capacidad, estado, activo, created_at, updated_at)
VALUES (
  'evt-future-004'::uuid,
  'Cena Especial de Navidad',
  'Celebra la Nochebuena en familia con un menú de degustación navideño. Platos tradicionales leoneses con un toque moderno. Incluye vino y postre especial.',
  '2027-12-24T20:00:00Z'::timestamptz,
  'festivo',
  'https://images.unsplash.com/photo-1482049016688-2d3e480fc8e2?w=800',
  50,
  'programado',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO eventos (id, titulo, descripcion, fecha, categoria, imagen_url, capacidad, estado, activo, created_at, updated_at)
VALUES (
  'evt-future-005'::uuid,
  'Concierto de Folk Leonés',
  'Grupo de música tradicional leonesa con gaitas, tamboriles y panderetas. Cena de hermandad con productos de la tierra al finalizar el concierto.',
  '2027-10-06T20:00:00Z'::timestamptz,
  'espectaculo',
  'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
  50,
  'programado',
  true,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- MENU DIARIO CONFIG
-- =============================================================================

-- Pricing: Mon-Fri 16€, Sat 25€, Sun 20€ (all active)

INSERT INTO menu_diario_config (id, day_of_week, precio, activo, created_at, updated_at)
VALUES (
  'menu-config-day-0'::uuid,
  0,
  '20',
  true,
  now(),
  now()
)
ON CONFLICT (day_of_week) DO NOTHING;

INSERT INTO menu_diario_config (id, day_of_week, precio, activo, created_at, updated_at)
VALUES (
  'menu-config-day-1'::uuid,
  1,
  '16',
  true,
  now(),
  now()
)
ON CONFLICT (day_of_week) DO NOTHING;

INSERT INTO menu_diario_config (id, day_of_week, precio, activo, created_at, updated_at)
VALUES (
  'menu-config-day-2'::uuid,
  2,
  '16',
  true,
  now(),
  now()
)
ON CONFLICT (day_of_week) DO NOTHING;

INSERT INTO menu_diario_config (id, day_of_week, precio, activo, created_at, updated_at)
VALUES (
  'menu-config-day-3'::uuid,
  3,
  '16',
  true,
  now(),
  now()
)
ON CONFLICT (day_of_week) DO NOTHING;

INSERT INTO menu_diario_config (id, day_of_week, precio, activo, created_at, updated_at)
VALUES (
  'menu-config-day-4'::uuid,
  4,
  '16',
  true,
  now(),
  now()
)
ON CONFLICT (day_of_week) DO NOTHING;

INSERT INTO menu_diario_config (id, day_of_week, precio, activo, created_at, updated_at)
VALUES (
  'menu-config-day-5'::uuid,
  5,
  '16',
  true,
  now(),
  now()
)
ON CONFLICT (day_of_week) DO NOTHING;

INSERT INTO menu_diario_config (id, day_of_week, precio, activo, created_at, updated_at)
VALUES (
  'menu-config-day-6'::uuid,
  6,
  '25',
  true,
  now(),
  now()
)
ON CONFLICT (day_of_week) DO NOTHING;

-- =============================================================================
-- MENU DIARIO ITEMS
-- =============================================================================

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-primer-0'::uuid,
  'menu-config-day-0'::uuid,
  'primer',
  'Ensalada Zíngara',
  'Lechuga, cebolla, tomate, pimientos y atún',
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-primer-1'::uuid,
  'menu-config-day-0'::uuid,
  'primer',
  'Sopa castellana',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-primer-2'::uuid,
  'menu-config-day-0'::uuid,
  'primer',
  'Arroz con verduras',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-segundo-0'::uuid,
  'menu-config-day-0'::uuid,
  'segundo',
  'Lechazo asado',
  'Especialidad de la casa',
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-segundo-1'::uuid,
  'menu-config-day-0'::uuid,
  'segundo',
  'Chuletillas de lechazo',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-segundo-2'::uuid,
  'menu-config-day-0'::uuid,
  'segundo',
  'Solomillo al queso de Valdeón',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-postre-0'::uuid,
  'menu-config-day-0'::uuid,
  'postre',
  'Tarta de queso casera',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-postre-1'::uuid,
  'menu-config-day-0'::uuid,
  'postre',
  'Arroz con leche',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-postre-2'::uuid,
  'menu-config-day-0'::uuid,
  'postre',
  'Flan de huevo',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-bebida-0'::uuid,
  'menu-config-day-0'::uuid,
  'bebida',
  'Agua mineral',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-bebida-1'::uuid,
  'menu-config-day-0'::uuid,
  'bebida',
  'Vino de la tierra (León)',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-bebida-2'::uuid,
  'menu-config-day-0'::uuid,
  'bebida',
  'Cerveza',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-bebida-3'::uuid,
  'menu-config-day-0'::uuid,
  'bebida',
  'Refresco',
  NULL,
  3,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-pan-0'::uuid,
  'menu-config-day-0'::uuid,
  'pan',
  'Pan de hogaza',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day0-pan-1'::uuid,
  'menu-config-day-0'::uuid,
  'pan',
  'Cubiertos y servilleta',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-primer-0'::uuid,
  'menu-config-day-1'::uuid,
  'primer',
  'Ensalada mixta',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-primer-1'::uuid,
  'menu-config-day-1'::uuid,
  'primer',
  'Judías verdes con patatas',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-primer-2'::uuid,
  'menu-config-day-1'::uuid,
  'primer',
  'Macarrones con tomate',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-segundo-0'::uuid,
  'menu-config-day-1'::uuid,
  'segundo',
  'Pechuga de pollo empanada',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-segundo-1'::uuid,
  'menu-config-day-1'::uuid,
  'segundo',
  'Merluza a la plancha',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-segundo-2'::uuid,
  'menu-config-day-1'::uuid,
  'segundo',
  'Huevos fritos con patatas y jamón',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-postre-0'::uuid,
  'menu-config-day-1'::uuid,
  'postre',
  'Fruta de temporada',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-postre-1'::uuid,
  'menu-config-day-1'::uuid,
  'postre',
  'Natillas caseras',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-postre-2'::uuid,
  'menu-config-day-1'::uuid,
  'postre',
  'Helado',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-bebida-0'::uuid,
  'menu-config-day-1'::uuid,
  'bebida',
  'Agua mineral',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-bebida-1'::uuid,
  'menu-config-day-1'::uuid,
  'bebida',
  'Vino de la tierra (León)',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-bebida-2'::uuid,
  'menu-config-day-1'::uuid,
  'bebida',
  'Cerveza',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-bebida-3'::uuid,
  'menu-config-day-1'::uuid,
  'bebida',
  'Refresco',
  NULL,
  3,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-pan-0'::uuid,
  'menu-config-day-1'::uuid,
  'pan',
  'Pan de hogaza',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day1-pan-1'::uuid,
  'menu-config-day-1'::uuid,
  'pan',
  'Cubiertos y servilleta',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-primer-0'::uuid,
  'menu-config-day-2'::uuid,
  'primer',
  'Pisto manchego con huevo',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-primer-1'::uuid,
  'menu-config-day-2'::uuid,
  'primer',
  'Ensalada Zíngara',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-primer-2'::uuid,
  'menu-config-day-2'::uuid,
  'primer',
  'Alubias blancas con almejas',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-segundo-0'::uuid,
  'menu-config-day-2'::uuid,
  'segundo',
  'Escalopines de ternera rebozados',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-segundo-1'::uuid,
  'menu-config-day-2'::uuid,
  'segundo',
  'Rape a la plancha',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-segundo-2'::uuid,
  'menu-config-day-2'::uuid,
  'segundo',
  'Filete de ternera',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-postre-0'::uuid,
  'menu-config-day-2'::uuid,
  'postre',
  'Tarta de queso casera',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-postre-1'::uuid,
  'menu-config-day-2'::uuid,
  'postre',
  'Cuajada con miel',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-postre-2'::uuid,
  'menu-config-day-2'::uuid,
  'postre',
  'Fruta de temporada',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-bebida-0'::uuid,
  'menu-config-day-2'::uuid,
  'bebida',
  'Agua mineral',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-bebida-1'::uuid,
  'menu-config-day-2'::uuid,
  'bebida',
  'Vino de la tierra (León)',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-bebida-2'::uuid,
  'menu-config-day-2'::uuid,
  'bebida',
  'Cerveza',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-bebida-3'::uuid,
  'menu-config-day-2'::uuid,
  'bebida',
  'Refresco',
  NULL,
  3,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-pan-0'::uuid,
  'menu-config-day-2'::uuid,
  'pan',
  'Pan de hogaza',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day2-pan-1'::uuid,
  'menu-config-day-2'::uuid,
  'pan',
  'Cubiertos y servilleta',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-primer-0'::uuid,
  'menu-config-day-3'::uuid,
  'primer',
  'Revuelto Zíngara',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-primer-1'::uuid,
  'menu-config-day-3'::uuid,
  'primer',
  'Lentejas estofadas',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-primer-2'::uuid,
  'menu-config-day-3'::uuid,
  'primer',
  'Ensalada de ventresca de bonito',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-segundo-0'::uuid,
  'menu-config-day-3'::uuid,
  'segundo',
  'Carrillera de ternera al Mencía',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-segundo-1'::uuid,
  'menu-config-day-3'::uuid,
  'segundo',
  'Trucha con escabeche de verduras',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-segundo-2'::uuid,
  'menu-config-day-3'::uuid,
  'segundo',
  'Churrasco de ternera',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-postre-0'::uuid,
  'menu-config-day-3'::uuid,
  'postre',
  'Arroz con leche',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-postre-1'::uuid,
  'menu-config-day-3'::uuid,
  'postre',
  'Tarta de la casa',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-postre-2'::uuid,
  'menu-config-day-3'::uuid,
  'postre',
  'Flan de huevo',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-bebida-0'::uuid,
  'menu-config-day-3'::uuid,
  'bebida',
  'Agua mineral',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-bebida-1'::uuid,
  'menu-config-day-3'::uuid,
  'bebida',
  'Vino de la tierra (León)',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-bebida-2'::uuid,
  'menu-config-day-3'::uuid,
  'bebida',
  'Cerveza',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-bebida-3'::uuid,
  'menu-config-day-3'::uuid,
  'bebida',
  'Refresco',
  NULL,
  3,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-pan-0'::uuid,
  'menu-config-day-3'::uuid,
  'pan',
  'Pan de hogaza',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day3-pan-1'::uuid,
  'menu-config-day-3'::uuid,
  'pan',
  'Cubiertos y servilleta',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-primer-0'::uuid,
  'menu-config-day-4'::uuid,
  'primer',
  'Sopa Zíngara',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-primer-1'::uuid,
  'menu-config-day-4'::uuid,
  'primer',
  'Ensalada de jamón ibérico y fruta',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-primer-2'::uuid,
  'menu-config-day-4'::uuid,
  'primer',
  'Croquetas caseras',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-segundo-0'::uuid,
  'menu-config-day-4'::uuid,
  'segundo',
  'Rodaballo a la plancha',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-segundo-1'::uuid,
  'menu-config-day-4'::uuid,
  'segundo',
  'Presa ibérica',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-segundo-2'::uuid,
  'menu-config-day-4'::uuid,
  'segundo',
  'Costillas de cerdo',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-postre-0'::uuid,
  'menu-config-day-4'::uuid,
  'postre',
  'Natillas caseras',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-postre-1'::uuid,
  'menu-config-day-4'::uuid,
  'postre',
  'Fruta de temporada',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-postre-2'::uuid,
  'menu-config-day-4'::uuid,
  'postre',
  'Helado',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-bebida-0'::uuid,
  'menu-config-day-4'::uuid,
  'bebida',
  'Agua mineral',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-bebida-1'::uuid,
  'menu-config-day-4'::uuid,
  'bebida',
  'Vino de la tierra (León)',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-bebida-2'::uuid,
  'menu-config-day-4'::uuid,
  'bebida',
  'Cerveza',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-bebida-3'::uuid,
  'menu-config-day-4'::uuid,
  'bebida',
  'Refresco',
  NULL,
  3,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-pan-0'::uuid,
  'menu-config-day-4'::uuid,
  'pan',
  'Pan de hogaza',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day4-pan-1'::uuid,
  'menu-config-day-4'::uuid,
  'pan',
  'Cubiertos y servilleta',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-primer-0'::uuid,
  'menu-config-day-5'::uuid,
  'primer',
  'Pulpo a la gallega',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-primer-1'::uuid,
  'menu-config-day-5'::uuid,
  'primer',
  'Boletus con lascas de foie, huevo y cecina',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-primer-2'::uuid,
  'menu-config-day-5'::uuid,
  'primer',
  'Ensalada de cogollos con sardina ahumada',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-segundo-0'::uuid,
  'menu-config-day-5'::uuid,
  'segundo',
  'Lubina al horno (2 personas)',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-segundo-1'::uuid,
  'menu-config-day-5'::uuid,
  'segundo',
  'Entrecot de ternera',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-segundo-2'::uuid,
  'menu-config-day-5'::uuid,
  'segundo',
  'Chipirones plancha con cecina',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-postre-0'::uuid,
  'menu-config-day-5'::uuid,
  'postre',
  'Tarta de queso casera',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-postre-1'::uuid,
  'menu-config-day-5'::uuid,
  'postre',
  'Cuajada con miel',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-postre-2'::uuid,
  'menu-config-day-5'::uuid,
  'postre',
  'Fruta de temporada',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-bebida-0'::uuid,
  'menu-config-day-5'::uuid,
  'bebida',
  'Agua mineral',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-bebida-1'::uuid,
  'menu-config-day-5'::uuid,
  'bebida',
  'Vino de la tierra (León)',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-bebida-2'::uuid,
  'menu-config-day-5'::uuid,
  'bebida',
  'Cerveza',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-bebida-3'::uuid,
  'menu-config-day-5'::uuid,
  'bebida',
  'Refresco',
  NULL,
  3,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-pan-0'::uuid,
  'menu-config-day-5'::uuid,
  'pan',
  'Pan de hogaza',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day5-pan-1'::uuid,
  'menu-config-day-5'::uuid,
  'pan',
  'Cubiertos y servilleta',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-primer-0'::uuid,
  'menu-config-day-6'::uuid,
  'primer',
  'Zamburiñas a la plancha',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-primer-1'::uuid,
  'menu-config-day-6'::uuid,
  'primer',
  'Anchoas de Santoña con tomete',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-primer-2'::uuid,
  'menu-config-day-6'::uuid,
  'primer',
  'Jamón ibérico de Guijuelo',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-segundo-0'::uuid,
  'menu-config-day-6'::uuid,
  'segundo',
  'Chuletón madurado de vaca premium',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-segundo-1'::uuid,
  'menu-config-day-6'::uuid,
  'segundo',
  'Arroz con bogavante',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-segundo-2'::uuid,
  'menu-config-day-6'::uuid,
  'segundo',
  'Paletilla de lechazo',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-postre-0'::uuid,
  'menu-config-day-6'::uuid,
  'postre',
  'Tarta de la casa',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-postre-1'::uuid,
  'menu-config-day-6'::uuid,
  'postre',
  'Arroz con leche',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-postre-2'::uuid,
  'menu-config-day-6'::uuid,
  'postre',
  'Flan de huevo',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-bebida-0'::uuid,
  'menu-config-day-6'::uuid,
  'bebida',
  'Agua mineral',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-bebida-1'::uuid,
  'menu-config-day-6'::uuid,
  'bebida',
  'Vino de la tierra (León)',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-bebida-2'::uuid,
  'menu-config-day-6'::uuid,
  'bebida',
  'Cerveza',
  NULL,
  2,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-bebida-3'::uuid,
  'menu-config-day-6'::uuid,
  'bebida',
  'Refresco',
  NULL,
  3,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-pan-0'::uuid,
  'menu-config-day-6'::uuid,
  'pan',
  'Pan de hogaza',
  NULL,
  0,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO menu_diario_items (id, config_id, seccion, plato_nombre, descripcion, puesto, created_at, updated_at)
VALUES (
  'menu-item-day6-pan-1'::uuid,
  'menu-config-day-6'::uuid,
  'pan',
  'Cubiertos y servilleta',
  NULL,
  1,
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- CONFIGURACION — singleton row (upsert)
-- =============================================================================

INSERT INTO configuracion (id, cliente_elige_mesa, capacidad_total_local, created_at, updated_at)
VALUES (
  gen_random_uuid(),
  false,
  80,
  now(),
  now()
)
ON CONFLICT DO NOTHING;

COMMIT;
