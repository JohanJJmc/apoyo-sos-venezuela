export const CATEGORY_ITEMS: Record<string, string[]> = {
  Rescate: ["Persona atrapada", "Persona desaparecida", "Evacuación", "Otro"],
  "Asistencia médica": ["Atención médica", "Enfermería", "Primeros auxilios", "Traslado médico", "Otro"],
  Medicamentos: ["Analgésicos", "Antibióticos", "Insulina", "Tratamiento crónico", "Primeros auxilios", "Otro"],
  Agua: ["Agua potable", "Botellones", "Filtros", "Envases", "Otro"],
  Comida: ["Alimentos no perecederos", "Comida preparada", "Fórmula infantil", "Alimento para mascotas", "Otro"],
  Refugio: ["Alojamiento temporal", "Carpas", "Cobijas", "Ropa", "Otro"],
  Transporte: ["Traslado de personas", "Traslado de insumos", "Combustible", "Otro"],
  Comunicación: ["Cargadores", "Power banks", "Señal telefónica", "Internet", "Otro"],
  Herramientas: ["Linternas", "Pilas", "Palas", "Cuerdas", "Guantes", "Otro"],
  Otros: ["Otro"],
};

export const CATEGORIES = Object.keys(CATEGORY_ITEMS);
