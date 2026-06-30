export const CATEGORY_ITEMS: Record<string, string[]> = {
  Agua: ["Agua potable", "Botellones", "Filtros", "Envases", "Otro"],
  Comida: ["Alimentos no perecederos", "Comida preparada", "Fórmula infantil", "Alimento para mascotas", "Otro"],
  Herramientas: ["Linternas", "Pilas", "Palas", "Cuerdas", "Guantes", "Otro"],
  Medicamentos: ["Analgésicos", "Antibióticos", "Insulina", "Tratamiento crónico", "Primeros auxilios", "Otro"],
  "Asistencia médica": ["Atención médica", "Enfermería", "Primeros auxilios", "Traslado médico", "Otro"],
  Refugio: ["Alojamiento temporal", "Carpas", "Cobijas", "Ropa", "Otro"],
  Transporte: ["Traslado de personas", "Traslado de insumos", "Combustible", "Otro"],
  Rescate: ["Persona atrapada", "Persona desaparecida", "Evacuación", "Otro"],
  Comunicación: ["Cargadores", "Power banks", "Señal telefónica", "Internet", "Otro"],
  Otros: ["Otro"],
};

export const CATEGORIES = Object.keys(CATEGORY_ITEMS);
