# Keelson market research

Researched November 20, 2026. Check anything here against the primary source before relying on it. Prices and competitors change.

## The short version

- **The law:** Transport Canada's Marine Safety Management System Regulations (SOR/2024-133) came into force July 3, 2024. They require a documented safety management system (SMS) on most Canadian commercial vessels, including small ones.
- **The deadline:** the last group, Class 5 (15 GT or less, not passenger-carrying, not a tug), must comply by **July 2, 2027**. Class 4 grace periods (small passenger boats, tugs, vessels over 15 GT) ended in 2025 and 2026, so many of those operators are already late.
- **It never ends:** the SMS must be kept up — drills, crew familiarization, incident and non-conformity reports, an internal review at least every 12 months, records kept 5 years. Newly registered vessels must comply within 6 months. That makes it a subscription, not a one-off sale.
- **The penalty:** fines up to $250,000.
- **The market:** 19,076 vessels on Transport Canada's Small Commercial Vessel Registry. About 10,400 are privately operated workboats, passenger boats and tugs that fall under the rules. About 1,300–1,800 new vessels register every year.
- **The gap:** no software is built for Canadian small-vessel operators. Today they buy consultant time (quoted per job), a $1,099 PDF manual, or a generic app from New Zealand that never mentions Canada.

## Who has to comply, and when

From Transport Canada's [SMS page](https://tc.canada.ca/en/marine-transportation/vessel-inspection-certification/safety-management-systems-marine-sector), [TP 15566](https://tc.canada.ca/en/marine-transportation/publications/tp-15566-guide-canadian-vessels-operators-compliance-marine-safety-management-system-regulations), and [Ship Safety Bulletin 05/2026](https://tc.canada.ca/en/marine-transportation/marine-safety/ship-safety-bulletins/marine-safety-management-system-regulations-second-anniversary-ssb-no-05-2026):

| Class | Who | Grace period ended |
| --- | --- | --- |
| 2 / 3 | 24 m or longer, or 500 GT+ | 2025 (passenger) / 2026 (other) |
| 4A | Under 24 m, over 15 GT | 2025 (passenger, >12 pax) / 2026 (other) |
| 4B | 15 GT or less, passenger (≤12) or tug | Certificate of Registry date after July 2, 2025 (over 7 m) / 2026 (up to 7 m) |
| 5 | 15 GT or less, everything else | **July 2, 2027** |

- Class 5 needs **no certificate** — just an up-to-date SMS manual on board and a named ship manager.
- Class 4B files declarations of compliance instead of applying for certificates.
- **Excluded:** fishing vessels up to 24.4 m and 150 GT, pleasure craft, human-powered vessels, unpowered vessels carrying no people/oil/chemicals. A sport-fishing *charter* with paying guests is a passenger vessel, not a fishing vessel.
- Transport Canada can check compliance at any time.

Note: sources disagree by a day on the Class 5 date (July 2 vs July 3, 2027). Use July 2 in sales; it's the earlier one.

## Market size: Transport Canada's own register

Source: [Small Commercial Vessel Registry](https://open.canada.ca/data/en/dataset/5cb32773-e7b1-4681-b82a-43cc39778c1a), open data, updated January 6, 2026. The file has no owner names (vessel facts only). Reproduce with `research/count_registry.py` and `research/segment_registry.py`:

```bash
python3 research/count_registry.py small-vessel-registry_dataset_en.xlsx
```

**By province:** BC 5,570 · ON 4,104 · QC 3,274 · NL 2,289 (+69 "NF") · AB 995 · NS 864 · MB 731 · NB 454 · PE 248 · SK 183 · NT 160 · YT 97 · NU 37. **Total 19,076.**

**By likely rule status (Canada / BC):**

| Segment | Canada | BC |
| --- | --- | --- |
| Workboats and other commercial (mostly Class 5) | 5,677 | 1,489 |
| Passenger-carrying (Class 4B / 4) | 4,494 | 2,341 |
| Tugs and towboats (Class 4B) | 208 | 96 |
| Public-sector style workboats (enforcement, SAR, research…) | 4,194 | 747 |
| Probably excluded (fishing, human-powered, CG auxiliary, unpowered barges) | 4,503 | 897 |

The first three rows, **about 10,400 vessels (3,900 in BC)**, are the core market. Public-sector boats may also be covered (provincial, municipal, First Nations guardian programs, SAR societies), but buying there goes through procurement, so they are a later segment.

**New registrations per year:** 2022: 1,144 · 2023: 1,815 · 2024: 1,605 · 2025: 1,435 · 2026 (to date): 1,282. Every new commercial vessel needs an SMS within 6 months, so demand continues after the 2027 deadline.

## Competitors (checked November 2026)

| Who | What | Price | Built for Class 5? |
| --- | --- | --- | --- |
| Lerus Canada (Nova Scotia) | PDF manual + forms for one Class 5 vessel | **$1,099** one-off; templates $190 | Yes, but the page still calls the rules "proposed" (© 2024) |
| Aurora Marine Safety Group (Gananoque, ON) | Consulting, "Class 5 Starter Pack" | Quote only | Yes; no software |
| Marine Surveys Canada | Custom manuals, consulting | Quote only | No |
| Broadwater Marine (Victoria, BC) | Surveys, ISM compliance consulting | Quote only | Blog only; dates inconsistent |
| Sea-Flux (NZ/AU/UK) | Real vessel-management app, offline, SMS module | Quote only, per vessel | No — no mention of Canada or Transport Canada |
| Helm CONNECT (Victoria, BC) | Enterprise fleet software (tugs, big fleets) | Enterprise | No — too big and expensive for one small boat |

**What this means:** the competition is people selling paper and hours. Nobody sells a cheap, Canadian, phone-first system that keeps the records. Consultants are better treated as **partners and resellers** than as enemies (see the playbook).

**Proof the category works:** Australia has required SMSs on all domestic commercial vessels for years (Marine Order 504). AMSA explicitly allows app-based SMSs and launched a "simplified SMS" for small vessels in June 2025. Apps like Sea-Flux grew there because of that rule. Canada is now where Australia was.

## Other ideas I checked and rejected

| Idea | Why not |
| --- | --- |
| Live "what's ripe" boards for u-pick farms | You don't want to sell websites. It also drifts toward web design. |
| Lien and holdback deadline software for Canadian trades | Real need (Levelset sold for ~$500M in the US and doesn't serve Canada), but **Markup** (getmarkup.ca) already sells it to Canadian trades at $49–89/mo across all provinces. The supplier niche is open but slow to sell into. **Runner-up.** |
| Canadian government-contract intelligence | Crowded in 2026: Boreal Insight, ProposalForge, Publicus, MERX, Biddingo, Jorpex. |
| Building-permit lead data | Cheap scrapers on Apify already sell per record; prices racing to zero. |
| BC pay transparency reports | The BC government gives employers a free reporting tool. |
| Executor / estate-settlement software | EstateExec already covers every province. |
| Self-managed strata software (BC) | Condo Control and StrataPress already serve it. |
| RV and boat storage marketplace | Storing RVs or boats commercially on farmland can break Agricultural Land Reserve rules; no clear shortage data. |
| Shared commercial-kitchen marketplace | The Food Corridor, Giggster and Peerspace already list BC kitchens. |
| BC fishing-regulation alerts app | The official FishingBC app is free. |

**The pattern:** in 2026 AI makes software cheap to build, so any niche you can find from a desk using public data fills up fast. Keelson is protected by things code can't copy: a hard legal deadline, buyers who are old-school and best reached on the dock, trust in a small marine community, and a founder who reaches them directly by phone and in person. The founder is based out of Calgary: BC (5,570 vessels) is a phone call or short flight away, and Alberta has 995 registered vessels of its own.

## Sources

- Marine Safety Management System Regulations, [SOR/2024-133](https://laws-lois.justice.gc.ca/eng/regulations/SOR-2024-133/FullText.html)
- Transport Canada, [Safety management systems in the marine sector](https://tc.canada.ca/en/marine-transportation/vessel-inspection-certification/safety-management-systems-marine-sector)
- Transport Canada, [TP 15566 compliance guide](https://tc.canada.ca/en/marine-transportation/publications/tp-15566-guide-canadian-vessels-operators-compliance-marine-safety-management-system-regulations)
- Transport Canada, [Ship Safety Bulletin 05/2026](https://tc.canada.ca/en/marine-transportation/marine-safety/ship-safety-bulletins/marine-safety-management-system-regulations-second-anniversary-ssb-no-05-2026)
- Transport Canada, [Small Commercial Vessel Registry (open data)](https://open.canada.ca/data/en/dataset/5cb32773-e7b1-4681-b82a-43cc39778c1a)
- AMSA (Australia), [Simplified SMS for smaller vessels](https://www.amsa.gov.au/news-community/news-and-media-releases/coming-soon-simplified-safety-management-system-smaller)
- Competitors: [Lerus Class 5 manual](https://www.lerus.ca/sms-development/customized-sms-manual-vessel-class5.html), [AMSG guide](https://www.amsg.ca/msmsr-guide), [Marine Surveys Canada](https://www.marinesurveyscanada.com/sms/), [Broadwater Marine](https://www.bwatermarine.com/post/do-i-need-a-safety-management-system-msmsr-requirements-by-vessel-class), [Sea-Flux](https://sea-flux.com/)
- Rejected-idea checks: [Markup](https://getmarkup.ca/), [Boreal Insight](https://borealinsight.ca/), [ProposalForge](https://proposalforge.io/canadian-contracts), [Publicus](https://publicus.ai/), [EstateExec Canada](https://estateexec.com/ca/FAQ.html), [StrataPress](https://stratapress.com/self-managed-stratas/), [ALC appeal on commercial boat storage](https://www.alc.gov.bc.ca/assets/alc/assets/legislation-and-regulation/compliance-and-enforcement/search-for-an-appeal/issue-50039-0946363-bc-ltd/50039_appeal_decision_-_november_13_2014.pdf), [FishingBC app](https://apps.apple.com/ca/app/fishingbc/id1202047514)
