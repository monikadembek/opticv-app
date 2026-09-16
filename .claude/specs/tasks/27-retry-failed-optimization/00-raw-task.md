Task 27. Add functionality to retry failed optimization for given prompt

Description:
- Add 'Retry' button to each accordion panel in case optimization fails or if computed signals like autopsyResult and rest of those same type of signals return null, which means we got no data or data has invalid format which won't be passed to respective components to display it in UI.
- Retry should trigger only single optimization run for that given prompt type which failed or didn't give valid data
- Retry button should be enabled only when optimization failed or returned result with wrong/missing values and nothing is displayed

This is frontend only task.