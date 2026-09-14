/**
 * Realistic development fixtures. These are problems people actually have —
 * lorem ipsum makes it impossible to judge whether the product reads well.
 */

export interface SeedUser {
  name: string;
  username: string;
  email: string;
  bio?: string;
  role?: "user" | "moderator" | "admin";
  reputation: number;
}

export const SEED_USERS: SeedUser[] = [
  { name: "Alex Mwangi", username: "alex", email: "alex@example.com", bio: "Renting in Nairobi. Interested in housing and anything that wastes people's time.", reputation: 842 },
  { name: "Sarah Lindqvist", username: "sarah", email: "sarah@example.com", bio: "Building tools for small clinics. Ex-nurse.", reputation: 1310 },
  { name: "Diego Fernández", username: "diego", email: "diego@example.com", bio: "Transit nerd. Buenos Aires.", reputation: 465 },
  { name: "Priya Raghavan", username: "priya", email: "priya@example.com", bio: "Working on financial access for gig workers in India.", reputation: 980 },
  { name: "Tom Becker", username: "tom", email: "tom@example.com", bio: "Freelance dev. Mostly annoyed by invoicing.", reputation: 288 },
  { name: "Amina Yusuf", username: "amina", email: "amina@example.com", bio: "Teacher. Interested in how people actually learn.", reputation: 612 },
  { name: "Nathan Okafor", username: "nathan", email: "nathan@example.com", bio: "Logistics. Lagos.", reputation: 174 },
  { name: "Mei Tanaka", username: "mei", email: "mei@example.com", bio: "Designer. Care about accessibility and elder tech.", reputation: 726 },
  { name: "Liam O'Connor", username: "liam", email: "liam@example.com", bio: "Small farm, big spreadsheets.", reputation: 95 },
  { name: "Fatima Haddad", username: "fatima", email: "fatima@example.com", bio: "Public health researcher.", reputation: 1540, role: "moderator" },
  { name: "Grace Adeyemi", username: "grace", email: "grace@example.com", bio: "Parent of two. Everything takes three apps.", reputation: 402 },
  { name: "Marco Rossi", username: "marco", email: "marco@example.com", bio: "Restaurant owner, reluctant software buyer.", reputation: 231 },
];

export interface SeedProblem {
  title: string;
  category: string;
  author: string;
  description: string;
  status?: "open" | "being_solved" | "solved" | "not_relevant";
  location?: { scope: "global" | "country" | "city"; country?: string; city?: string };
  isAnonymous?: boolean;
  validations: number;
  daysAgo: number;
}

export const SEED_PROBLEMS: SeedProblem[] = [
  {
    title: "Finding trustworthy roommates is genuinely risky",
    category: "housing",
    author: "alex",
    validations: 2431,
    daysAgo: 4,
    description:
      "Finding a roommate online means meeting a stranger from a Facebook group, handing over a deposit, and hoping. There is no way to verify that the person is who they say they are, that they actually live at the address, or that the last three people who lived with them left on good terms.\n\nThe listing sites optimise for volume, not safety. Scams are common: fake listings, deposits taken for apartments that do not exist, and \"landlords\" who are travelling abroad and will post the keys. Nobody is checking anything.\n\nWhat is missing is a lightweight way to establish that two people are real, are who they claim to be, and are roughly compatible — before money changes hands.",
  },
  {
    title: "Rental deposits disappear and there is no practical way to fight it",
    category: "housing",
    author: "diego",
    validations: 1806,
    daysAgo: 11,
    description:
      "At the end of a tenancy the landlord deducts \"cleaning\" and \"damage\" from the deposit with no itemised evidence. The amounts are small enough that taking it to a tribunal costs more in time than the money is worth, so almost everyone gives up.\n\nThe asymmetry is the whole problem: the landlord holds the money and the tenant carries the burden of proof, usually with a few blurry phone photos taken on move-in day.",
  },
  {
    title: "Nobody can tell which online course is actually worth the money",
    category: "education",
    author: "amina",
    validations: 1522,
    daysAgo: 7,
    description:
      "Every course page shows a 4.7 rating and \"50,000 students enrolled\". None of them tell you the completion rate, how many people who finished got the outcome they wanted, or how out of date the material is.\n\nReviews are written in the first week, when everyone is still enthusiastic. The people who quit in week three do not leave reviews at all — which is exactly the signal a buyer needs.",
  },
  {
    title: "Getting a same-week appointment with a GP is nearly impossible",
    category: "health",
    author: "sarah",
    validations: 3140,
    daysAgo: 19,
    status: "being_solved",
    description:
      "Phone lines open at 8am, are engaged until 8:12am, and by then the slots are gone. The alternative is a walk-in clinic with a four-hour wait, or an emergency department visit that costs the system twenty times as much.\n\nThe scheduling itself is the bottleneck, not the number of doctors. Cancellations go unfilled because there is no mechanism to offer a freed slot to the next person who wants it.",
  },
  {
    title: "Freelancers spend days every month chasing unpaid invoices",
    category: "work",
    author: "tom",
    validations: 1247,
    daysAgo: 6,
    description:
      "A 30-day invoice becomes 60 days, then 90. Chasing it means writing polite emails that feel like begging, to a finance inbox that never replies. Small suppliers have no leverage and no realistic legal route for a few thousand in unpaid work.\n\nThe cost is not just cash flow. It is the hours spent following up, and the relationship damage from having to ask repeatedly.",
  },
  {
    title: "Gig workers cannot get a loan because their income looks unstable",
    category: "finance",
    author: "priya",
    validations: 2078,
    daysAgo: 13,
    description:
      "Drivers, delivery riders and freelancers earn consistently but irregularly. Every lender's model expects a salary slip, so a rider who reliably clears the same amount every month is treated as higher risk than a salaried employee earning less.\n\nThe data exists — platform earnings history is far richer than a payslip — but there is no accepted way to present it to a lender.",
  },
  {
    title: "Public transport apps do not tell you when a bus is actually full",
    category: "transportation",
    author: "diego",
    validations: 894,
    daysAgo: 9,
    location: { scope: "city", country: "Argentina", city: "Buenos Aires" },
    description:
      "The app says the bus arrives in 4 minutes. It does not say the bus is already at capacity and will not stop. You watch two go past and arrive late anyway.\n\nOccupancy data exists on newer fleets and is simply not exposed to riders.",
  },
  {
    title: "Grocery prices change so often that comparing shops is pointless",
    category: "food",
    author: "grace",
    validations: 1105,
    daysAgo: 3,
    description:
      "Prices shift weekly, promotions are per-store, and unit pricing is inconsistent — one shop lists per 100g, another per item. Working out where a basket is actually cheapest takes longer than the saving is worth.\n\nFor people on a tight budget this is not a convenience issue. It is tens of pounds a month.",
  },
  {
    title: "Elderly relatives get locked out of services that went app-only",
    category: "society",
    author: "mei",
    validations: 1963,
    daysAgo: 22,
    description:
      "Banking, prescriptions, council services, parking — all moved to apps that assume a smartphone, an email address, a password manager and two-factor authentication. My mother has none of those, and the phone line she used to call was closed because \"most customers prefer digital\".\n\nThe result is a growing population that cannot independently do things they did unaided five years ago.",
  },
  {
    title: "Recycling rules differ by street and nobody knows the right answer",
    category: "environment",
    author: "liam",
    validations: 743,
    daysAgo: 15,
    description:
      "One council takes soft plastics, the next does not. Move house and the rules change entirely. The symbols on packaging are designed for the manufacturer, not for the person standing over three bins.\n\nSo people guess, and contaminated loads get landfilled anyway — which means careful sorting achieves nothing.",
  },
  {
    title: "Returning an online order costs more than the item is worth",
    category: "shopping",
    author: "marco",
    validations: 656,
    daysAgo: 5,
    description:
      "Return shipping, a printer you do not own, a drop-off point that is a 25-minute drive away, and a 14-day window that starts from dispatch. Below about £30 it is cheaper to keep something you do not want.\n\nRetailers know this, which is why the friction is deliberate.",
  },
  {
    title: "Childcare availability is invisible until you are already on a waitlist",
    category: "family",
    author: "grace",
    validations: 1388,
    daysAgo: 17,
    description:
      "Nurseries do not publish availability. You call twenty places, join twelve waitlists, pay deposits on three, and hope. Meanwhile you cannot tell an employer when you can return to work.\n\nThe information is simply not shared anywhere — every family independently rediscovers the same local landscape.",
  },
  {
    title: "Visa requirements are written to be technically correct, not understandable",
    category: "travel",
    author: "nathan",
    validations: 1174,
    daysAgo: 26,
    description:
      "Official pages describe categories, not situations. Nowhere does a page say \"you are a Nigerian citizen, employed, travelling to Germany for a nine-day conference — here is the exact list\". So people pay agents hundreds to read the same public page for them, and still get rejected on a detail.",
  },
  {
    title: "Small restaurants pay for five systems that do not talk to each other",
    category: "work",
    author: "marco",
    validations: 512,
    daysAgo: 8,
    description:
      "Point of sale, bookings, delivery platform, stock, payroll. Five subscriptions, five logins, and none of them share data, so the same order gets keyed in twice and the stock count is always wrong by Friday.\n\nEvery one of them is fine on its own. Together they eat an hour a day.",
  },
  {
    title: "There is no way to know if a charity actually spends money well",
    category: "society",
    author: "fatima",
    validations: 927,
    daysAgo: 30,
    description:
      "Annual reports are marketing documents. \"87% goes to programmes\" is an accounting choice, not a measure of impact. Independent evaluators cover a handful of large organisations and nothing local.\n\nSo donations follow emotional appeals rather than evidence, which rewards good storytelling over good work.",
  },
  {
    title: "Password resets are now the main way accounts get stolen",
    category: "technology",
    author: "tom",
    validations: 1621,
    daysAgo: 12,
    description:
      "Every service funnels recovery through email or SMS. Compromise one inbox or convince one mobile carrier to swap a SIM, and everything else falls over in sequence.\n\nWe added multi-factor authentication to the front door and left the back door on a knock-twice system.",
  },
  {
    title: "Job listings hide salary, wasting everyone's time",
    category: "work",
    author: "alex",
    validations: 2894,
    daysAgo: 2,
    description:
      "Four interview rounds, eleven hours, then an offer 40% below expectation. Both sides knew their number on day one and neither was allowed to say it.\n\nThe stated reason is \"negotiation flexibility\". The actual outcome is a market where nobody can price themselves.",
  },
  {
    title: "Medical records do not follow the patient between providers",
    category: "health",
    author: "sarah",
    validations: 2216,
    daysAgo: 24,
    status: "being_solved",
    description:
      "Change city, change insurer, or get referred to a specialist, and your history restarts. Tests get repeated, allergies get re-asked, and the same scan is done twice in eight weeks because one system cannot read the other's format.\n\nPatients are the only party present at every appointment, and they are the one party with no copy of the record.",
  },
  {
    title: "Second-hand marketplaces are full of scams and no-shows",
    category: "shopping",
    author: "nathan",
    validations: 834,
    daysAgo: 10,
    description:
      "Half the messages are bots asking to \"pay via a courier service\". The other half arrange a meeting and never turn up. Buying anything expensive means meeting a stranger with cash.\n\nThe platforms take no responsibility because no payment ever touches them.",
  },
  {
    title: "Learning a language stalls at the point conversation starts",
    category: "education",
    author: "mei",
    validations: 1489,
    daysAgo: 20,
    description:
      "Apps get you to confident beginner and then plateau. What is missing is unglamorous: low-stakes, regular conversation with a patient human, which is expensive and hard to schedule.\n\nSo people restart the same beginner course every January.",
  },
  {
    title: "Bank fraud alerts block real purchases and miss real fraud",
    category: "finance",
    author: "priya",
    validations: 1057,
    daysAgo: 14,
    description:
      "Card declined buying coffee in a city you visit weekly. Meanwhile a £900 charge in another country goes through untouched.\n\nThe models optimise for the bank's loss rate, not the customer's inconvenience, and the customer has no way to say \"I am here, this is me\" in advance.",
  },
  {
    title: "Nobody reads terms of service and that is now a safety problem",
    category: "technology",
    author: "fatima",
    validations: 1342,
    daysAgo: 28,
    isAnonymous: true,
    description:
      "Forty pages of legal text to use a messaging app. Everyone clicks accept. Buried in there are data sharing terms, arbitration clauses and licence grants nobody would agree to if asked plainly.\n\nConsent that everybody gives without reading is not consent — it is a formality.",
  },
  {
    title: "Local tradespeople are impossible to evaluate before hiring",
    category: "local-problems",
    author: "liam",
    validations: 689,
    daysAgo: 16,
    description:
      "Review sites are pay-to-play and the good tradespeople are too busy to be on them. You get three quotes with a 4x spread and no way to tell which one reflects a better job rather than a better guess.",
  },
  {
    title: "Group expense splitting still ends in awkward conversations",
    category: "relationships",
    author: "grace",
    validations: 573,
    daysAgo: 21,
    status: "solved",
    description:
      "Someone fronts the accommodation, someone else buys all the food, one person leaves early. The apps handle arithmetic but not the part people find hard: asking for the money afterwards.",
  },
];

export interface SeedSolution {
  problemTitle: string;
  author: string;
  title: string;
  description: string;
  helpful: number;
  status?: "proposed" | "building" | "shipped";
  url?: string;
  daysAgo: number;
}

export const SEED_SOLUTIONS: SeedSolution[] = [
  {
    problemTitle: "Finding trustworthy roommates is genuinely risky",
    author: "sarah",
    title: "A verified roommate network built on institutional email",
    helpful: 428,
    daysAgo: 3,
    status: "building",
    description:
      "Verify people through an address that an institution already checked — a university, a hospital, a large employer. That gets you a real identity without asking anyone to upload a passport to a startup.\n\nLayer on lightweight compatibility signals (sleep schedule, guests, cleanliness) and a mutual reference system where previous flatmates confirm the tenancy ended normally. No public star ratings — just verified facts.",
  },
  {
    problemTitle: "Finding trustworthy roommates is genuinely risky",
    author: "tom",
    title: "Escrow the deposit until both parties confirm move-in",
    helpful: 205,
    daysAgo: 2,
    description:
      "Most of the financial damage comes from deposits paid before anyone sees a key. Hold the money with a third party and release it 24 hours after the tenant confirms they are physically in the property. This alone kills the entire \"landlord is abroad, I'll post the keys\" scam category.",
  },
  {
    problemTitle: "Rental deposits disappear and there is no practical way to fight it",
    author: "alex",
    title: "Timestamped move-in condition reports both parties sign",
    helpful: 312,
    daysAgo: 8,
    description:
      "A structured walkthrough on move-in day: room by room, photo per item, both parties sign digitally. Store it somewhere neither party controls.\n\nThis does not require new law. It just moves the burden of proof from \"tenant's memory\" to \"a document the landlord already agreed to\".",
  },
  {
    problemTitle: "Getting a same-week appointment with a GP is nearly impossible",
    author: "fatima",
    title: "Automatic cancellation fill from a standby list",
    helpful: 587,
    daysAgo: 12,
    status: "shipped",
    url: "https://example.org/standby-scheduling",
    description:
      "Roughly one in eight appointments is cancelled or missed. Today those slots evaporate. A standby list that texts the next suitable patient the moment a slot frees up recovers most of them with zero extra clinical capacity.\n\nTrials of this in a handful of practices cut the average wait by several days without hiring anyone.",
  },
  {
    problemTitle: "Getting a same-week appointment with a GP is nearly impossible",
    author: "sarah",
    title: "Triage by symptom before allocating a slot type",
    helpful: 241,
    daysAgo: 10,
    description:
      "Not every appointment needs fifteen minutes with a doctor. A structured intake form routes prescription renewals to a pharmacist, test results to a nurse, and keeps the doctor's slots for the cases that need them.",
  },
  {
    problemTitle: "Freelancers spend days every month chasing unpaid invoices",
    author: "priya",
    title: "Escalating reminders that go out without you writing them",
    helpful: 268,
    daysAgo: 4,
    description:
      "The emotional cost is what stops people chasing. Automate the sequence — day 1 polite, day 14 firmer with the contract terms quoted, day 30 formal notice with statutory late-payment interest calculated.\n\nIt stops being a personal ask and becomes a process, which is exactly how the client's finance team already treats it.",
  },
  {
    problemTitle: "Gig workers cannot get a loan because their income looks unstable",
    author: "priya",
    title: "A portable earnings record signed by the platform",
    helpful: 394,
    daysAgo: 9,
    status: "building",
    description:
      "Platforms already know exactly what a rider earned every week for two years. Let the worker export that as a signed, verifiable document they own and can hand to any lender.\n\nThe worker controls disclosure; the lender gets better data than a payslip; the platform does not become a credit bureau.",
  },
  {
    problemTitle: "Job listings hide salary, wasting everyone's time",
    author: "alex",
    title: "Filter out listings with no salary band, at the aggregator level",
    helpful: 731,
    daysAgo: 1,
    description:
      "Legislation is slow and patchy. A faster lever: job boards and aggregators default to hiding listings without a published band, and candidates get a one-click filter.\n\nEmployers respond to applicant volume far more quickly than they respond to regulation.",
  },
  {
    problemTitle: "Medical records do not follow the patient between providers",
    author: "sarah",
    title: "Patient-held record with provider write access",
    helpful: 445,
    daysAgo: 18,
    status: "building",
    description:
      "Invert the model: the record belongs to the patient, and providers write into it rather than keeping their own copy. Interoperability standards for this already exist and are widely implemented — what is missing is the requirement to actually use them.",
  },
  {
    problemTitle: "Elderly relatives get locked out of services that went app-only",
    author: "mei",
    title: "A legally required non-digital path for essential services",
    helpful: 522,
    daysAgo: 20,
    description:
      "For anything classed as essential — banking, health, utilities, government — require a maintained non-digital route. Not a bad one kept alive to tick a box: a staffed phone line with comparable wait times.\n\nThis is an accessibility requirement, and it should be enforced the same way physical access is.",
  },
  {
    problemTitle: "Elderly relatives get locked out of services that went app-only",
    author: "mei",
    title: "Delegated access that does not mean sharing a password",
    helpful: 289,
    daysAgo: 15,
    description:
      "Right now helping a parent means knowing their password, which is both unsafe and legally murky. A proper delegation model — named helper, scoped permissions, full audit trail, revocable — solves it without anyone impersonating anyone.",
  },
  {
    problemTitle: "Nobody can tell which online course is actually worth the money",
    author: "amina",
    title: "Publish completion and outcome rates, not star ratings",
    helpful: 356,
    daysAgo: 5,
    description:
      "Two numbers would change the market: what fraction of enrolled students finished, and what fraction reported the outcome they signed up for six months later.\n\nBoth are already tracked internally. Neither is published, for obvious reasons — which is exactly why it should be a condition of listing on a marketplace.",
  },
  {
    problemTitle: "Grocery prices change so often that comparing shops is pointless",
    author: "grace",
    title: "Basket-level comparison instead of item-level",
    helpful: 198,
    daysAgo: 2,
    description:
      "Nobody buys one item. Compare the whole regular basket across nearby shops, including whether a substitute is acceptable, and show the answer as one number per shop per week.",
  },
  {
    problemTitle: "Recycling rules differ by street and nobody knows the right answer",
    author: "liam",
    title: "Scan the barcode, get the answer for your postcode",
    helpful: 412,
    daysAgo: 13,
    status: "shipped",
    description:
      "Packaging barcodes already identify the exact material composition. Combine that with the local authority's accepted materials list and the answer is deterministic — no symbols to interpret, no guessing.",
  },
  {
    problemTitle: "Public transport apps do not tell you when a bus is actually full",
    author: "diego",
    title: "Expose the occupancy data the fleet already collects",
    helpful: 176,
    daysAgo: 7,
    description:
      "Modern buses count passengers for operational reporting. Publishing that in the real-time feed is a data-sharing decision, not an engineering project. Riders would reroute themselves and even out loading.",
  },
  {
    problemTitle: "Password resets are now the main way accounts get stolen",
    author: "tom",
    title: "Passkeys as the default, with recovery codes instead of email reset",
    helpful: 483,
    daysAgo: 10,
    description:
      "Passkeys remove the shared secret entirely. The remaining weak point is recovery, so replace \"email us a link\" with printed recovery codes plus optional trusted-contact recovery.\n\nThe technology shipped years ago. What is missing is services being willing to make it the default rather than an option buried in settings.",
  },
  {
    problemTitle: "Visa requirements are written to be technically correct, not understandable",
    author: "nathan",
    title: "A decision tree that ends in one concrete checklist",
    helpful: 267,
    daysAgo: 22,
    description:
      "Ten questions — citizenship, destination, purpose, duration, employment — and one output: the exact documents, the exact fee, the exact appointment type. No categories, no \"see also\", no cross-references.",
  },
  {
    problemTitle: "Second-hand marketplaces are full of scams and no-shows",
    author: "nathan",
    title: "Hold payment until collection is confirmed by both parties",
    helpful: 223,
    daysAgo: 8,
    description:
      "The platform holds the money and both parties confirm at handover. Sellers stop being ghosted, buyers stop carrying cash to meet strangers, and the platform gains the standing to ban the accounts that cause the problems.",
  },
  {
    problemTitle: "Small restaurants pay for five systems that do not talk to each other",
    author: "marco",
    title: "One shared stock number every system reads from",
    helpful: 134,
    daysAgo: 6,
    description:
      "Full consolidation is unrealistic — nobody is replacing their POS. But a single stock service that every other system reads and writes removes the most expensive daily error.",
  },
  {
    problemTitle: "Learning a language stalls at the point conversation starts",
    author: "amina",
    title: "Scheduled conversation with a matched partner, not a tutor",
    helpful: 301,
    daysAgo: 17,
    description:
      "Tutoring is expensive because it is one-directional. Pair two learners whose target and native languages are swapped, give them a structured prompt for the session, and split the time.\n\nThe structure is what makes it work — unstructured exchanges collapse within three sessions.",
  },
  {
    problemTitle: "Bank fraud alerts block real purchases and miss real fraud",
    author: "priya",
    title: "Let customers declare travel and spending context in advance",
    helpful: 156,
    daysAgo: 11,
    description:
      "Most false positives are predictable: a trip, a large planned purchase, a new subscription. Give the customer a way to say so beforehand, and weight the model accordingly.",
  },
  {
    problemTitle: "Group expense splitting still ends in awkward conversations",
    author: "grace",
    title: "Agree the split before the trip, settle automatically after",
    helpful: 187,
    daysAgo: 19,
    status: "shipped",
    description:
      "Everyone agrees the rules up front — even split, or by nights stayed — and authorises settlement at the end. The awkward conversation happens once, before anyone has spent anything, when it is easy.",
  },
  {
    problemTitle: "There is no way to know if a charity actually spends money well",
    author: "fatima",
    title: "Standardised outcome reporting at a scale small charities can meet",
    helpful: 142,
    daysAgo: 25,
    description:
      "Full independent evaluation costs more than most local charities receive. A lightweight standard — three outcome measures, reported annually, audited by sample — would cover the long tail that no evaluator looks at today.",
  },
  {
    problemTitle: "Childcare availability is invisible until you are already on a waitlist",
    author: "grace",
    title: "A shared regional availability register",
    helpful: 259,
    daysAgo: 16,
    description:
      "Nurseries publish current vacancies by age band and start month to a shared register. Parents see reality instead of joining twelve lists; nurseries stop fielding the same phone call forty times a week.",
  },
  {
    problemTitle: "Local tradespeople are impossible to evaluate before hiring",
    author: "liam",
    title: "Verified job history rather than star ratings",
    helpful: 118,
    daysAgo: 14,
    description:
      "Ratings get gamed. Verified facts do not: how many jobs of this exact type, completed in the last two years, at what typical value, with what proportion requiring a return visit.",
  },
  {
    problemTitle: "Returning an online order costs more than the item is worth",
    author: "marco",
    title: "Local drop-off at shops that already receive daily deliveries",
    helpful: 167,
    daysAgo: 4,
    description:
      "Every high street has shops receiving a courier daily. Paying them a small fee per return accepted gives a drop-off point within walking distance of almost everyone, with no printer required.",
  },
];

export interface SeedComment {
  problemTitle: string;
  author: string;
  content: string;
  helpful: number;
  daysAgo: number;
  replies?: Array<{ author: string; content: string; helpful: number; daysAgo: number }>;
}

export const SEED_COMMENTS: SeedComment[] = [
  {
    problemTitle: "Finding trustworthy roommates is genuinely risky",
    author: "tom",
    helpful: 92,
    daysAgo: 3,
    content:
      "I lost a €900 deposit to a listing that turned out to be a photo set stolen from an agency site. The \"landlord\" was very patient and professional for two weeks. The bank could not help because I authorised the transfer myself.",
    replies: [
      {
        author: "diego",
        helpful: 34,
        daysAgo: 3,
        content:
          "Same pattern here. The tell was that they would only talk over WhatsApp and always had a reason not to do a video call. By the time you notice, you have already sent money.",
      },
      {
        author: "sarah",
        helpful: 21,
        daysAgo: 2,
        content:
          "This is the exact case escrow solves. Nothing about identity verification would have stopped it — the money moving before anyone saw a key is the whole vulnerability.",
      },
    ],
  },
  {
    problemTitle: "Job listings hide salary, wasting everyone's time",
    author: "priya",
    helpful: 148,
    daysAgo: 2,
    content:
      "Eleven hours across four rounds, including a take-home. The offer was 40% under. When I said so, the recruiter told me the band had \"always been on the internal req\" — so they knew from the first call.",
    replies: [
      {
        author: "mei",
        helpful: 57,
        daysAgo: 1,
        content:
          "The part that gets me is that it is presented as flexibility for the candidate. In practice the flexibility only runs one direction.",
      },
    ],
  },
  {
    problemTitle: "Getting a same-week appointment with a GP is nearly impossible",
    author: "grace",
    helpful: 76,
    daysAgo: 14,
    content:
      "Calling at 8am with two children to get to school is not a realistic system. I have ended up in A&E twice for things that needed ten minutes with a GP, which cannot be cheaper for anyone.",
  },
  {
    problemTitle: "Elderly relatives get locked out of services that went app-only",
    author: "amina",
    helpful: 113,
    daysAgo: 18,
    content:
      "My father managed his own affairs for sixty years. He now needs me for everything because each service assumes a smartphone. The loss of independence has been worse for him than the inconvenience is for me.",
    replies: [
      {
        author: "fatima",
        helpful: 45,
        daysAgo: 17,
        content:
          "This is measurable, by the way — there is real research linking forced digital transitions to reduced service uptake in over-75s. It is not a niche complaint.",
      },
    ],
  },
  {
    problemTitle: "Freelancers spend days every month chasing unpaid invoices",
    author: "marco",
    helpful: 61,
    daysAgo: 5,
    content:
      "Statutory late payment interest exists in most of Europe and almost nobody invoices for it, because charging your client interest feels like declaring war. Automating it removes the personal element entirely.",
  },
  {
    problemTitle: "Medical records do not follow the patient between providers",
    author: "nathan",
    helpful: 88,
    daysAgo: 20,
    content:
      "Moved countries with a chronic condition and effectively started from zero. Repeated a scan I had done eight weeks earlier because the file was on a disc in a format the new hospital could not open.",
  },
  {
    problemTitle: "Recycling rules differ by street and nobody knows the right answer",
    author: "grace",
    helpful: 54,
    daysAgo: 12,
    content:
      "We moved three miles and the rules changed completely. I genuinely do not know whether the effort I put in for four years achieved anything at all.",
  },
  {
    problemTitle: "Gig workers cannot get a loan because their income looks unstable",
    author: "nathan",
    helpful: 97,
    daysAgo: 11,
    content:
      "Two years of consistent weekly earnings and the bank wanted a letter from an employer I do not have. The irony is my income is far more predictable than a lot of commission-based salaried roles.",
  },
  {
    problemTitle: "Nobody can tell which online course is actually worth the money",
    author: "tom",
    helpful: 43,
    daysAgo: 6,
    content:
      "Survivorship bias in reviews is the core issue. The people best placed to warn you are the ones who quit, and they never come back to write anything.",
  },
  {
    problemTitle: "Password resets are now the main way accounts get stolen",
    author: "alex",
    helpful: 69,
    daysAgo: 9,
    content:
      "A SIM swap took out my email, then everything that recovers through email, in about forty minutes. The strong passwords and authenticator app made no difference at all.",
  },
];
