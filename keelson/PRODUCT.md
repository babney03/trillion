# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js (React), chosen by the user. Static export so the app runs offline on a phone and deploys to any static host (Netlify is connected). No server in the prototype: vessel data lives on the device.

## Users

Owners and skippers of small Canadian commercial vessels — workboats, aquaculture and crew boats, water taxis, sport-fishing charters, tour boats, small tugs. They are working mariners, not office workers: they use a phone at the dock or on deck, often in bright sun or rain, often with poor or no signal, and many are older and paper-first. A second user is the office person (owner, spouse, manager) who keeps the paperwork for a small fleet.

## Product Purpose

Keelson helps a small operator build and keep a Safety Management System (SMS) that meets Transport Canada's Marine Safety Management System Regulations (SOR/2024-133). It asks plain questions about the vessel and the work, drafts a tailored SMS manual, and then keeps the records the rules expect: drills, crew familiarization, checks, incidents and non-conformities, maintenance, and the annual internal review. Success: an operator who could pass a Transport Canada check on the boat, with the manual and five years of records in hand.

## Positioning

Built for the Canadian small-vessel classes (4B and 5) and their actual obligations — not a generic fleet-management suite from another country, and not a one-off PDF manual that goes stale in a drawer. The manual and the records live in one place that works offline on the boat.

## Operating Context

- Regulation: Marine Safety Management System Regulations, in force July 3, 2024. Class 5 (15 GT or less, not passenger-carrying, not a tug) must have a documented SMS by July 2, 2027. Class 4 grace periods ended in 2025–2026. Penalties up to $250,000. Records kept at least 5 years. Internal review at least every 12 months (TP 15566).
- Class 5 vessels need no certificate, only an up-to-date SMS manual on board. Class 4B passenger vessels (12 or fewer passengers) and small tugs file declarations of compliance.
- Guidance document: TP 15566, Transport Canada's compliance guide.
- Commercial fishing vessels under 24.4 m and 150 GT are excluded from these regulations.

## Capabilities and Constraints

- Prototype capabilities: vessel class finder, guided vessel setup, hazard register, generated SMS manual (print/save as PDF), record logs, a due-items view, backup export/import.
- Must work offline on a phone; data stays on the device until accounts and sync exist.
- Everything generated is a draft for the operator to review; the operator remains responsible for compliance. Keelson is not Transport Canada and not legal advice.
- Pricing: proposed in PLAYBOOK.md (Draft free; Keeper $390/vessel/yr; Fleet $290; set-up help $490), shown on the landing page; not yet validated with customers.
- Undecided: accounts/sync backend, French language, payment provider.

## Brand Commitments

- Name: Keelson (working name; trademark and domain not yet checked).
- Voice: plain, practical, deck-level language. Name the regulation precisely; never exaggerate fines or deadlines.

## Evidence on Hand

- Transport Canada Small Commercial Vessel Registry (open data, updated Jan 2026): 19,076 vessels; BC 5,570, ON 4,104, QC 3,274, NL 2,289. Analysis in research/.
- No customers, testimonials, partners or endorsements exist yet. Do not invent any. Demo vessels and records must be labelled as samples.

## Product Principles

1. Deck first: every task finishable one-handed on a phone, in sun, without signal.
2. Plain words over regulation-speak, with the exact rule cited where it matters.
3. Never claim certainty the operator should verify; show what is a draft.
4. Records over documents: the manual matters, the ongoing log proves it.

## Accessibility & Inclusion

Large touch targets, high contrast for outdoor use, readable by older eyes without zooming, works with system text-size settings.
