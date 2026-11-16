Task 130. Automatically cancel Stripe subscription when account is deleted

Description:

Deleting an account doesn't cancel the Stripe subscription (users.service.ts:230), so a user who deletes their account keeps getting charged. For now the Terms tell users to cancel first, but this should be fixed in code. Stripe subscription should be automatically canceled when account is deleted. 