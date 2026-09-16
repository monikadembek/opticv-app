Task 38: Delete user account (BE & FE)

Description:

Backend:
- add endpoint to delete user account, when user deletes his account it should also delete all related data to this user and also delete files from R2

Frontend:
- add user settings section in dashboard where we display user data: email, current subscription tier, button to delete account,
- where user clicks delete accout we should get confirmation dialog,
- if user confirms account deletetion then when the account is deleted on backend we should log out current user.