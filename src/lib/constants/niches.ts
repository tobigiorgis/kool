export const MAX_NICHES = 3

export interface Niche {
  id: string
  label: string
  category: string
}

export const CREATOR_NICHES: Niche[] = [
  // Moda & Belleza
  { id: "moda", label: "Moda", category: "Moda & Belleza" },
  { id: "belleza", label: "Belleza", category: "Moda & Belleza" },
  { id: "skincare", label: "Skincare", category: "Moda & Belleza" },
  { id: "lifestyle", label: "Lifestyle", category: "Moda & Belleza" },
  { id: "plus-size", label: "Plus Size", category: "Moda & Belleza" },

  // Fitness & Salud
  { id: "fitness", label: "Fitness", category: "Fitness & Salud" },
  { id: "nutricion", label: "Nutrición", category: "Fitness & Salud" },
  { id: "yoga", label: "Yoga & Bienestar", category: "Fitness & Salud" },
  { id: "salud-mental", label: "Salud Mental", category: "Fitness & Salud" },
  { id: "deporte", label: "Deporte", category: "Fitness & Salud" },

  // Tecnología & Negocios
  { id: "tecnologia", label: "Tecnología", category: "Tech & Negocios" },
  { id: "emprendimiento", label: "Emprendimiento", category: "Tech & Negocios" },
  { id: "finanzas", label: "Finanzas", category: "Tech & Negocios" },
  { id: "marketing", label: "Marketing Digital", category: "Tech & Negocios" },
  { id: "productividad", label: "Productividad", category: "Tech & Negocios" },

  // Gastronomía & Hogar
  { id: "gastronomia", label: "Gastronomía", category: "Gastronomía & Hogar" },
  { id: "recetas", label: "Recetas Saludables", category: "Gastronomía & Hogar" },
  { id: "deco", label: "Decoración & Hogar", category: "Gastronomía & Hogar" },
  { id: "sustentabilidad", label: "Sustentabilidad", category: "Gastronomía & Hogar" },
  { id: "mascotas", label: "Mascotas", category: "Gastronomía & Hogar" },

  // Entretenimiento & Cultura
  { id: "humor", label: "Humor & Entretenimiento", category: "Entretenimiento" },
  { id: "viajes", label: "Viajes", category: "Entretenimiento" },
  { id: "gaming", label: "Gaming", category: "Entretenimiento" },
  { id: "musica", label: "Música", category: "Entretenimiento" },
  { id: "arte", label: "Arte & Diseño", category: "Entretenimiento" },

  // Familia & Educación
  { id: "maternidad", label: "Maternidad & Familia", category: "Familia & Educación" },
  { id: "educacion", label: "Educación", category: "Familia & Educación" },
  { id: "ninos", label: "Niños", category: "Familia & Educación" },
  { id: "pareja", label: "Pareja & Relaciones", category: "Familia & Educación" },
  { id: "adultos-mayores", label: "Adultos Mayores", category: "Familia & Educación" },
]

export const NICHE_CATEGORIES = [...new Set(CREATOR_NICHES.map((n) => n.category))]

export function getNicheLabel(id: string): string {
  return CREATOR_NICHES.find((n) => n.id === id)?.label ?? id
}
