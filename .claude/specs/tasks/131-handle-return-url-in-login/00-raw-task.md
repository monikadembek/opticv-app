Task 131. Handle return url in the app when user navigates from landing page by clicking the button in pricing table to the app settings page in order to buy subscription but is not logged in

Description

User navigates to the app by clicking button in the landing page in pricing table and should be navigated to settings page, but if user is not logged in it will be navigated to the login page not the settings page where user can buy a subscription.
One problem in the app is worth knowing about first. /settings is protected by authGuard (opticv-app/.../core/auth/guards/auth-guard.ts). For a logged-out visitor it redirects to plain /login and doesn't remember where they came from. Most people clicking "Get Pro" on the landing page won't be logged in, so they'll sign in and land on the default page, not settings. The click still works, but it breaks the purchase path.

Add a return URL in the app: have the guard send them to /login?returnUrl=/settings, then redirect there after login or after the verify step. This is a small change and also fixes any other deep link into the app.