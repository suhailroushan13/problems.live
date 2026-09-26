/**
 * Fixture data for scripts/seed-in10.ts — 10 Indian users (Hindu and Muslim
 * names), their problems, comment threads, and bookmarks.
 *
 * This file is only consumed by seed-in10.ts / undo-seed-in10.ts. It is not
 * imported by the main dev seed (scripts/seed.ts) and is safe to delete once
 * you no longer need to re-run or undo that seed.
 */

export interface In10User {
  name: string;
  username: string;
  email: string;
  bio: string;
  reputation: number;
}

// Order matters: index i's createdAt is staggered by i in seed-in10.ts.
export const IN10_USERS: In10User[] = [
  { name: "Rohan Sharma", username: "rohan", email: "rohan.sharma.in10@example.com", bio: "Product manager in Delhi NCR. Tired of every app asking for OTP twice.", reputation: 540 },
  { name: "Arjun Mehta", username: "arjun", email: "arjun.mehta.in10@example.com", bio: "Backend engineer in Mumbai. UPI works until it doesn't.", reputation: 610 },
  { name: "Priyanka Nair", username: "priyanka", email: "priyanka.nair.in10@example.com", bio: "Works in fintech, Bangalore. Obsessed with why hospital bills never add up.", reputation: 720 },
  { name: "Ananya Iyer", username: "ananya", email: "ananya.iyer.in10@example.com", bio: "School teacher, Chennai. Family WhatsApp group survivor.", reputation: 380 },
  { name: "Vikram Desai", username: "vikram", email: "vikram.desai.in10@example.com", bio: "Runs a small textile shop in Ahmedabad. Landlords keep inventing new deposit math.", reputation: 295 },
  { name: "Imran Sheikh", username: "imran", email: "imran.sheikh.in10@example.com", bio: "Delivery rider in Hyderabad. Rated by people who never open the gate.", reputation: 210 },
  { name: "Ayesha Khan", username: "ayesha", email: "ayesha.khan.in10@example.com", bio: "Final-year MBBS student, Lucknow. Biodata portals ask my complexion before my specialisation.", reputation: 465 },
  { name: "Zoya Ansari", username: "zoya", email: "zoya.ansari.in10@example.com", bio: "Freelance graphic designer, Kolkata. 'Just a small edit' is never small.", reputation: 330 },
  { name: "Faizan Qureshi", username: "faizan", email: "faizan.qureshi.in10@example.com", bio: "Runs a biryani place in Mumbai. Aggregator apps take 30% and still mark me closed at 9pm.", reputation: 275 },
  { name: "Naveed Ahmed", username: "naveed", email: "naveed.ahmed.in10@example.com", bio: "Product manager, Bangalore. WFH held together by a WiFi router and hope.", reputation: 590 },
];

export interface In10Problem {
  title: string;
  category: string; // category slug, must already exist in the DB
  author: string; // username
  description: string;
  status?: "open" | "being_solved" | "solved";
  location?: { scope: "country" | "city"; country?: string; city?: string };
  daysAgo: number;
}

// Index 0..11 == P1..P12 referenced by IN10_COMMENTS / IN10_BOOKMARKS below.
export const IN10_PROBLEMS: In10Problem[] = [
  {
    title: "Aadhaar correction takes three trips to the centre and nobody explains the rejection",
    category: "government",
    author: "rohan",
    daysAgo: 9,
    location: { scope: "city", country: "India", city: "Delhi" },
    description:
      "My address update got rejected twice, and the slip just says \"Document mismatch\" with no field name, no reason, nothing. The clerk at the Seva Kendra says he can't see why either, he can only see the same status I can.\n\nEach trip means a half-day of leave, a token number, and an hour in a queue to be told to try again with a document I already submitted. There's no online chat, no callback, just a rejection code with zero explanation attached to it.\n\nThe portal shows the request as \"closed\" the moment it's rejected, so even the audit trail disappears. You're left guessing what to fix, which is a strange way to run identity verification for a billion people.",
  },
  {
    title: "Wedding season loudspeakers run past midnight and the local station says 'file a complaint tomorrow'",
    category: "community",
    author: "rohan",
    daysAgo: 3,
    location: { scope: "city", country: "India", city: "Delhi" },
    description:
      "Baraat outside my building at 11pm, DJ till past 1am, on a Tuesday. Called the local police station, they said noise complaints need to be filed \"during working hours\" the next day, by which point the wedding is long over and nothing gets recorded against anyone.\n\nThere's a decibel limit on paper, apparently, but nobody who could measure it is on duty after 10pm. So the rule exists and is completely unenforceable for the exact hours it's meant to cover.\n\nEveryone with small kids or an early shift just puts in earplugs and waits it out, every single wedding season, indefinitely.",
  },
  {
    title: "UPI shows 'payment failed', the money is already gone, and the bank calls it 'auto-reversal in 3-5 working days'",
    category: "money",
    author: "arjun",
    daysAgo: 15,
    status: "being_solved",
    location: { scope: "city", country: "India", city: "Mumbai" },
    description:
      "Paid a vendor ₹4,200 through UPI. App shows \"Transaction Failed. Please retry.\" So I retried, paid it again on a different app. Turns out the first one actually went through, the failure message was wrong, and now I've paid twice and I'm the one chasing two different support lines to sort it out.\n\nThe bank's line is always the same: \"auto-reversal within 3-5 working days if the merchant hasn't received it,\" except the merchant did receive it, so there's no reversal to auto-trigger, and no human takes ownership of the actual money in the meantime.\n\nA payment rail that a country runs its economy on shouldn't have a UI state that's this confidently wrong.",
  },
  {
    title: "Every hospital bill has a 'miscellaneous charges' line and nobody in billing can explain it",
    category: "health",
    author: "priyanka",
    daysAgo: 21,
    location: { scope: "city", country: "India", city: "Bengaluru" },
    description:
      "Three-day admission, and the final bill has room rent, doctor visits, medicines, all itemised, and then one line called \"miscellaneous / consumables\" for ₹9,000 with no breakup. Billing says it's \"gloves, syringes, standard stuff\" but can't produce a list, and it's too large a number to just accept as gloves.\n\nInsurance TPAs flag it too, sometimes, but mostly it just gets settled because arguing at a billing counter while a family member is still recovering upstairs is not a fight anyone wants to have.\n\nThere's no requirement anywhere that this line be itemised the way every other line on the bill is, so it just never is.",
  },
  {
    title: "Delivery apps show '10 minutes away' for forty minutes straight",
    category: "food",
    author: "priyanka",
    daysAgo: 5,
    location: { scope: "city", country: "India", city: "Bengaluru" },
    description:
      "The rider icon sits at the same point on the map, ETA stuck at \"10 mins\", for the better part of an hour. No update, no call, and by the time it arrives the food is cold and the ETA bar still says it was basically on schedule the whole time.\n\nSupport chat opens with a bot asking if the order was \"missing items\", which it wasn't, it was just extremely late, and there's no complaint category for \"your own map was lying to me in real time\".\n\nIt's a small thing every single time, and a genuinely large amount of collectively wasted evenings across an entire city.",
  },
  {
    title: "Every family WhatsApp group has one uncle who forwards fake news before breakfast",
    category: "family",
    author: "ananya",
    daysAgo: 2,
    location: { scope: "country", country: "India" },
    description:
      "7:04am, forwarded message about a fruit that cures everything, from an account with a profile photo of a temple and 45 unread statuses. By 7:20am someone's aunt has replied with three folded-hands emojis, and by 8am it's being discussed at breakfast as settled medical fact.\n\nAsking for a source gets read as an attack on the uncle personally, not the claim. \"Forwarded many times\" label exists right there on the message and it changes nothing about how it's received.\n\nMultiply this by every extended family group in the country, every single morning, and it's a genuinely enormous, cheerful, unstoppable information problem.",
  },
  {
    title: "Landlords ask for 10 months' rent as deposit and act offended when you negotiate",
    category: "housing",
    author: "vikram",
    daysAgo: 12,
    location: { scope: "city", country: "India", city: "Ahmedabad" },
    description:
      "Standard ask in my area for a shop lease is now 10-11 months' rent upfront as deposit, no interest, refundable \"eventually\" at the landlord's discretion on move-out. Try to negotiate down to 6 and you're treated like you're trying to skip out on the lease entirely.\n\nThere's no market-wide standard, no regulator capping it, so it's whatever the landlord in a good negotiating position decides, and in most markets right now that's always the landlord. Small shop owners end up with most of a year's rent sitting locked up doing nothing, on top of whatever they need for inventory and setup.\n\nEveryone agrees it's absurd in private and every new lease has the same number in it anyway.",
  },
  {
    title: "Delivery riders get rated by customers who never mention the gate was locked or the lift was broken",
    category: "work",
    author: "imran",
    daysAgo: 7,
    location: { scope: "city", country: "India", city: "Hyderabad" },
    description:
      "Order took 12 extra minutes because the building's lift was under maintenance and the watchman took his time opening the gate. Customer rated it 2 stars, comment: \"too slow\". That rating sits on my profile and quietly affects which orders I get offered next.\n\nThere's no field for the rider to add context before the rating locks in, and support's answer is always \"ratings are based on customer experience\", which is true, and also exactly the problem, since the customer's experience of a delayed lift becomes my permanent record.\n\nA five-star and a two-star pay the same for the trip. Only the algorithm underneath cares about the difference, and it only ever sees my side of the story never.",
  },
  {
    title: "Arranged marriage biodata sites ask your 'complexion' and 'diet' before your actual personality",
    category: "relationships",
    author: "ayesha",
    daysAgo: 18,
    location: { scope: "city", country: "India", city: "Lucknow" },
    description:
      "Signed up to help a cousin fill a matrimony profile. Page one: height, complexion (fair/wheatish/dark, pick one), diet, manglik status. Page four, eventually, in a small optional box: \"about yourself\".\n\nThe filters work the same way from the other side, people search by complexion before they search by anything resembling compatibility, and the site's own \"top matches\" algorithm visibly weights it. Everyone involved says they don't personally care about any of this while using a form that asks for it first, every single time.\n\nIt's a whole industry built around presenting people as a spec sheet, and the spec sheet's first three fields are about how a person looks, not who they are.",
  },
  {
    title: "Every client wants a logo 'in two hours' and thinks Ctrl+Z means redo it for free",
    category: "work",
    author: "zoya",
    daysAgo: 25,
    location: { scope: "city", country: "India", city: "Kolkata" },
    description:
      "Brief: \"simple logo, shouldn't take long\". Six rounds of revisions later, three of which were \"make it pop more\", one of which was reverting to round two after the client's cousin saw it and had opinions, and the invoice is still for the original quote because \"it's basically the same job\".\n\nUnlimited revisions is never written into the contract, it's just assumed, and pushing back on it gets read as unprofessional rather than as, you know, how pricing for work is supposed to function.\n\nThe actual design work is maybe 20% of the job now. The other 80% is managing the idea that iteration is free because the file is just pixels and not hours.",
  },
  {
    title: "Aggregator apps take 30% commission and still mark my restaurant 'temporarily closed' during dinner rush",
    category: "food",
    author: "faizan",
    daysAgo: 10,
    location: { scope: "city", country: "India", city: "Mumbai" },
    description:
      "7:45pm on a Saturday, the app quietly flips my listing to \"temporarily closed\", no call, no notification I can find, while we're standing in the kitchen fully open and taking counter orders. Lost maybe two hours of the busiest window of the week before a regular customer messaged to ask if we'd shut down.\n\nSupport says it's an automatic system that closes listings when \"order acceptance time\" crosses some threshold, which happens precisely when the kitchen is busiest, so the app punishes success by hiding you at the exact moment you're doing the most volume.\n\nAll this on top of a 28-30% commission that's already the difference between a decent margin and barely breaking even on delivery orders.",
  },
  {
    title: "Every apartment WiFi plan promises '100 Mbps' and delivers 8 Mbps during a work call",
    category: "technology",
    author: "naveed",
    daysAgo: 4,
    location: { scope: "city", country: "India", city: "Bengaluru" },
    description:
      "Plan says up to 100 Mbps. Speed test most evenings says 8-12 Mbps, precisely between 7pm and 11pm when everyone in the building is home and on a call or a stream. Complaint calls always end with \"please restart your router\", which does nothing, because the bottleneck isn't my router, it's the shared bandwidth for the whole building on the same last-mile connection.\n\nThe plan's fine print does say \"up to\", so technically nothing's being violated, it's just that \"up to\" apparently means \"once, at 3am, for one speed test, and never during any hour a person is actually using it\".\n\nSwitching providers means the same three companies serve the building anyway, so there's nowhere else to go.",
  },
];

export interface In10Comment {
  problem: number; // index into IN10_PROBLEMS
  author: string; // username
  content: string;
}

/**
 * Flat, ordered list. For each `problem` index, the FIRST entry that
 * appears is the root comment; every subsequent entry for that same
 * problem is a reply to that root. seed-in10.ts relies on this ordering.
 */
export const IN10_COMMENTS: In10Comment[] = [
  // P1 — Aadhaar (root: arjun)
  { problem: 0, author: "arjun", content: "This happened to my father's Aadhaar too. The rejection slip just said 'Document mismatch', no field name. We resubmitted the exact same PAN copy three times before someone finally said it was because the address on it was in English and the application was in Hindi." },
  { problem: 0, author: "priyanka", content: "Same experience trying to update my Aadhaar after moving to Bangalore. Ended up paying an 'agent' near the Seva Kendra ₹200 just to tell me which document to bring. That shouldn't be a paid service that exists." },
  { problem: 0, author: "vikram", content: "GST registration corrections have the exact same problem. Rejected with a generic reason code, and the helpline just reads the same code back to you like you didn't already see it on the screen." },
  { problem: 0, author: "rohan", content: "Went back a third time and finally got someone to actually look at the scanned copy with me. Turned out the photo was fine, it was the pincode on the proof of address that didn't match the pincode field. Nobody could've told me that from the rejection screen." },

  // P2 — Wedding noise (root: ananya)
  { problem: 1, author: "ananya", content: "Our society had the same DJ-till-2am situation for a wedding three streets over. Filed a noise complaint the next morning and was told there was 'no recording of decibel levels' so nothing could be actioned retroactively." },
  { problem: 1, author: "imran", content: "I'm out on deliveries most nights and wedding traffic blocking the main road is its own separate problem. Whole street shut for a baraat, no traffic police in sight, and every rider on the route loses twenty minutes." },
  { problem: 1, author: "zoya", content: "Genuinely think permits for the loudspeaker itself should just have a hard cutoff time built into the sound system, not rely on someone being willing to file a complaint the next day." },

  // P3 — UPI (root: rohan)
  { problem: 2, author: "rohan", content: "Had a UPI payment show failed and then get auto-debited anyway last month. Took four days and two bank visits before the amount actually reversed. In that window I genuinely didn't know if I had the money or not." },
  { problem: 2, author: "vikram", content: "Same thing happened with a supplier payment for the shop. What made it worse was the supplier's app showed the payment as received immediately, so from his side everything was fine, and from mine it looked failed. Total confusion for a day." },
  { problem: 2, author: "faizan", content: "We take a lot of UPI at the restaurant counter and this exact failure happens maybe twice a week. Customers walk off assuming it didn't go through, then the money shows up an hour later and we have to call them back." },
  { problem: 2, author: "naveed", content: "The API-level issue is apparently pretty well known, banks and the switch disagree on transaction status for a window of time, and the app is just showing whatever it last heard. Doesn't make it any less broken from the user's side." },
  { problem: 2, author: "arjun", content: "Ended up keeping screenshots of every 'failed' UPI transaction now just so I have proof of when I actually paid. Feels absurd that this is necessary for the country's main payment rail." },

  // P4 — Hospital bill (root: ayesha)
  { problem: 3, author: "ayesha", content: "As a med student doing rounds, I've seen this line on almost every discharge summary I've helped a family read through. Nobody on the clinical side can explain it either, it's purely a billing department number." },
  { problem: 3, author: "priyanka", content: "Tried asking for an itemised breakup of the 'miscellaneous' line at discharge and was told it 'isn't itemised at that level'. So it's a real amount of money with no real list behind it, by design." },

  // P5 — Food delivery ETA (root: arjun)
  { problem: 4, author: "arjun", content: "The ETA bar not moving for 40 minutes is the part that gets me. If it just said '40 minutes, restaurant is backed up' I'd be fine with it. It's the fake precision of '10 mins' the entire time that's annoying." },
  { problem: 4, author: "imran", content: "From the rider side, the app's ETA is often calculated before the restaurant has even started cooking the order. We get assigned the delivery and the customer already sees a countdown that has nothing to do with when the food is actually ready." },
  { problem: 4, author: "faizan", content: "Can confirm from the restaurant side too. The app's system marks 'preparing' the second the order is placed, so the countdown starts before we've even seen the ticket print." },

  // P6 — Family WhatsApp (root: rohan)
  { problem: 5, author: "rohan", content: "My family group has two separate uncles competing to forward the same fruit-cures-cancer message from different numbers. Neither has ever once acknowledged a correction." },
  { problem: 5, author: "vikram", content: "Tried gently posting a fact-check link once. Got told I was 'always so negative' and the original message stayed pinned." },
  { problem: 5, author: "zoya", content: "The genuinely funny part is watching the same message get forwarded back into the group it originated from, eight months later, as if it's breaking news again." },
  { problem: 5, author: "ananya", content: "I've stopped correcting anything directly and just started replying with a single question mark. Somehow that works better than an actual argument ever did." },

  // P7 — Rent deposit (root: priyanka)
  { problem: 6, author: "priyanka", content: "Saw the same 10-month ask for a friend's shop lease in Indiranagar. When she tried to negotiate to 6 months, the broker literally said 'that's not how it's done here', as if it were law rather than custom." },
  { problem: 6, author: "naveed", content: "Rented an apartment last year and the deposit alone was more than three months of my actual monthly budget for everything else combined. Just sitting there, no interest, for the length of the lease." },
  { problem: 6, author: "vikram", content: "Ended up agreeing to 10 months because the alternative was losing the space to someone who wouldn't push back. That's the whole dynamic in one sentence, really." },

  // P8 — Delivery rider rating (root: ananya)
  { problem: 7, author: "ananya", content: "Never thought about this until a delivery was late because our building's watchman was on a chai break and wouldn't buzz the gate open. Would've rated the delivery 5 stars regardless, but I can see how most people wouldn't think to." },
  { problem: 7, author: "ayesha", content: "There should at minimum be a way for the rider to flag 'building access delay' before the rating screen even shows up for the customer, so it's on record from both sides." },
  { problem: 7, author: "zoya", content: "As someone in a gated apartment complex I've started explicitly telling delivery riders to note the gate issue if there's a complaint option, but most orders don't even have that option visible." },
  { problem: 7, author: "imran", content: "Appreciate this thread more than you'd think. Most days it's just accepted as the cost of the job, nobody upstream really sees the actual sequence of events, only the star at the end of it." },

  // P9 — Matrimony biodata (root: rohan)
  { problem: 8, author: "rohan", content: "Filled this same kind of form for a cousin last year. 'Complexion' was a dropdown, mandatory, before the free-text bio field even appeared on the page." },
  { problem: 8, author: "arjun", content: "The search filters are worse than the profile fields honestly. You can literally filter incoming matches by skin tone before you filter by education or profession." },
  { problem: 8, author: "priyanka", content: "Asked a matrimony site once why 'diet' comes before 'occupation' in the form order. Support said it's 'as per user preference data', which just means enough people filter on it first that the form reflects it." },
  { problem: 8, author: "ayesha", content: "What got me was realising the 'about yourself' box was optional and near the bottom, while complexion was required and at the top. The form is telling you exactly what it thinks matters most." },

  // P10 — Freelance client scope (root: ananya)
  { problem: 9, author: "ananya", content: "Freelanced part-time doing worksheets for a tutoring startup and this is exactly it. 'Just a small tweak' six times over turned a two-day job into a two-week one, same invoice." },
  { problem: 9, author: "vikram", content: "Hired a designer for the shop's signage and kept asking for 'one more small change' myself before I really thought about what I was doing to her timeline. This thread is a bit of a mirror, honestly." },
  { problem: 9, author: "naveed", content: "The fix that's worked for teams I've managed is putting a revision cap in the SOW upfront, in writing, with anything beyond it billed hourly. Clients respect it once it's a document rather than a conversation." },
  { problem: 9, author: "zoya", content: "Started doing exactly that a few months ago, a hard cap of 2 rounds in the contract. Lost one client over it and kept every hour of my evenings back from the rest." },

  // P11 — Restaurant commission (root: rohan)
  { problem: 10, author: "rohan", content: "Ordered from a place near my office that does this constantly, shows 'closed' on the app at exactly 8-9pm every night, open the rest of the day. Every regular there knows to just call and order directly instead." },
  { problem: 10, author: "ananya", content: "Didn't realise this was an automated commission-adjacent thing until reading this. Assumed restaurants were just choosing to close early, which made no sense given how busy they clearly were in person." },
  { problem: 10, author: "ayesha", content: "There should be a manual override the restaurant can flag immediately, rather than however long it takes the automatic system to reset itself." },
  { problem: 10, author: "faizan", content: "Called support about this maybe six times over two months. Each time the answer is a version of 'we'll escalate it', and it keeps happening on exactly the nights that matter most." },

  // P12 — WiFi speed (root: arjun)
  { problem: 11, author: "arjun", content: "Same building, same story. Speed test at 3am: 95 Mbps. Speed test at 8pm during a call: 9 Mbps. Every single evening, like clockwork." },
  { problem: 11, author: "priyanka", content: "Started keeping a spreadsheet of speed test screenshots with timestamps just to have something to show the provider. They still just say 'restart your router'." },
  { problem: 11, author: "imran", content: "Whole street seems to be on the same ISP and the same last-mile line, so it's less an individual complaint and more a shared-bandwidth problem nobody's willing to say out loud." },
  { problem: 11, author: "faizan", content: "Same at the restaurant with our POS internet, evenings are exactly when we need it most for orders and it's exactly when it's worst." },
  { problem: 11, author: "naveed", content: "Switched providers once, same issue within two weeks, because it's the same last-mile infrastructure regardless of which brand's logo is on the router. Feels like a dead end." },
];

export interface In10Bookmark {
  problem: number; // index into IN10_PROBLEMS
  user: string; // username
}

export const IN10_BOOKMARKS: In10Bookmark[] = [
  { problem: 3, user: "rohan" },
  { problem: 4, user: "rohan" },
  { problem: 7, user: "rohan" },

  { problem: 1, user: "arjun" },
  { problem: 10, user: "arjun" },

  { problem: 5, user: "priyanka" },
  { problem: 9, user: "priyanka" },
  { problem: 11, user: "priyanka" },

  { problem: 0, user: "ananya" },
  { problem: 8, user: "ananya" },

  { problem: 1, user: "vikram" },
  { problem: 3, user: "vikram" },
  { problem: 11, user: "vikram" },

  { problem: 5, user: "imran" },
  { problem: 9, user: "imran" },

  { problem: 2, user: "ayesha" },
  { problem: 6, user: "ayesha" },
  { problem: 11, user: "ayesha" },

  { problem: 0, user: "zoya" },
  { problem: 4, user: "zoya" },

  { problem: 3, user: "faizan" },
  { problem: 8, user: "faizan" },

  { problem: 0, user: "naveed" },
  { problem: 7, user: "naveed" },
  { problem: 10, user: "naveed" },
];
