Task 83: Implement subscription tier limits

Description:

We need to implement some limits for different types of subscription tiers that the app will give its users.
The app will offer 3 tiers: free, basic and pro so we need to change SubscriptionTier enum to hold values: FREE, BASIC, PRO.
Currently all registered users have FREE subscription tier, there are no users with other tiers.

FREE tier allows monthly:

- 1 CV otpimization run
- 1 cover letter generation
- 1 interview prep generation
- 2 templates for CV to choose from: default and classic
- 2 CV files uploaded

BASIC tier allows monthly:

- 10 CV otpimizations runs
- 10 cover letter generations
- 10 interview prep generation
- 10 linkedin profile content generations
- all CV templates available
- 10 CV files uploaded

PRO tier allows monthly:

- 30 CV otpimizations runs
- 30 cover letter generations
- 30 interview prep generation
- 30 linkedin profile content generations
- all CV templates available
- 20 CV files uploaded

I already discussed and prepared initial plan with Claude, the plan is stored in file:
@docs/subscription-tier-limits.md
Check that plan.

Changes to the plan: 
Diring the implementation let me run the migrations manually, as there have been problems before with your automatic migrations.
Don't prepare the migration to change user tiers to FREE, all existing users in DB have only FREE tier currently.