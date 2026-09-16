Task 13: First step of CV optimization creator

The implementation in this task will be only focused on the frontend changes.
1. Add new page /cv-optimization which will hold cv optimization creator
2. Add link in top menu 'Cv Optimization' which will navigate to that page.
3. Add a CV optimization creator. Creator will be displayed on one page, but it will consist of 7 steps. So we should probalby have a stepper component. 
Steps should be one below the other, so one column.
4. For now we implement first step of creator:
- In the first step we must have a select/dropdown component where user can select cv.
- below we must have form where we can paste job application data.
- use ReactiveForm for the job application form, as I don't think PrimeNg already supports signal forms.
- add button with label 'Run', for now it should only trigger saving job application in the database, the aptimizations will be implement in the future tasks.