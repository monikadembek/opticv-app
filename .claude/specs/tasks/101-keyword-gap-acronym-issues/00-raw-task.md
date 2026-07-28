Task 101: Acronym issues - implement adding/replacing keywords in optimized CV.

Description:

Currently we only display text in the Acronym issus section of the Keyword Gap component.
We should make acronym issues actionable - add/replace in the optimized resume.

In seed.ts in PromptType.KEYWORD_GAP in input_schema we should add acronym issues as required property, now it is not required. The properties thay we now get are term, issue and fix, but I think we should also add property actionType which would be a suggestion to the app about what should be done with it if user selects this acronym, "add", "replace". This should be enum type I think.