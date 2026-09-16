Task 10: CV structured extraction

Description:
The CV upload + text parsing flow is complete (task 9). Before we implement the AI-powered optimization w eneed to extract structured sections from the raw `parsedText` so the 7 optimization prompts have clean, typed input instead of unstructured raw text.

The extraction should run on demand, it should be triggered when user goes to the optimization-cv page where there will be an optimization creator and selects cv from dropdown. The frontend page is not yet implemented it will be in the one of the future tasks.

We need to implement the structured extraction on the backend now.
For now the extraction should use the OpenAI API (`gpt-4o-mini`). However I plan to also use API from Anthropic or Google Gemini later. So maybe we should have different services for different API's models providers.

The result of extraction should be stored as a JSON column (`structuredData`) on `CvDocument`. If the CV has already been extracted, the cached value is returned immediately — no second OpenAI call.

We need to extract these data:
{
  contact: { name, email, phone, location, linkedin, website },
  summary: string | null,
  experience: [{ title, company, location, startDate, endDate, current, bullets[] }],
  education: [{ degree, institution, location, startDate, endDate, field }],
  skills: string[],
  certifications: [{ name, issuer, date }],
  projects: [{ name, description, technologies[], url }],
  languages: [{ language, proficiency }],
  other: string | null   // catch-all for anything unrecognised
}

