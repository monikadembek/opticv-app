Task 15: Trigger single job

Description:
Implement single job per promptType triggered manually in case a job fails, because currently all 7 jobs are triggered in one triggerOptimization() call, and we don't want to re-run entire optimization process in case a job fails.