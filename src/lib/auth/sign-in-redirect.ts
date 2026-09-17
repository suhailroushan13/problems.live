/**
 * Client-safe helper for starting the Google sign-in flow.
 */
export function goToSignIn(next: string): void {
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  const url = `/api/auth/google?next=${encodeURIComponent(destination)}`;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(url);
}
