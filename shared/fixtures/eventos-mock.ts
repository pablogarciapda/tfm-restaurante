// Mock data — Restaurante La Zíngara eventos (EG-001, EG-002)
// 4-6 events: mix of festivo (festive/holiday) and espectaculo (music/show)
// At least 1 past event, at least 1 sold-out, future dates for upcoming

export interface MockEvento {
  id: string
  fecha: string // ISO date string (YYYY-MM-DD)
  titulo: string
  descripcion: string
  imagen_url?: string
  categoria: 'festivo' | 'espectaculo'
  soldOut?: boolean
}

export const mockEventos: MockEvento[] = [
  {
    id: 'evt-past-001',
    fecha: '2025-12-31',
    titulo: 'Cena de Nochevieja',
    descripcion:
      'Celebra la última noche del año con un menú especial de gala que incluye uvas de la suerte, cava y cotillón. Música en vivo hasta la madrugada.',
    imagen_url: 'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?w=800',
    categoria: 'festivo',
  },
  {
    id: 'evt-future-001',
    fecha: '2027-07-15',
    titulo: 'Noche de Flamenco en Vivo',
    descripcion:
      'Espectáculo de flamenco con cante, baile y guitarra en directo. Disfruta de una velada única acompañada de una cena con productos de la tierra.',
    imagen_url: 'https://images.unsplash.com/photo-1516306580123-e6e52b5b5b2c?w=800',
    categoria: 'espectaculo',
  },
  {
    id: 'evt-future-002',
    fecha: '2027-08-10',
    titulo: 'Noche de Verano bajo las Estrellas',
    descripcion:
      'Cena al aire libre en la terraza con música en directo y un menú especial de verano. Ambiente mágico bajo las estrellas de Santa María del Páramo.',
    imagen_url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
    categoria: 'festivo',
    soldOut: true,
  },
  {
    id: 'evt-future-003',
    fecha: '2027-09-22',
    titulo: 'Comedia + Cena con el Mago More',
    descripcion:
      'Una noche de risas con el humorista local seguidas de un espectáculo de magia de cerca. Menú especial con vino incluido. Reserva anticipada obligatoria.',
    imagen_url: 'https://images.unsplash.com/photo-1541119638495-8d35a01e9e6d?w=800',
    categoria: 'espectaculo',
  },
  {
    id: 'evt-future-004',
    fecha: '2027-12-24',
    titulo: 'Cena Especial de Navidad',
    descripcion:
      'Celebra la Nochebuena en familia con un menú de degustación navideño. Platos tradicionales leoneses con un toque moderno. Incluye vino y postre especial.',
    imagen_url: 'https://images.unsplash.com/photo-1482049016688-2d3e480fc8e2?w=800',
    categoria: 'festivo',
  },
  {
    id: 'evt-future-005',
    fecha: '2027-10-06',
    titulo: 'Concierto de Folk Leonés',
    descripcion:
      'Grupo de música tradicional leonesa con gaitas, tamboriles y panderetas. Cena de hermandad con productos de la tierra al finalizar el concierto.',
    imagen_url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800',
    categoria: 'espectaculo',
  },
]
