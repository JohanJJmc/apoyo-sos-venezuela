# Variables para Vercel

En Vercel, cuando te pida **Environment Variables**, agrega estas variables:

```txt
VITE_SUPABASE_URL=https://uiryopmxelpfpbsqjsyb.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_bFzow9Gf7o-zjEeTbHfd3Q_q7mL6c5X
VITE_AUTH_REDIRECT_URL=https://nexo-sos.vercel.app
VITE_GEOAPIFY_API_KEY=pega_aqui_tu_api_key_de_geoapify
```

No agregues ninguna clave `secret` ni `service_role`.

`VITE_GEOAPIFY_API_KEY` es opcional, pero recomendado para mejorar las direcciones detectadas desde GPS.

Configuracion esperada:

- Framework Preset: `Vite`
- Build Command: `pnpm run build`
- Output Directory: `dist`
