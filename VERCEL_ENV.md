# Variables para Vercel

En Vercel, cuando te pida **Environment Variables**, agrega estas variables:

```txt
VITE_SUPABASE_URL=https://uiryopmxelpfpbsqjsyb.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_bFzow9Gf7o-zjEeTbHfd3Q_q7mL6c5X
VITE_AUTH_REDIRECT_URL=https://nexo-sos.vercel.app
VITE_GEOAPIFY_API_KEY=pega_aqui_tu_api_key_de_geoapify
OPENAI_API_KEY=pega_aqui_tu_api_key_de_openai
```

No agregues ninguna clave `service_role` de Supabase.

`VITE_GEOAPIFY_API_KEY` es opcional, pero recomendado para mejorar las direcciones detectadas desde GPS.

`OPENAI_API_KEY` no debe llevar `VITE_` porque se usa solo en una función segura de Vercel para moderar texto antes de publicar solicitudes o apoyos.

Configuracion esperada:

- Framework Preset: `Vite`
- Build Command: `pnpm run build`
- Output Directory: `dist`
