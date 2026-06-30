# Variables para Vercel

En Vercel, cuando te pida **Environment Variables**, agrega estas dos:

```txt
VITE_SUPABASE_URL=https://uiryopmxelpfpbsqjsyb.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_bFzow9Gf7o-zjEeTbHfd3Q_q7mL6c5X
```

No agregues ninguna clave `secret` ni `service_role`.

Configuracion esperada:

- Framework Preset: `Vite`
- Build Command: `pnpm run build`
- Output Directory: `dist`
