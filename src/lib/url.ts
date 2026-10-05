const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Prefix an internal path with the deploy base (e.g. /NASA-ULI-Web-App on GitHub Pages). */
export function url(path: string): string {
  if (/^(https?:|mailto:|#)/.test(path)) return path;
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

/** True when `href` is the current page or one of its descendants. */
export function isActive(href: string, pathname: string): boolean {
  const current = pathname.replace(base, '').replace(/\/$/, '') || '/';
  return current === href || current.startsWith(`${href}/`);
}

export function formatMonth(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
}
