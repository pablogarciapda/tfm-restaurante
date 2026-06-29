// Mock data — Restaurante La Zíngara menú del día (7-day rotation)
// 5-section structure: Primer Plato, Segundo Plato, Postre, Bebida, Pan y Cubiertos
// Fixed price ~18€ per day per MD-002

export interface MenuDiarioPlato {
  nombre: string
  descripcion?: string
}

export interface MenuDiarioSeccion {
  nombre: string
  platos: MenuDiarioPlato[]
}

export interface MenuDiarioDia {
  dia: number // 0=Sunday..6=Saturday
  precio: string
  secciones: MenuDiarioSeccion[]
}

export const mockMenuDiario: MenuDiarioDia[] = [
  {
    dia: 0, // Sunday
    precio: '20',
    secciones: [
      {
        nombre: 'Primer Plato',
        platos: [
          { nombre: 'Ensalada Zíngara', descripcion: 'Lechuga, cebolla, tomate, pimientos y atún' },
          { nombre: 'Sopa castellana' },
          { nombre: 'Arroz con verduras' },
        ],
      },
      {
        nombre: 'Segundo Plato',
        platos: [
          { nombre: 'Lechazo asado', descripcion: 'Especialidad de la casa' },
          { nombre: 'Chuletillas de lechazo' },
          { nombre: 'Solomillo al queso de Valdeón' },
        ],
      },
      {
        nombre: 'Postre',
        platos: [
          { nombre: 'Tarta de queso casera' },
          { nombre: 'Arroz con leche' },
          { nombre: 'Flan de huevo' },
        ],
      },
      {
        nombre: 'Bebida',
        platos: [
          { nombre: 'Agua mineral' },
          { nombre: 'Vino de la tierra (León)' },
          { nombre: 'Cerveza' },
          { nombre: 'Refresco' },
        ],
      },
      {
        nombre: 'Pan y Cubiertos',
        platos: [
          { nombre: 'Pan de hogaza' },
          { nombre: 'Cubiertos y servilleta' },
        ],
      },
    ],
  },
  {
    dia: 1, // Monday
    precio: '18',
    secciones: [
      {
        nombre: 'Primer Plato',
        platos: [
          { nombre: 'Ensalada mixta' },
          { nombre: 'Judías verdes con patatas' },
          { nombre: 'Macarrones con tomate' },
        ],
      },
      {
        nombre: 'Segundo Plato',
        platos: [
          { nombre: 'Pechuga de pollo empanada' },
          { nombre: 'Merluza a la plancha' },
          { nombre: 'Huevos fritos con patatas y jamón' },
        ],
      },
      {
        nombre: 'Postre',
        platos: [
          { nombre: 'Fruta de temporada' },
          { nombre: 'Natillas caseras' },
          { nombre: 'Helado' },
        ],
      },
      {
        nombre: 'Bebida',
        platos: [
          { nombre: 'Agua mineral' },
          { nombre: 'Vino de la tierra (León)' },
          { nombre: 'Cerveza' },
          { nombre: 'Refresco' },
        ],
      },
      {
        nombre: 'Pan y Cubiertos',
        platos: [
          { nombre: 'Pan de hogaza' },
          { nombre: 'Cubiertos y servilleta' },
        ],
      },
    ],
  },
  {
    dia: 2, // Tuesday
    precio: '18',
    secciones: [
      {
        nombre: 'Primer Plato',
        platos: [
          { nombre: 'Pisto manchego con huevo' },
          { nombre: 'Ensalada Zíngara' },
          { nombre: 'Alubias blancas con almejas' },
        ],
      },
      {
        nombre: 'Segundo Plato',
        platos: [
          { nombre: 'Escalopines de ternera rebozados' },
          { nombre: 'Rape a la plancha' },
          { nombre: 'Filete de ternera' },
        ],
      },
      {
        nombre: 'Postre',
        platos: [
          { nombre: 'Tarta de queso casera' },
          { nombre: 'Cuajada con miel' },
          { nombre: 'Fruta de temporada' },
        ],
      },
      {
        nombre: 'Bebida',
        platos: [
          { nombre: 'Agua mineral' },
          { nombre: 'Vino de la tierra (León)' },
          { nombre: 'Cerveza' },
          { nombre: 'Refresco' },
        ],
      },
      {
        nombre: 'Pan y Cubiertos',
        platos: [
          { nombre: 'Pan de hogaza' },
          { nombre: 'Cubiertos y servilleta' },
        ],
      },
    ],
  },
  {
    dia: 3, // Wednesday
    precio: '18',
    secciones: [
      {
        nombre: 'Primer Plato',
        platos: [
          { nombre: 'Revuelto Zíngara' },
          { nombre: 'Lentejas estofadas' },
          { nombre: 'Ensalada de ventresca de bonito' },
        ],
      },
      {
        nombre: 'Segundo Plato',
        platos: [
          { nombre: 'Carrillera de ternera al Mencía' },
          { nombre: 'Trucha con escabeche de verduras' },
          { nombre: 'Churrasco de ternera' },
        ],
      },
      {
        nombre: 'Postre',
        platos: [
          { nombre: 'Arroz con leche' },
          { nombre: 'Tarta de la casa' },
          { nombre: 'Flan de huevo' },
        ],
      },
      {
        nombre: 'Bebida',
        platos: [
          { nombre: 'Agua mineral' },
          { nombre: 'Vino de la tierra (León)' },
          { nombre: 'Cerveza' },
          { nombre: 'Refresco' },
        ],
      },
      {
        nombre: 'Pan y Cubiertos',
        platos: [
          { nombre: 'Pan de hogaza' },
          { nombre: 'Cubiertos y servilleta' },
        ],
      },
    ],
  },
  {
    dia: 4, // Thursday
    precio: '18',
    secciones: [
      {
        nombre: 'Primer Plato',
        platos: [
          { nombre: 'Sopa Zíngara' },
          { nombre: 'Ensalada de jamón ibérico y fruta' },
          { nombre: 'Croquetas caseras' },
        ],
      },
      {
        nombre: 'Segundo Plato',
        platos: [
          { nombre: 'Rodaballo a la plancha' },
          { nombre: 'Presa ibérica' },
          { nombre: 'Costillas de cerdo' },
        ],
      },
      {
        nombre: 'Postre',
        platos: [
          { nombre: 'Natillas caseras' },
          { nombre: 'Fruta de temporada' },
          { nombre: 'Helado' },
        ],
      },
      {
        nombre: 'Bebida',
        platos: [
          { nombre: 'Agua mineral' },
          { nombre: 'Vino de la tierra (León)' },
          { nombre: 'Cerveza' },
          { nombre: 'Refresco' },
        ],
      },
      {
        nombre: 'Pan y Cubiertos',
        platos: [
          { nombre: 'Pan de hogaza' },
          { nombre: 'Cubiertos y servilleta' },
        ],
      },
    ],
  },
  {
    dia: 5, // Friday
    precio: '20',
    secciones: [
      {
        nombre: 'Primer Plato',
        platos: [
          { nombre: 'Pulpo a la gallega' },
          { nombre: 'Boletus con lascas de foie, huevo y cecina' },
          { nombre: 'Ensalada de cogollos con sardina ahumada' },
        ],
      },
      {
        nombre: 'Segundo Plato',
        platos: [
          { nombre: 'Lubina al horno (2 personas)' },
          { nombre: 'Entrecot de ternera' },
          { nombre: 'Chipirones plancha con cecina' },
        ],
      },
      {
        nombre: 'Postre',
        platos: [
          { nombre: 'Tarta de queso casera' },
          { nombre: 'Cuajada con miel' },
          { nombre: 'Fruta de temporada' },
        ],
      },
      {
        nombre: 'Bebida',
        platos: [
          { nombre: 'Agua mineral' },
          { nombre: 'Vino de la tierra (León)' },
          { nombre: 'Cerveza' },
          { nombre: 'Refresco' },
        ],
      },
      {
        nombre: 'Pan y Cubiertos',
        platos: [
          { nombre: 'Pan de hogaza' },
          { nombre: 'Cubiertos y servilleta' },
        ],
      },
    ],
  },
  {
    dia: 6, // Saturday
    precio: '22',
    secciones: [
      {
        nombre: 'Primer Plato',
        platos: [
          { nombre: 'Zamburiñas a la plancha' },
          { nombre: 'Anchoas de Santoña con tomete' },
          { nombre: 'Jamón ibérico de Guijuelo' },
        ],
      },
      {
        nombre: 'Segundo Plato',
        platos: [
          { nombre: 'Chuletón madurado de vaca premium' },
          { nombre: 'Arroz con bogavante' },
          { nombre: 'Paletilla de lechazo' },
        ],
      },
      {
        nombre: 'Postre',
        platos: [
          { nombre: 'Tarta de la casa' },
          { nombre: 'Arroz con leche' },
          { nombre: 'Flan de huevo' },
        ],
      },
      {
        nombre: 'Bebida',
        platos: [
          { nombre: 'Agua mineral' },
          { nombre: 'Vino de la tierra (León)' },
          { nombre: 'Cerveza' },
          { nombre: 'Refresco' },
        ],
      },
      {
        nombre: 'Pan y Cubiertos',
        platos: [
          { nombre: 'Pan de hogaza' },
          { nombre: 'Cubiertos y servilleta' },
        ],
      },
    ],
  },
]
