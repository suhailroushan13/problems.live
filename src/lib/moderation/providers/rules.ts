import type {
  ModerationInput,
  ModerationLabel,
  ModerationProvider,
  ModerationResult,
} from "../types";

/**
 * Context-aware rules provider.
 *
 * Deliberately *not* a flat banned-word list: matches are scored, weighted by
 * severity, discounted by author trust, and several signals (link density,
 * shouting, repetition, contact-info harvesting) are structural rather than
 * lexical. A term used in a clearly descriptive sentence scores far lower than
 * the same term aimed at a person.
 */

interface Rule {
  label: ModerationLabel;
  /** Base severity 0-1 for a single match. */
  weight: number;
  pattern: RegExp;
  /** When set, the rule only fires if the match is aimed at a person. */
  directedOnly?: boolean;
}

// Written as fragments so the intent stays readable and auditable.
const RULES: Rule[] = [
  // Slurs and hate: highest severity, never discounted.
  {
    label: "hate",
    weight: 1,
    pattern:
      /\b(n[i1]gg(?:er|a)s?|f[a4]gg?(?:ot)?s?|k[i1]kes?|sp[i1]cs?|ch[i1]nks?|tr[a4]nn(?:y|ies)|retard(?:ed|s)?)\b/i,
  },
  {
    label: "hate",
    weight: 0.8,
    pattern:
      /\b(?:all|every)\s+(muslims?|jews?|christians?|blacks?|whites?|asians?|mexicans?|immigrants?|gays?|women|men)\s+(?:are|should)\b[^.!?]{0,40}\b(die|killed|banned|deported|scum|vermin|animals?|trash)\b/i,
  },

  // Threats of violence.
  {
    label: "threat",
    weight: 1,
    pattern:
      /\b(i(?:'m| am| will| wanna| want to)?\s*(?:gonna|going to)?\s*(kill|murder|stab|shoot|beat|burn)\s+(you|him|her|them|u)\b)/i,
  },
  {
    label: "threat",
    weight: 0.9,
    pattern: /\b(kill\s+your\s?self|kys|go\s+die|hope\s+you\s+die)\b/i,
  },
  {
    label: "self_harm",
    weight: 0.7,
    pattern: /\b(i\s+(?:want|am going|'m going)\s+to\s+(?:kill myself|end (?:it|my life))|suicidal)\b/i,
  },

  // Harassment: only counts when aimed at a person.
  {
    label: "harassment",
    weight: 0.7,
    directedOnly: true,
    pattern:
      /\b(you(?:'re| are|r)?\s+(?:a\s+)?(?:stupid|idiot|moron|worthless|pathetic|trash|garbage|loser|dumb(?:ass)?|scum))\b/i,
  },
  {
    label: "harassment",
    weight: 0.55,
    directedOnly: true,
    pattern: /\b(shut\s+the\s+f\w*\s+up|stfu|nobody\s+asked\s+you|you\s+deserve)\b/i,
  },

  // Profanity: low weight on its own — vulgar, not dangerous.
  {
    label: "profanity",
    weight: 0.22,
    pattern: /\b(f[u\*@#]ck(?:ing|ed|er|s)?|sh[i\*@#]t(?:ty|s)?|b[i\*@#]tch(?:es)?|a[s\$]{2}hole|c[u\*]nt|bastard|d[i1]ckhead|wanker|bollocks)\b/i,
  },

  // Sexual content.
  {
    label: "sexual",
    weight: 0.85,
    pattern:
      /\b(p[o0]rn(?:hub|site)?|xxx\s*(?:videos?|site)|nudes?\s+(?:for|pics?)|onlyfans|escorts?\s+(?:service|near)|sex\s?cam|hentai|blowjob|handjob)\b/i,
  },

  // Spam / promo patterns.
  {
    label: "spam",
    weight: 0.6,
    pattern:
      /\b(click\s+here\s+(?:now|to)|limited\s+time\s+offer|act\s+now|buy\s+(?:now|cheap)|100%\s+free|work\s+from\s+home\s+\$|make\s+\$\d+\s*(?:\/|per\s+)?(?:day|week|hour))\b/i,
  },
  {
    label: "spam",
    weight: 0.5,
    pattern: /\b(?:whatsapp|telegram|wa)\s*(?:me|:|\+)\s*\+?\d[\d\s-]{7,}/i,
  },
  {
    label: "spam",
    weight: 0.45,
    pattern: /\b(subscribe\s+to\s+my|follow\s+me\s+on|check\s+out\s+my\s+(?:channel|page|store))\b/i,
  },

  // Scams.
  {
    label: "scam",
    weight: 0.9,
    pattern:
      /\b(guaranteed\s+(?:profit|returns?)|double\s+your\s+(?:money|btc|crypto)|crypto\s+(?:giveaway|doubler)|investment\s+opportunity\s+\d+%|send\s+\d+\s*(?:btc|eth|usdt)|recovery\s+(?:expert|hacker)\s+(?:contact|dm))\b/i,
  },
  {
    label: "scam",
    weight: 0.8,
    pattern: /\b(hack(?:er|ing)?\s+(?:service|for hire)|buy\s+followers|verified\s+account\s+for\s+sale|seed\s+phrase|wallet\s+recovery)\b/i,
  },

  // Malicious / obfuscated links.
  {
    label: "malicious_link",
    weight: 0.7,
    pattern: /\bhttps?:\/\/(?:bit\.ly|tinyurl\.com|t\.co|goo\.gl|is\.gd|cutt\.ly|shorturl|rebrand\.ly|adf\.ly|bc\.vc)\b/i,
  },
  {
    label: "malicious_link",
    weight: 0.6,
    pattern: /\bhttps?:\/\/\d{1,3}(?:\.\d{1,3}){3}(?::\d+)?/i,
  },
  {
    label: "malicious_link",
    weight: 0.5,
    pattern: /\bhttps?:\/\/[^\s]*\.(?:ru|tk|ml|ga|cf|gq|zip|mov)\b/i,
  },

  // Personal information / doxxing.
  {
    label: "personal_info",
    weight: 0.85,
    pattern: /\b\d{3}-\d{2}-\d{4}\b/,
  },
  {
    label: "personal_info",
    weight: 0.75,
    pattern: /\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6011)[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
  },
  {
    label: "personal_info",
    weight: 0.6,
    pattern:
      /\b(?:he|she|they|his|her|their)\s+(?:home\s+)?address\s+is\b|\blives?\s+at\s+\d+\s+[A-Z][a-z]+\s+(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr)\b/i,
  },
  {
    label: "personal_info",
    weight: 0.5,
    pattern: /\b(?:ssn|social security(?: number)?|passport number|aadhaar|national insurance number)\b\s*[:#-]?\s*\w/i,
  },
];

/** Second-person pronouns and @mentions signal the text is aimed at someone. */
const DIRECTED_AT_PERSON = /(^|\s)(you|your|u|ur|@[a-z0-9_.-]+)(\s|[.,!?]|$)/i;

/** Look-alike character substitution used to dodge naive filters. */
function deObfuscate(input: string): string {
  return input
    .replace(/[​-‏⁠﻿]/g, "")
    .replace(/(\w)[\s.\-_*]{1,2}(?=\w\b)/g, "$1")
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/\$/g, "s")
    .replace(/@/g, "a")
    .replace(/!/g, "i");
}

function linkStats(text: string) {
  const links = text.match(/\bhttps?:\/\/[^\s]+/gi) ?? [];
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  return { count: links.length, density: links.length / words };
}

function shoutRatio(text: string): number {
  const letters = text.replace(/[^A-Za-z]/g, "");
  if (letters.length < 25) return 0;
  const upper = letters.replace(/[^A-Z]/g, "").length;
  return upper / letters.length;
}

function repetitionRatio(text: string): number {
  const words = text.toLowerCase().match(/[a-z']+/g) ?? [];
  if (words.length < 12) return 0;
  return 1 - new Set(words).size / words.length;
}

export class RulesModerationProvider implements ModerationProvider {
  readonly name = "rules";

  async check(input: ModerationInput): Promise<ModerationResult> {
    const raw = `${input.title ?? ""}\n${input.body}`.trim();
    const normalized = raw.toLowerCase();
    const deobfuscated = deObfuscate(normalized);
    const directed = DIRECTED_AT_PERSON.test(raw);

    const labels = new Set<ModerationLabel>();
    const reasons: string[] = [];
    let score = 0;

    for (const rule of RULES) {
      if (rule.directedOnly && !directed) continue;

      const hitsRaw = normalized.match(new RegExp(rule.pattern, "gi"))?.length ?? 0;
      const hitsObfuscated =
        hitsRaw > 0
          ? 0
          : deobfuscated.match(new RegExp(rule.pattern, "gi"))?.length ?? 0;
      const hits = hitsRaw + hitsObfuscated;
      if (hits === 0) continue;

      labels.add(rule.label);
      // Repeat offences escalate, but with diminishing returns.
      const escalation = 1 + Math.min(hits - 1, 3) * 0.25;
      // Slurs/threats aimed at a person are materially worse.
      const contextBoost =
        directed && (rule.label === "hate" || rule.label === "threat") ? 1.2 : 1;
      score += rule.weight * escalation * contextBoost;
      reasons.push(rule.label.replace(/_/g, " "));
    }

    // Structural spam signals — no word list involved.
    const { count: linkCount, density } = linkStats(raw);
    if (linkCount >= 4 || density > 0.18) {
      labels.add("spam");
      score += 0.45;
      reasons.push("excessive links");
    }

    const shout = shoutRatio(raw);
    if (shout > 0.7) {
      labels.add("low_quality");
      score += 0.25;
      reasons.push("all caps");
    }

    const repetition = repetitionRatio(raw);
    if (repetition > 0.7) {
      labels.add("spam");
      score += 0.35;
      reasons.push("repetitive text");
    }

    // Contact harvesting outside a solution link is a strong spam signal.
    if (/\b[\w.+-]+@[\w-]+\.[\w.]{2,}\b/.test(raw) && input.kind !== "solution") {
      labels.add("personal_info");
      score += 0.3;
      reasons.push("contact details");
    }

    // Substance check — a one-word "problem" helps nobody.
    const wordCount = raw.split(/\s+/).filter(Boolean).length;
    const minWords = input.kind === "comment" ? 2 : input.kind === "category" ? 1 : 8;
    if (wordCount < minWords) {
      labels.add("low_quality");
      score += 0.4;
      reasons.push("too short to be useful");
    }

    // Trust discount: established authors are far less likely to be abusive,
    // and false positives cost us good contributors. Never discounts the
    // categories where a false negative is unacceptable.
    const severe =
      labels.has("hate") || labels.has("threat") || labels.has("sexual");
    if (!severe) {
      const reputation = input.authorReputation ?? 0;
      const discount = Math.min(0.35, reputation / 1500);
      score *= 1 - discount;
    }

    const clamped = Math.min(1, Number(score.toFixed(3)));

    // Thresholds are applied by the caller against operator-tuned settings;
    // the provider reports its own suggested action as a default.
    const action =
      clamped >= 0.85 ? "reject" : clamped >= 0.5 ? "review" : "allow";

    return {
      action,
      score: clamped,
      labels: [...labels],
      reason: reasons.length ? [...new Set(reasons)].join(", ") : undefined,
      provider: this.name,
    };
  }
}
