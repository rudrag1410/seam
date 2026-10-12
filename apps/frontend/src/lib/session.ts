const PUBLIC_PATHS = ["/", "/sign-in", "/sign-up"];

let leaving = false;

function isPublicPath(path: string): boolean {
  return PUBLIC_PATHS.includes(path);
}

export function signInUrl(path: string, search = ""): string {
  const next = encodeURIComponent(`${path}${search}`);
  return `/sign-in?reason=expired&next=${next}`;
}

export function handleUnauthorized(
  location: Pick<Location, "pathname" | "search"> = window.location,
  navigate: (url: string) => void = (url) => window.location.assign(url),
): boolean {
  if (leaving || isPublicPath(location.pathname)) return false;
  leaving = true;
  navigate(signInUrl(location.pathname, location.search));
  return true;
}

export function resetSessionState() {
  leaving = false;
}
