import { getSafeReturnUrl } from './return-url';

describe('getSafeReturnUrl', () => {
  it.each([null, undefined, ''])('returns null for %s', (value) => {
    expect(getSafeReturnUrl(value)).toBeNull();
  });

  it.each([
    'https://evil.com',
    'javascript:alert(1)',
    'settings',
    '//evil.com',
    '/\\evil.com',
  ])('returns null for external or malformed url %s', (value) => {
    expect(getSafeReturnUrl(value)).toBeNull();
  });

  it.each([
    '/login',
    '/verify',
    '/login/',
    '/LOGIN',
    '/login?returnUrl=%2Fsettings',
    '/verify#x',
  ])('returns null for auth page url %s', (value) => {
    expect(getSafeReturnUrl(value)).toBeNull();
  });

  it.each([
    '/settings',
    '/',
    '/settings?billing=success',
    '/cv-optimization?cvId=123',
    '/cv-optimization/abc',
    '/settings#plans',
    '/login-help',
  ])('returns valid in-app url %s unchanged', (value) => {
    expect(getSafeReturnUrl(value)).toBe(value);
  });
});
