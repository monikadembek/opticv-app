import { appRoutes } from './app.routes';

describe('appRoutes', () => {
  describe('pricing route', () => {
    const route = appRoutes.find((r) => r.path === 'pricing');

    it('exists and lazy-loads a component', () => {
      expect(route).toBeDefined();
      expect(route?.loadComponent).toBeTypeOf('function');
    });

    it('is public (no activation or match guards)', () => {
      expect(route?.canActivate).toBeUndefined();
      expect(route?.canMatch).toBeUndefined();
      expect(route?.canActivateChild).toBeUndefined();
    });

    it('sets the page title', () => {
      expect(route?.title).toBe('Pricing – OptiCV');
    });
  });
});
