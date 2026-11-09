# GulfBridge

GulfBridge is a mobile-first jobs-abroad website for Kenyan job seekers and responsible employers. It is built with React, TypeScript, Vite, Supabase, Leaflet, and Capacitor for Android.

## Local development

Requirements: Node.js 24+ and npm.

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

Without Supabase credentials the app displays sample listings and demo-only interactions. Demo accounts, applications, and uploads are not persisted.

## Chrome and installable app

Deploy the production build to an HTTPS origin. Chrome opens the URL as a normal website until the user installs GulfBridge; after installation, Chrome launches it in its own app window. The manifest and service worker provide the install and offline app shell. On supported Chrome versions, use the in-app **Install app** button or Chrome's install option in the address bar/menu. Browser support and install prompts are controlled by Chrome.

Build the static site with `npm run build` and publish the generated `dist` directory. Configure the hosting provider to serve `index.html` for app navigation routes and to serve `/sw.js` from the site root with a JavaScript content type. The service worker only caches the app shell and same-origin build assets; live data still requires a network connection.

For Render, connect the Git repository containing this project and create a Blueprint from [`render.yaml`](./render.yaml). Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Render build-time environment variables before deploying if real accounts and live data are required; without them, the deployed site remains in sample/demo mode.

## Supabase setup

1. Create a Supabase project.
2. Review and apply [`supabase/schema.sql`](./supabase/schema.sql) in the SQL editor.
3. Configure the `application-documents` and `agency-documents` private storage buckets. The schema contains storage policies; do not make either bucket public.
4. Copy the project URL and anon/publishable key to `.env.local` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Never put a service-role key in browser configuration.
5. Deploy the `delete-account` Edge Function and set its `ALLOWED_ORIGINS` secret to the exact production web origins. Supabase service-role settings are available to the function runtime; keep them server-side.
6. Create the first admin role through a trusted administrative process. Never allow users to assign themselves the admin role.

The schema and Edge Function still require validation against the intended Supabase project and its retention/legal policies before production use.

## Payments and product integrations

Listing prices in the current UI are KSh 5,000 or SAR 289 for a 30-day standard listing, and KSh 20,000 or SAR 578 for a one-month premium plan. Admin review is required before publication. Payment references can be submitted for manual bank-transfer confirmation; M-Pesa and card checkout are not connected, and the UI must not be treated as proof of payment.

The map uses OpenStreetMap data/tiles and a public geocoder by default. Review the current provider usage policies and choose a production service with adequate quota and terms before launch. Currency conversion is indicative only. AI matching is a keyword-based preview, not a production AI recommendation.

Job verification is an internal platform review and is not a government endorsement. WhatsApp is offered only as direct employer contact for eligible approved premium listings; applications and identity documents must stay on GulfBridge.

## Android

The web project can be built and packaged with Capacitor:

```powershell
npm run build
npm run android:add
npm run android:sync
npm run android:open
```

Android Studio and a supported Android SDK are required to build, sign, and distribute the native app. The Android project has not yet been generated.

## Validation

```powershell
npm run build
npm run lint
```

Production launch also requires configured Supabase, tested private-file access and account deletion, an actual payment provider, operational support and moderation, security/privacy review, and legal review for recruitment and personal-data handling.
