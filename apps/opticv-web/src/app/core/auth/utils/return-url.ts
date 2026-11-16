export const RETURN_URL_PARAM = 'returnUrl';

const AUTH_PATHS = ['/login', '/verify'];

export function getSafeReturnUrl(
  value: string | null | undefined,
): string | null {
  if (!value || !value.startsWith('/')) return null;
  if (value.startsWith('//') || value.startsWith('/\\')) return null;

  const path = value.split(/[?#]/)[0].replace(/\/+$/, '').toLowerCase();
  if (AUTH_PATHS.includes(path)) return null;

  return value;
}
