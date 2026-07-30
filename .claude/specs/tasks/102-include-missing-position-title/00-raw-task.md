Task 102: Optimized CV is missing the position title (BE & FE)

Description:

1. In the extract-cv-data.prompt.ts we don't specify any property to hold position title that user might have in their cv, for example Software Engineer or Angular Developer. We need to add position property to the prompt.

2. If user has the position title in their CV and this data is extracted from the CV file we need to include it in the optimized CV, position title should be displayed below the candidate's name.

This a backend and frontend task.