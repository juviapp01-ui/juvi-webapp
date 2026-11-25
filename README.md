# JUVI website

The JUVI app for the browser — customer and artist — using the same backend
API as the mobile app. Phone-first layout; on a desktop it shows as a centred
app-width column.

Built with Vite, React 18, TypeScript, React Router, React Query and the
Firebase JS SDK. Screens are ported from the mobile app
(`../frontend/src/screens`) with the same colours, fonts, spacing and copy:
`src/lib/rn.ts` turns the app's React Native style numbers into CSS.

## Run it

Needs Node 20 or newer.

```bash
cd web
npm install
cp .env.example .env     # then fill in the values (see below)
npm run dev              # http://localhost:5173
```

Other commands:

```bash
npm run typecheck        # TypeScript only
npm run build            # typecheck + production build into dist/
npm run preview          # serve the production build locally
```

If a required setting is missing, the site shows a "Website settings missing"
page listing which ones, instead of failing.

## Settings (.env)

Names only — the values are yours and `.env` is never committed.

| Name | Required | What it is |
|---|---|---|
| `VITE_API_URL` | yes | The JUVI backend (same API the app uses) |
| `VITE_FIREBASE_API_KEY` | yes | Firebase **Web app** config, same project as the mobile app |
| `VITE_FIREBASE_AUTH_DOMAIN` | yes | 〃 |
| `VITE_FIREBASE_PROJECT_ID` | yes | 〃 |
| `VITE_FIREBASE_APP_ID` | yes | 〃 |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | no | 〃 |
| `VITE_GOOGLE_MAPS_KEY` | no | Only to name the browser's location on Home ("Dimapur"); without it the header says "Near You" |
| `VITE_PAYTM_ENV` | no | Not used yet — payments are stubbed (see below) |

Every `VITE_*` value ends up in the built site and is readable by anyone who
loads it — only browser-safe, public identifiers belong here.

## Sign-in

Firebase phone sign-in with invisible reCAPTCHA, then the backend's
`POST /auth/verify-firebase-token` — the same exchange the app makes. The
session (access + refresh token) is kept in `localStorage`; the API client
refreshes an expired token once for all waiting requests, like the app.

## Payments

Paytm is **stubbed** on the website: every flow goes up to the pay step and
then shows a clearly-labelled placeholder. The web flow needs backend and
Paytm dashboard work first (a web return page and the site's domain allowed
in Paytm).

## Deploying

`vercel.json` serves every path from `index.html` (client-side routing).
Outside this folder the site also needs: the domain added to Firebase
Authorized domains, the storage bucket's CORS allowing the site's origin
(direct photo/video uploads), and — for payments — the Paytm web setup.
