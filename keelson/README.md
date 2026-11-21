# Keelson

Safety management system (SMS) software for small Canadian commercial vessels: workboats, aquaculture boats, water taxis, charters and tugs.

Transport Canada's Marine Safety Management System Regulations (SOR/2024-133) require a documented SMS on most commercial vessels; the last group (Class 5) must comply by **July 2, 2027**. Keelson finds an operator's class and deadline, drafts a tailored SMS manual, and keeps the records the rules expect: drills, crew familiarization, checks, incident reports, maintenance and the annual review. It works offline on a phone.

## What's here

| Path | What it is |
| --- | --- |
| [`PLAYBOOK.md`](PLAYBOOK.md) | **How to run the business**: pricing, setup, selling, onboarding, metrics, scaling, risks, next 7 days |
| [`research/market.md`](research/market.md) | The evidence: the regulation, market size from Transport Canada's registry, competitors, rejected ideas, sources |
| `app/page.tsx` | Landing page with the free class finder |
| `app/app/page.tsx` → `components/KeelsonApp.tsx` | The app: setup, Today (what's due), Boat & crew, Hazards, Manual, Records |
| `components/Manual.tsx` | The generated SMS manual (prints to PDF) |
| `lib/classify.ts` | Vessel class and deadline logic |
| `lib/library.ts` | Starting hazards, procedures and checklists — **must be reviewed by a marine expert before selling** |
| `lib/store.ts` | On-device storage, sample vessel, due-item logic |
| `public/sw.js` | Offline cache |
| `PRODUCT.md`, `DESIGN.md` | Product brief and design system |

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000. To build the static site (output in `out/`):

```bash
npm run build
```

Any static host can serve `out/`.

## Live site

**https://keelson-sms.netlify.app** (Netlify site `keelson-sms`, free version, no accounts or payments yet).

To redeploy after changes, build and upload `out/`:

```bash
npm run build
```

```bash
npx netlify-cli deploy --dir=out --prod --site=keelson-sms
```

Or drag the `out` folder onto the site's Deploys page in Netlify. `netlify.toml` holds the build settings if the site is later linked to this repo (base directory `keelson`).

Note: new sites on this Netlify team default to "team login required". Keelson's site has it switched off so anyone with the link can open it.

## Status

Working prototype. Data stays on the device (no accounts yet), there are no payments, and the safety content is a draft that has not yet been reviewed by a marine professional. See PLAYBOOK.md section 4 for the build list before charging customers.

Keelson is not affiliated with or endorsed by Transport Canada.
