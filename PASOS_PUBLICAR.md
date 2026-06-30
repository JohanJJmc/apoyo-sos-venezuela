# Siguiente paso: base de datos y publicacion

La app ya esta preparada para funcionar de dos formas:

- Sin Supabase: guarda solicitudes en el navegador actual.
- Con Supabase: varias personas pueden ver las mismas solicitudes.

## 1. Crear Supabase

1. Entra a https://supabase.com
2. Crea una cuenta.
3. Crea un proyecto nuevo.
4. En el proyecto, abre **SQL Editor**.
5. Copia todo el contenido de `supabase-schema.sql`.
6. Pegalo y ejecutalo.

## 2. Copiar las claves

En Supabase:

1. Ve a **Project Settings**.
2. Abre **API**.
3. Copia:
   - Project URL
   - anon public key

## 3. Crear archivo `.env`

Copia `.env.example` y renombralo a `.env`.

Pon tus datos:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

Luego reinicia la app.

## 4. Publicar web/PWA

La forma mas simple es Vercel:

1. Crea cuenta en https://vercel.com
2. Sube el proyecto.
3. Agrega las mismas variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy.

Cuando este publicado, cualquier persona podra abrir el enlace desde el telefono.
