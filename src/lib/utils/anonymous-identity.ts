import { randomInt } from "node:crypto";

const ADJECTIVES = [
  "amber", "brisk", "calm", "clever", "covert", "distant", "eager",
  "gentle", "hidden", "kind", "lunar", "mellow", "nimble", "quiet",
  "sable", "solar", "steady", "tidy", "velvet", "witty",
] as const;

const NOUNS = [
  "atlas", "badger", "comet", "drift", "finch", "harbor", "juniper",
  "kestrel", "lantern", "meadow", "otter", "pioneer", "quartz", "river",
  "sparrow", "thicket", "umbra", "voyager", "willow", "zephyr",
] as const;

export function randomAnonymousUsername(): string {
  const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const noun = NOUNS[randomInt(NOUNS.length)];
  const number = randomInt(100, 1000);
  return `${adjective}-${noun}-${number}`;
}

export function anonymousDisplayName(username: string): string {
  return username
    .split(/[-_.]+/)
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1)}`)
    .join(" ");
}
