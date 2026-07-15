Task 87: Add notifications (BE & FE)

Description:

- in account setting page user can turn on notification for product updates and job tips
- add new table Notifications with those options and add relation to user table
- prepare endpoint where user can send notification type with value true/ false and it would update that data in database
- on frontend in Account Settings page implement passing notifications values to backend via prepared endpoint, which should be executed when user clicks the switch button