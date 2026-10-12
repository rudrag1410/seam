/** One place that decides "you've been signed out", so every way of talking to the server
 *  (typed calls, uploads, streams, polling) ends the same way: back to sign-in, then back here. */

const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up"];

let leaving = false;

export function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.includes(path);
}

/** Where to send someone whose session ended, remembering where they were. */
export function signInUrl(path: string, search = ""): string {
  const next = encodeURIComponent(`${path}${search}`);
  return `/sign-in?reason=expired&next=${next}`;
}

/**
 * Sign the user out of the UI. Safe to call from many places at once: it navigates only once,
 * and never from a public page. A full navigation (not a router push) is deliberate: it drops
 * every cache and store, so nothing from the dead session can linger on screen.
 */
export function handleUnauthorized(
  location: Pick<Location, "pathname" | "search"> = window.location,
  navigate: (url: string) => void = (url) => window.location.assign(url),
): boolean {
  if (leaving || isPublicPath(location.pathname)) return false;
  leaving = true;
  navigate(signInUrl(location.pathname, location.search));
  return true;
}

/** Test hook. */
export function resetSessionState() {
  leaving = false;
}
