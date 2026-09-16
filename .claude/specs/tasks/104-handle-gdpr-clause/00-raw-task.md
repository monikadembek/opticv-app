Task 104: Handle GDPR clause in CV

Description:

If user is applying to jobs in the EU/EEA (or UK, under UK GDPR) it should have GDPR clause included in CV.

1. In the extract-cv-data.prompt.ts we don't specify any property to hold gdpr clause that user might have in their cv, this needs to be added, it should be of type eiher string or null.
2. If user has the gdpr clause in their CV and this data is extracted we need to include it in the optimized CV, it should be displayed at the bottom of last page.
3. All templates should also display the gdpr clause if it is precent.
4. In the export-footer component add checkbox with label gdpr clause, if user contains already a gdpr clause the checkbox should be checked, if there is no gdpr clause in the extracted CV then the checkbox should be unchecked. The checkbox should display in the title: "Include if you're applying to companies based in the EU, EEA, UK, or Switzerland"

5. If user selects this checkbox and doesnt have the clause in his cv a default gdpr clause should be added to the optimized CV, at the bottom of last page. Uchecking the checkbox should remove the clause from optimized CV.

The content of the clause should be:

I hereby give consent for my personal data included in this application to be processed for the purposes of the recruitment process, in accordance with Regulation (EU) 2016/679 (GDPR).