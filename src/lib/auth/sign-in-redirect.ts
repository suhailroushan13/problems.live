/**
 * Client-safe helper for handing off to the sign-in chooser.
 *
 * This intentionally sends every protected interaction through `/login`, so
 * people can choose a passkey or Google rather than being forced into OAuth.
 */
export function goToSignIn(next: string): void {
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const url = `/login?next=${encodeURIComponent(target)}`;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(url);
}
