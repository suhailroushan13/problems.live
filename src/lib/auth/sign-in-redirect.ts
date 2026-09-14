/**
 * Client-safe helper for handing off to Google sign-in.
 *
 * `/api/auth/google` is a route handler that immediately redirects off-origin,
 * so this has to be a full navigation. Routing through `next/router` would
 * first issue an RSC fetch that the browser blocks on CORS before falling back
 * to this same navigation — one wasted, error-logging round trip.
 */
export function goToSignIn(next: string): void {
  const target = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const url = `/api/auth/google?next=${encodeURIComponent(target)}`;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(url);
}
