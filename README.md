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
| `VITE_WS_URL` | no | Chat's live connection; defaults to the API host over `wss://` |
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

## What's on the site

**Customers:** Home, Explore (search, filters, trending, saved), Reels, artist
and service pages, reviews, Trend Decode, Learn with Annalia (courses, video
and PDF lessons with syllabus), booking (pick a date/time from live slots,
confirm with home/studio, address, notes and price breakdown), My Bookings
(detail, start/finish code, cancel with refund request, reschedule, write a
review), Messages (chat with the JUVI team, live), You (edit profile, saved
addresses, Refer & Earn, JUVI Rewards, notifications), Settings (notification
preferences, blocked accounts, help, terms & privacy, delete account).

**Artists** (`/partner`): Home (new bookings, stats, reels, learning),
Schedule (accept/decline, start/finish codes, cancel), Availability (working
hours, pause, Block time), Inbox, Earnings (withdraw, payout history,
bank/UPI details), Account (edit profile, services, portfolio, studio &
location, my reels with upload, reviews with replies, subscription,
analytics). Signed-in customers who aren't artists see their artist
application here (status, then four onboarding steps).

## Payments (stubbed)

Paytm is **stubbed** on the website: booking advance, remaining balance,
course purchase and subscription upgrade all go up to the pay step and then
show a clearly-labelled "PAYMENT PLACEHOLDER" with the pay button disabled.
Because of that the website does **not create bookings** — a booking only
exists once its advance is paid. Cancelling (with the refund request),
rescheduling and everything after payment work for bookings made in the app.

To switch payments on, the backend needs a web flow (a return/callback page
for the site and an endpoint that accepts it), and the site's domain must be
allowed in the Paytm dashboard. Then `PaymentStub` is replaced with Paytm's
JS checkout.

## Not the same as the app

- Studio location: the app drops a pin on a map; the site uses the browser's
  location ("Use my current location").
- Reel upload: MP4 only, up to 100 MB, no in-browser compression; the
  thumbnail is a frame grabbed from the video.
- Saved addresses live in this browser (the app keeps them on the phone —
  there's no address list on the backend).
- No push notifications; the notification settings control the app's alerts.

## Deploying (Vercel)

`vercel.json` builds with `npm run build`, serves `dist/`, and sends every
path to `index.html` (client-side routing), with long caching for hashed
files. Set the `VITE_*` settings in the Vercel project's Environment
Variables.

Outside this folder the site also needs:

1. **Firebase** (project used by the app): add a Web app if there isn't one
   (its config goes in the `VITE_FIREBASE_*` settings); add the site's
   domain under Authentication → Settings → Authorized domains; if the web
   API key has HTTP-referrer restrictions, add the site's domain there.
2. **Storage bucket CORS**: photo, Aadhaar, portfolio and reel uploads go
   straight from the browser to the bucket with signed URLs, so the bucket
   must allow `PUT` from the site's origin with the `Content-Type` header.
3. **Backend**: no change needed for what's live — CORS is already open and
   the site uses the same endpoints as the app.
4. **Google Maps key** (optional): only names the browser's location on Home.
5. **Paytm**: see Payments above.
