/**
 * Client-safe helper for the temporary invite-only handoff.
 *
 * Authentication is paused while the site is invite-only.
 */
export function goToSignIn(_next: string): void {
  void _next;
  const url = "/wait-list";
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.assign(url);
}
