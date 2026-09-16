import { Avatar, Style } from "@dicebear/core";
import bigSmile from "@dicebear/styles/big-smile.json";
import bottts from "@dicebear/styles/bottts.json";
import pixelArt from "@dicebear/styles/pixel-art.json";
import shapes from "@dicebear/styles/shapes.json";

export const AVATAR_STYLES = ["people", "characters", "pixel", "abstract", "fun"] as const;
export type AvatarStyle = (typeof AVATAR_STYLES)[number];
export type AvatarType = "google" | "generated" | "uploaded";

const DICEBEAR_STYLES: Record<Exclude<AvatarStyle, "people">, Style> = {
  characters: new Style(bottts),
  pixel: new Style(pixelArt),
  abstract: new Style(shapes),
  fun: new Style(bigSmile),
};
const BACKGROUNDS = ["#E8EEF9", "#F8E8E4", "#E8F1E7", "#F5ECD9", "#EEE8F5"];
const SKIN_TONES = ["#F7D2B1", "#E9B88E", "#C98C66", "#9B6046", "#70412F"];
const HAIR_COLORS = ["#31231F", "#563729", "#8A5B3D", "#1E2734", "#5A3042"];
const SHIRT_COLORS = ["#5474A6", "#B56853", "#668A67", "#B07B2D", "#7D608B"];
type PeopleMood = "happy" | "sad" | "angry" | "calm" | "sleeping";

function hash(seed: string): number { let value = 2166136261; for (const character of seed) { value ^= character.charCodeAt(0); value = Math.imul(value, 16777619); } return value >>> 0; }
function pick<T>(items: readonly T[], value: number, offset: number): T { return items[(value >>> offset) % items.length]; }
function moodForSeed(seed: string): PeopleMood {
  const match = seed.match(/-people-(\d+)$/);
  if (match) return (["happy", "sad", "angry", "calm", "sleeping"] as const)[(Number(match[1]) - 1) % 5];
  return (["calm", "happy", "sad", "angry", "sleeping"] as const)[hash(seed) % 5];
}

export function generatedAvatarUrl(seed: string, style: AvatarStyle = "people"): string { return `/api/avatars/${style}?v=4&seed=${encodeURIComponent(seed)}`; }

function expression(mood: PeopleMood, ink: string): string {
  const common = `fill="none" stroke="${ink}" stroke-linecap="round" stroke-width="2.5"`;
  if (mood === "happy") return `<path d="M35 48q3 3 6 0M59 48q3 3 6 0" ${common}/><path d="M43 59q7 6 14 0" ${common}/><circle cx="34" cy="57" r="2" fill="#E9A29B" opacity=".45"/><circle cx="66" cy="57" r="2" fill="#E9A29B" opacity=".45"/>`;
  if (mood === "sad") return `<path d="M35 47q3-2 6 0M59 47q3-2 6 0" ${common}/><path d="M44 64q6-4 12 0" ${common}/><path d="M36 43l5-2M64 43l-5-2" ${common}/>`;
  if (mood === "angry") return `<path d="M35 47h6M59 47h6" ${common}/><path d="M44 63h12" ${common}/><path d="M34 42l8 3M66 42l-8 3" ${common}/>`;
  if (mood === "sleeping") return `<path d="M35 49h7M58 49h7" ${common}/><path d="M44 61q6 3 12 0" ${common}/><text x="72" y="39" fill="${ink}" font-family="sans-serif" font-size="10" font-weight="600">Z</text>`;
  return `<path d="M35 48q3 2 6 0M59 48q3 2 6 0" ${common}/><path d="M45 61q5 2 10 0" ${common}/>`;
}
function hair(value: number, color: string): string {
  switch ((value >>> 13) % 4) {
    case 0: return `<path d="M27 49c0-20 10-30 23-30s23 10 23 30c-6-9-14-14-23-14S33 40 27 49Z" fill="${color}"/>`;
    case 1: return `<path d="M25 54c0-23 10-35 25-35s25 12 25 35v20h-9V49c-4-9-11-14-20-14s-16 5-20 14v25h-9Z" fill="${color}"/><path d="M27 43c5-16 15-24 29-24 8 0 15 3 20 9-8-4-17-3-23 2-9-2-17 2-26 13Z" fill="${color}"/>`;
    case 2: return `<circle cx="50" cy="27" r="11" fill="${color}"/><path d="M28 51c0-20 9-30 22-30s22 10 22 30c-6-10-13-14-22-14S34 41 28 51Z" fill="${color}"/>`;
    default: return `<path d="M25 52c1-21 10-33 25-33s24 12 25 33c-7-10-14-15-25-15S32 42 25 52Z" fill="${color}"/><circle cx="31" cy="38" r="7" fill="${color}"/><circle cx="69" cy="38" r="7" fill="${color}"/>`;
  }
}
function peopleAvatar(seed: string): string {
  const value = hash(seed); const ink = "#2C2523";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img"><rect width="100" height="100" rx="50" fill="${pick(BACKGROUNDS, value, 0)}"/><path d="M18 100c2-18 14-29 32-29s30 11 32 29" fill="${pick(SHIRT_COLORS, value, 12)}"/><path d="M39 71h22v10c-4 4-18 4-22 0Z" fill="${pick(SKIN_TONES, value, 4)}"/><circle cx="27" cy="50" r="5" fill="${pick(SKIN_TONES, value, 4)}"/><circle cx="73" cy="50" r="5" fill="${pick(SKIN_TONES, value, 4)}"/><circle cx="50" cy="49" r="25" fill="${pick(SKIN_TONES, value, 4)}"/>${hair(value, pick(HAIR_COLORS, value, 8))}${expression(moodForSeed(seed), ink)}</svg>`;
}

export function generatedAvatarSvg(seed: string, style: AvatarStyle = "people"): string {
  if (style === "people") return peopleAvatar(seed);
  return new Avatar(DICEBEAR_STYLES[style], { seed, size: 128, borderRadius: 50 }).toString();
}
