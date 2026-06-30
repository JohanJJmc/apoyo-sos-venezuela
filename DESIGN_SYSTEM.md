# NEXO - Sistema de diseño

## Personalidad visual

La interfaz debe sentirse humana, confiable, simple y preparada para emergencia. Mobile-first, sin decoracion innecesaria y con controles tactiles grandes.

## Tokens

- Fondo: `#FAFAF7`
- Superficie: `#FFFFFF`
- Texto principal: `#102A43`
- Texto secundario: `#62748A`
- Primario confianza: `#1E5BFF`
- Primario suave: `#EAF1FF`
- Pendiente: `#D92D20`
- Pendiente suave: `#FDECEC`
- Atendida: `#168A4A`
- Atendida suave: `#EAF7EF`

Los tokens viven en `src/design/*` y tambien estan configurados en `tailwind.config.js`.

## Componentes

- `AppHeader`: pestañas superiores y avisos.
- `MapScreen`: mapa limpio con pines.
- `FloatingActionButton`: boton principal azul de 56px.
- `RequestFormBottomSheet`: formulario de solicitud.
- `RequestDetailBottomSheet`: detalle de solicitud.
- `FilterChips`: filtros redondeados.
- `RequestMarker`: pin rojo/verde con icono blanco.
- `StatusBadge`: estados pendiente/atendida.
- `CategoryIcon`: iconos internos por categoria.
- `TextInput`, `SelectInput`, `PhotoUploader`: campos base.
- `EmptyState`, `OfflineBanner`, `ToastMessage`: estados informativos.

## Reglas clave

- Los pines usan solo rojo para pendiente y verde para atendida.
- Las categorias se diferencian por icono, no por color.
- Cards: `20px`.
- Inputs: `14px`.
- Bottom sheets: `24px` arriba.
- Chips y botones principales: `999px`.
- Titulos: `20px` a `24px`.
- Texto base: `15px` a `16px`.
- Labels: `13px`.
