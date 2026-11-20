# Keelson playbook: how to run it

This is your operating manual. Read it top to bottom once, then use it as a checklist. Research and sources are in [`research/market.md`](research/market.md).

---

## 1. The business in one minute

**What you sell:** software that builds and keeps the safety management system (SMS) Transport Canada now requires on small commercial vessels: workboats, aquaculture boats, water taxis, charters, tugs.

**Why they buy:** it's the law. Class 5 vessels must have a documented SMS by **July 2, 2027**. Class 4 grace periods already ended, so many passenger boats and tugs are already behind. Fines go up to $250,000, and Transport Canada can check at any time.

**Why they keep paying:** the SMS has to be *used*: drills, crew sign-offs, incident reports, an annual review, and 5 years of records. A PDF in a drawer doesn't do that. Keelson does.

**Why you can win:**

- **No real competitor in Canada.** Today it's consultants quoting by the job, a $1,099 PDF, or an app built for New Zealand.
- **Biggest fleet, home turf.** BC has more of these vessels (5,570) than any other province, and you live in the middle of it.
- **Old-school buyers.** They're best reached on the dock, not online. That protects you from copycats who only know how to build software.

**The honest risks** (and what to do about each) are in section 9.

---

## 2. How it makes money

### Pricing (my recommendation; change it once real customers react)

| Plan | What they get | Price (CAD, + GST) |
| --- | --- | --- |
| **Draft** | Class finder and full draft manual, preview only | Free |
| **Keeper** | Issue and print the manual, all records, reminders, annual review | **$390 / vessel / year** |
| **Fleet** | Keeper for 3+ vessels under one ship manager | **$290 / vessel / year** |
| **Set-up help** | You tailor it with them, by phone or at the dock | **$490 once** |
| **Founding operator** | First 25 vessels only, for feedback and (with permission) a quote | **$195 first year**, then normal price |

**Why annual:** boats are seasonal, and operators already pay insurance and licences yearly. Annual billing kills winter cancellations.

**Why these numbers:** the alternative is a $1,099 PDF that goes stale, or a consultant at $1,500+. $390/year is cheaper than both, and it keeps the system alive.

### What it costs you to run

| Item | Cost |
| --- | --- |
| Hosting (Netlify, static site) | $0 to start |
| Domain | ~$20/year |
| Business email (Google Workspace or similar) | ~$10/month |
| Stripe (card payments) | ~2.9% + 30¢ per payment |
| Database and accounts, once added (e.g. Supabase) | $0 to start, ~$35/month later |
| Expert content review (marine consultant) | ~$1,000–2,500 one-time, then small yearly updates |
| Liability insurance (E&O / professional) | Get quotes; budget ~$1,000–2,000/year |
| Lawyer for terms of service and disclaimer | ~$500–1,500 one-time |

Gross margin is above 90%. Your real cost is your time, which is why channels and partners (section 6) matter.

### What revenue looks like

Assume an average of **$360 per vessel per year** (mix of Keeper and Fleet), plus set-up help on about 1 in 4 new vessels.

| Paying vessels | Share of core market (~10,400) | Subscription revenue / year | + set-up help |
| --- | --- | --- | --- |
| 100 | 1% | $36,000 | ~$12,000 |
| 500 | 5% | $180,000 | ~$61,000 |
| 1,000 | 10% | $360,000 | ~$122,000 |
| 2,500 | 24% | $900,000 | ~$306,000 |

Set-up help is one-time, so count it only in the year a vessel joins. These are scenarios, not forecasts. The first 100 vessels are the hard part.

---

## 3. Week one: set up the company

Do these in order. None of them needs the product to be finished.

1. **Check the name.** Search "Keelson" in the [Canadian Trademarks Database](https://ised-isde.canada.ca/cipo/trademark-search/srch) and check the domains (`keelson.ca`, `getkeelson.ca`). If it's taken in software or marine, pick another name now, before you print anything. Renaming in the code takes me five minutes.
2. **Register the business.** As a BC sole proprietor, register a business name with [BC Registries](https://www.bcregistry.gov.bc.ca/) (name request plus registration, roughly $70–100). Incorporate later, once revenue is real or you take on risk you want to separate from yourself.
3. **Get a CRA business number.** You must register for GST/HST once your taxable sales pass **$30,000 over four consecutive quarters**. You can register earlier if you want to claim the GST you pay on expenses.
4. **Open a business bank account,** and keep business money separate from day one.
5. **Open a Stripe account** for card payments (don't take payments until step 4 of section 4 is done).
6. **Set up bookkeeping:** Wave (free) or QuickBooks. Save every receipt.
7. **Get insurance quotes** for professional liability / E&O. You're selling a safety-compliance tool, so this matters.
8. **Book a lawyer** to review your terms of service and disclaimer: Keelson drafts, the operator is responsible, no legal advice, no Transport Canada affiliation.

---

## 4. Before you charge anyone: finish the product

The prototype in this folder works: class finder, vessel setup, hazard register, generated manual, records, due list, print to PDF, offline. Here is what's missing, in priority order. I can build each of these with you in later sessions.

1. **Expert review of the content. Non-negotiable.** Pay a marine consultant or master mariner (pick someone from Transport Canada's list of SMS helpers) to review every hazard, procedure and checklist in `lib/library.ts` against TP 15566. Put their review date in the app. This is your credibility.
2. **Accounts and cloud sync.** Right now data lives only on one phone. If the phone goes overboard, the records go with it. Add sign-in and sync before you have paying customers.
3. **Payments and plan gating.** Stripe checkout; Draft stays free, and issuing and printing need Keeper.
4. **Email reminders** for drills due, certificate expiries and the annual review.
5. **Fleet view** for ship managers with several boats.
6. **French** before you sell in Quebec (3,274 registered vessels).
7. **Later:** photos on records, signature capture on the phone, crew sign-off on their own phones.

**Deploy now anyway.** Put the free version live (Netlify is already connected; ask me) so you can show it on the dock and collect interest.

---

## 5. Talk to 15 operators before building more

Don't guess what they need. Go and ask. Aim for 15 real conversations in the first three weeks.

**Where:** public docks and harbours on Vancouver Island, such as Nanaimo, Ladysmith, Cowichan Bay, Comox, Campbell River, Port Hardy, Tofino/Ucluelet and Victoria. Look for workboats, aquaculture crew boats, water taxis, whale-watching and fishing-charter boats, and small tugs. Early morning and late afternoon are when skippers are at the boat but not rushing.

**What to ask** (listen more than you talk):

1. "Have you heard about the new safety management system rules?"
2. "What have you done about it so far?"
3. "Who's helping you, and what did it cost?"
4. "How do you keep track of drills and crew training now?"
5. "If something did all of this on your phone, what would make you trust it?"
6. "What would you expect to pay per year?"

Write notes after every conversation: boat type, class, status, pain, price reaction. After 15, you'll know whether to change the pricing, the features or the pitch.

---

## 6. How to sell it

### Channels, in the order to try them

1. **Dock walks and direct conversations (Vancouver Island first).** The slowest channel, but the one that teaches you the most. Carry a phone with the class finder open. Leave a one-page flyer with a QR code to the free draft.
2. **Small-vessel training schools.** Every new commercial operator takes courses like SVOP and MED. Offer schools a free draft for every student, with a discount code that pays the school a referral fee. Students go straight from the course into your product.
3. **Associations.** Shellfish growers, salmon farmers, sport-fishing, whale-watching, tug and towing, and wilderness tourism groups all have members facing this deadline. Offer a free 20-minute talk at a meeting ("What the SMS rules mean for your boat") plus a member discount.
4. **Marine consultants.** Don't fight them; supply them. Give consultants a wholesale price so they deliver faster with Keelson and keep the client relationship. Transport Canada publishes a list of SMS consultants; that list is your partner pipeline.
5. **Marine insurance brokers.** Insurers want safer clients. Ask brokers to recommend Keelson to small commercial policyholders, and offer them a referral fee or co-branded flyers.
6. **Content.** Write plain answers to the questions operators search for: "Do I need an SMS for my water taxi?" or "What is a Class 5 vessel?" The free class finder is your best lead magnet. Short videos filmed on the dock work well for this audience.
7. **Transport Canada's own meetings.** Transport Canada holds regional Canadian Marine Advisory Council (CMAC) meetings where operators discuss regulations. Attend and listen; that's where your buyers' worries are spoken out loud.

**Not yet:** paid ads. Don't spend on ads until you have 25 paying vessels and know which message works.

### Scripts (skeletons; say them your way)

**On the dock:**

> "Morning. Quick one: have you sorted out the new safety management system rules for the boat yet? … I built a tool that works out your class and deadline in about thirty seconds. Want to see what it says for yours?"

Then hand them the phone. Let the class finder do the talking.

**Email to an operator** (published business address only, and always relevant to their business):

> Subject: [Boat name] and the July 2027 SMS deadline
>
> Hi [Name],
>
> I'm [you], based in Nanaimo. Under Transport Canada's Marine Safety Management System Regulations, [boat type] like yours need a documented safety management system by July 2, 2027, and it has to be kept up with drills and records after that.
>
> I built Keelson to make that simple: it drafts the manual from a few questions and keeps the records on your phone, even offline. The draft is free: [link].
>
> If it's useful, I'm happy to set it up with you at the dock.
>
> [Name] · [phone] · [business name, address]
> Reply "no thanks" and I won't email again.

**Canada's anti-spam law (CASL):** B2B email to a publicly listed business address is generally allowed when it's relevant to their work and they haven't said "no unsolicited messages". Every email must name you and your business, include a mailing address, and offer a working way to opt out. Keep a do-not-contact list and honour it. Phone calls and dock visits aren't covered by CASL.

### Objections and answers

| They say | You say |
| --- | --- |
| "I'll just use Transport Canada's guide myself." | "You can. The guide tells you what to include; Keelson writes it for your boat and keeps the records the guide asks for. Try the free draft and compare." |
| "I already paid a consultant." | "Good. Keep the manual. Keelson keeps the drills, crew sign-offs and reviews that prove it's in use, and reminds you when they're due." |
| "I'm too small for this." | "Class 5 is exactly the small boats: 15 tonnes or less. That's who the 2027 deadline is for." |
| "Is this approved by Transport Canada?" | "No software is. Transport Canada doesn't approve SMS tools or consultants. Keelson is built on their own guide, and you review and sign it." |
| "I run a fishing boat." | "Then these rules probably don't cover you; fishing vessels under 24.4 m are excluded. Unless you take paying guests: then it's a passenger vessel." |
| "I'm not good with phones." | "That's what set-up help is for. We'll do it together at the dock, and you can print everything for the binder." |

**Never exaggerate.** Don't invent inspections, fines or deadlines. Fear sells once; trust sells for years in a small community where everyone talks.

---

## 7. Onboarding a new customer (about 30 minutes)

1. Run the class finder together and confirm the class.
2. Set up the vessel, the ship manager and the crew, with certificate expiry dates.
3. Walk the hazard register. Ask "What's the worst thing that's happened on this boat?" and add anything missing.
4. Read the policy aloud and put it in their words.
5. Issue revision 1 and print it for the boat.
6. Book the first drill on the spot, and log it when it happens.
7. Show them how to save a backup (until cloud sync exists).
8. Check in after 7 days ("Did you log the drill?") and after 30 days.

**Activation goal:** revision 1 issued and one record logged within 7 days. Customers who do that stay; customers who don't, drift.

---

## 8. Running it week to week

| When | What |
| --- | --- |
| Monday | Review the pipeline: who you talked to, who's trying the draft, who needs a nudge. |
| Tuesday–Thursday | Selling and onboarding: dock visits, calls, partner meetings, set-ups. |
| Friday | Product and content: fix what customers complained about, publish one useful post or video. |
| Monthly | Review the numbers below. Back up everything. |
| Quarterly | Regulation watch: check Transport Canada's Ship Safety Bulletins and TP 15566 for changes, and update the content. |

### Numbers to watch

- **Paying vessels** and **annual recurring revenue**, your two headline numbers.
- **Activation:** % of new vessels that issue revision 1 within 7 days.
- **Use:** records logged per vessel per month. Zero means they're about to churn.
- **Conversion:** free drafts that become paid.
- **Renewal rate** at the one-year mark.
- **Source:** where each customer came from, so you know which channel to double.

---

## 9. Honest risks and how to handle them

| Risk | What to do |
| --- | --- |
| **Content is wrong and someone relies on it.** | Expert review before launch, clear "draft, you're responsible" language, terms of service, liability insurance. |
| **You're not a mariner, so skippers don't trust you.** | Put your expert reviewer's name and credentials on the product. Show up on the dock in person. Consider making a respected local mariner a paid advisor or partner. |
| **Transport Canada publishes free templates.** | Templates were never your product. Records, reminders, inspection-ready printouts and your help are. |
| **The rush ends after July 2, 2027.** | Annual subscriptions; about 1,300–1,800 new vessels register every year and each needs an SMS within 6 months; then expand to new segments (section 10). |
| **Records lost with a phone.** | Cloud sync is priority #2 in section 4. Until then, teach backups at every set-up. |
| **Operators are slow to adopt.** | Set-up help, printouts, training-school and association channels, and patience. |
| **A bigger company copies you.** | Be the local, trusted, Canadian-specific option first, and lock in partners (schools, consultants, brokers) before anyone else does. |

---

## 10. How it scales when money comes in

**Stage 1: 0 → 100 vessels (you, Vancouver Island).** You do everything. Goal: prove people pay and keep using it. Finish section 4's top three items.

**Stage 2: 100 → 500 vessels (all of BC, plus partners elsewhere).** Triggers and moves:
- Onboarding takes more than 10 hours a week → hire a part-time onboarding person. A semi-retired mariner is ideal: instant trust.
- Revenue passes $30k → register for GST if you haven't.
- Selling outside BC → partner with consultants and schools in Atlantic Canada and Ontario.
- Quebec demand → French version.
- Incorporate, get an accountant.

**Stage 3: 500 → 2,000 vessels (national).**
- First full-time hire: customer success and sales.
- Reseller program for consultants; formal insurer partnerships.
- Features for bigger vessels (Class 4A and 3: certificates and applications), maintenance planning, crew certificate tracking across fleets.
- Public-sector fleets (municipal, provincial, First Nations guardian programs, search-and-rescue societies) through procurement.

**Stage 4: beyond small-vessel SMS.**
- **Commercial fishing vessels:** about 13,000 small ones sit on the same register. They're excluded from these rules, but the Fishing Vessel Safety Regulations ask for written safety procedures and drills. Check the exact requirements first.
- Other countries with similar rules (Australia, New Zealand, the UK, US towing vessels), where competitors already exist, so go only with a clear edge.
- At this point Keelson becomes interesting to marine software companies and insurers as an acquisition.

**The rule for spending money:** only spend on what removes your current bottleneck. Early on that's credibility (the expert review) and trust (showing up). Later it's your time (hiring). Ads come last.

---

## 11. What not to do

- Don't claim Transport Canada approval, or let anyone think you're affiliated.
- Don't give legal advice. You provide a tool and help using it; the operator decides.
- Don't build features nobody has asked for twice.
- Don't buy ads before 25 paying vessels.
- Don't use fear. Be the calm, accurate one.
- Don't sell in Quebec in English only.
- Don't skip backups (yours and theirs).

---

## 12. Your next 7 days

- [ ] Read this playbook and `research/market.md` once.
- [ ] Check the Keelson name and domain (section 3, step 1).
- [ ] Ask me to deploy the free version to Netlify so you have a link to show.
- [ ] Open the app with the sample vessel and click through every screen on your phone.
- [ ] Visit two harbours and have your first 5 conversations (section 5).
- [ ] Find and contact two marine consultants about reviewing the content (section 4, item 1).
- [ ] Register the business name and open a bank account (section 3).

When you've done the first conversations, come back and tell me what you heard. We'll adjust the product and pricing to match.
