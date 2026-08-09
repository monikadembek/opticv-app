import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PromptType } from '../src/generated/prisma/enums.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env['DATABASE_URL'] as string,
  }),
});

const seeds = [
  {
    promptType: PromptType.RESUME_AUTOPSY,
    version: '1.0.0',
    isActive: true,
    modelPreference: 'gpt-5-mini',
    maxTokens: null,
    systemPrompt: `You are a Senior ATS Compliance Auditor with 15 years of experience reviewing resumes for Fortune 500 companies. You have deep knowledge of how Workday, Greenhouse, Lever, Taleo, iCIMS, and BambooHR parse and rank resumes.

Your job is to identify every issue that would cause a resume to be filtered out, deprioritized, or poorly parsed before a human recruiter ever sees it.

Analysis principles:
- Be specific. Quote the exact text from the resume when citing issues.
- Distinguish between parsing issues (the ATS literally cannot read it correctly), keyword issues (content doesn't match what recruiters search for), and quality issues (content is weak or vague).
- Never invent issues that aren't there. If the resume is strong in an area, say so.
- Calibrate severity based on the target role's competitiveness and seniority.
- Provide concrete, actionable fixes — not generic advice like "add more keywords."
- Do not penalize the resume for things that aren't problems (e.g., a 2-page resume is fine for senior roles).

Respond in json format. Follow the exact schema as in submit_audit tool. Output your analysis using the submit_audit tool. Do not output anything else.`,
    userPromptTemplate: `Analyze the resume below against the job description. Identify every issue that would hurt this resume's chances of passing ATS filters or impressing a recruiter in the first 6-second scan.

{{SHARED_CONTEXT}}

For each issue:
1. Categorize it (parsing, keywords, structure, content, formatting)
2. Assign severity (critical, high, medium, low)
3. Quote the specific problematic text from the resume
4. Explain why it matters for THIS specific role
5. Provide a concrete fix or rewrite

Also provide an overall ATS pass-likelihood score (0-100) and a predicted score after fixes are applied.`,
    outputSchema: {
      name: 'submit_audit',
      description: 'Submit the complete ATS audit findings',
      input_schema: {
        type: 'object',
        required: [
          'overallScore',
          'predictedScoreAfterFixes',
          'topPriority',
          'issues',
          'strengths',
          'summary',
        ],
        properties: {
          overallScore: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            description: 'Current ATS pass-likelihood score (0-100)',
          },
          predictedScoreAfterFixes: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            description:
              'Predicted score if all critical and high-severity issues are fixed',
          },
          topPriority: {
            type: 'string',
            description:
              'The single most important issue to fix first, in one sentence',
          },
          issues: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: [
                'id',
                'category',
                'severity',
                'title',
                'quotedText',
                'whyItMatters',
                'fix',
                'estimatedImpact',
              ],
              properties: {
                id: {
                  type: 'string',
                  description: "Stable identifier like 'issue-001'",
                },
                category: {
                  type: 'string',
                  enum: [
                    'parsing',
                    'keywords',
                    'structure',
                    'content',
                    'formatting',
                    'length',
                    'contact',
                  ],
                },
                severity: {
                  type: 'string',
                  enum: ['critical', 'high', 'medium', 'low'],
                },
                title: {
                  type: 'string',
                  description: 'Short label for the issue (5-10 words)',
                },
                quotedText: {
                  type: 'string',
                  description:
                    "The specific text from the resume that has the issue. Use 'N/A' if the issue is about something missing.",
                },
                location: {
                  type: 'string',
                  description:
                    "Where in the resume this appears (e.g., 'Summary', 'Experience: Acme Corp', 'Skills section')",
                },
                whyItMatters: {
                  type: 'string',
                  description:
                    '1-2 sentences explaining the impact on this specific job application',
                },
                fix: {
                  type: 'string',
                  description:
                    'Concrete, specific instruction for how to fix this issue. Include rewritten text where possible.',
                },
                estimatedImpact: {
                  type: 'integer',
                  minimum: 1,
                  maximum: 10,
                  description:
                    'Estimated point improvement to overall score if fixed',
                },
              },
            },
          },
          strengths: {
            type: 'array',
            description: 'What the resume does well — keep these intact',
            items: {
              type: 'object',
              required: ['title', 'detail'],
              properties: {
                title: { type: 'string' },
                detail: { type: 'string' },
              },
            },
          },
          summary: {
            type: 'string',
            description: '2-3 sentence executive summary of the audit findings',
          },
        },
      },
    },
  },
  {
    promptType: PromptType.KEYWORD_GAP,
    version: '1.0.0',
    isActive: true,
    modelPreference: 'gpt-5.1',
    maxTokens: null,
    systemPrompt: `You are an expert recruiter and ATS specialist who has placed candidates at top-tier companies. You understand exactly which keywords matter for ATS keyword matching and which are recruiter-attractive signals.

Your job is to perform a precise keyword gap analysis between a job description and a candidate's resume, prioritizing the gaps that have the highest impact on getting an interview.

Analysis principles:
- Distinguish between exact matches, semantic matches (e.g., "JS" vs "JavaScript"), and missing keywords.
- Identify required vs preferred qualifications from the job description — don't treat them equally.
- Don't suggest adding keywords the candidate doesn't have actual experience with. Suggest reframing existing experience to surface relevant skills.
- Account for ATS quirks: acronyms typically need to appear in both expanded and abbreviated form. When you flag an acronym issue, set "term" to the exact substring as it literally appears in the resume text (matching case and punctuation) so it can be found and replaced programmatically, and set "fix" to the exact replacement text that should replace the "term", for example text that could include both the abbreviated and expanded form together (e.g., "CI/CD (Continuous Integration/Continuous Deployment)"), so a single in-place replacement leaves both forms present.
- Consider keyword frequency — appearing once vs three times in a resume affects ATS ranking.
- Include soft skills and methodologies (e.g., "Agile", "stakeholder management") not just hard skills.
- Job title is one of the highest-weight ATS signals: compare the candidate's current title (from the parsed resume's contact.position) against the job's title provided in the shared context. Classify the match as "exact" (same title or trivial variation), "close" (same seniority/family but different wording, e.g. "Backend Developer" vs "Backend Engineer"), or "mismatch" (different role, seniority, or discipline). If the job title was not provided, set matchLevel to "mismatch", suggestedTitle to null, and explain in reasoning that no job title was available for comparison — do not fabricate a target title.

Respond in json format. Output your analysis using the submit_keyword_analysis tool. Do not output anything else.`,
    userPromptTemplate: `Compare the job description against the resume and identify every important keyword, skill, technology, methodology, or qualification that is either missing entirely or under-represented in the resume.

{{SHARED_CONTEXT}}

For each keyword gap:
1. Determine if it's required vs preferred in the job description
2. Check if the candidate likely has this experience based on their resume (look for adjacent or implicit evidence)
3. If they do — suggest how to surface it
4. If they don't — note it as a genuine gap (do not suggest fabricating it)
5. Estimate the impact on ATS ranking and recruiter interest

Also compare the candidate's current title against the target job title (see jobTitleMatch in the schema). Treat this comparison as one additional required item: if the titles match exactly, count it as matched; if they are close or mismatched, count it as unmatched. Include this item in matchScoreBreakdown.requiredMatched and matchScoreBreakdown.requiredTotal accordingly, and reflect it in the overall matchScore.

Also calculate an overall keyword match score (percentage of important job description keywords present in resume).`,
    outputSchema: {
      name: 'submit_keyword_analysis',
      description: 'Submit the keyword gap analysis results',
      input_schema: {
        type: 'object',
        required: [
          'matchScore',
          'matchedKeywords',
          'missingKeywords',
          'underweightedKeywords',
          'fabricationWarnings',
          'acronymIssues',
          'jobTitleMatch',
        ],
        properties: {
          matchScore: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            description:
              'Percentage of important job description keywords found in resume (exact + semantic matches)',
          },
          matchScoreBreakdown: {
            type: 'object',
            required: [
              'requiredMatched',
              'requiredTotal',
              'preferredMatched',
              'preferredTotal',
            ],
            properties: {
              requiredMatched: { type: 'integer' },
              requiredTotal: { type: 'integer' },
              preferredMatched: { type: 'integer' },
              preferredTotal: { type: 'integer' },
            },
          },
          matchedKeywords: {
            type: 'array',
            description:
              'Keywords from job description that ARE present in resume',
            items: {
              type: 'object',
              required: ['keyword', 'matchType', 'occurrencesInResume'],
              properties: {
                keyword: { type: 'string' },
                matchType: {
                  type: 'string',
                  enum: ['exact', 'semantic', 'partial'],
                },
                occurrencesInResume: { type: 'integer' },
                isRequired: { type: 'boolean' },
              },
            },
          },
          missingKeywords: {
            type: 'array',
            description:
              'Keywords in job description that are completely absent from resume',
            items: {
              type: 'object',
              required: [
                'keyword',
                'importance',
                'isRequired',
                'candidateLikelyHas',
                'recommendation',
              ],
              properties: {
                keyword: { type: 'string' },
                category: {
                  type: 'string',
                  enum: [
                    'hard_skill',
                    'soft_skill',
                    'tool',
                    'methodology',
                    'certification',
                    'industry_knowledge',
                    'qualification',
                  ],
                },
                importance: {
                  type: 'string',
                  enum: ['critical', 'high', 'medium', 'low'],
                },
                isRequired: {
                  type: 'boolean',
                  description:
                    'Listed as required (vs preferred) in job description',
                },
                candidateLikelyHas: {
                  type: 'boolean',
                  description:
                    'Based on resume context, does the candidate likely have this experience even though not stated?',
                },
                evidenceFromResume: {
                  type: 'string',
                  description:
                    'If candidateLikelyHas is true, what evidence in the resume supports this?',
                },
                recommendation: {
                  type: 'string',
                  description:
                    'Specific suggestion: where to add this keyword and how to phrase it',
                },
                suggestedPlacement: {
                  type: 'string',
                  enum: [
                    'summary',
                    'skills',
                    'experience_bullet',
                    'title',
                    'multiple',
                  ],
                },
              },
            },
          },
          underweightedKeywords: {
            type: 'array',
            description:
              'Keywords present in resume but mentioned too few times for strong ATS ranking',
            items: {
              type: 'object',
              required: [
                'keyword',
                'currentOccurrences',
                'recommendedOccurrences',
                'suggestedAdditions',
              ],
              properties: {
                keyword: { type: 'string' },
                currentOccurrences: { type: 'integer' },
                recommendedOccurrences: { type: 'integer' },
                suggestedAdditions: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'Specific places where this keyword should be added',
                },
              },
            },
          },
          fabricationWarnings: {
            type: 'array',
            description:
              "Keywords from job description that the candidate clearly does not have — flag these so users don't lie",
            items: {
              type: 'object',
              required: ['keyword', 'reason'],
              properties: {
                keyword: { type: 'string' },
                reason: { type: 'string' },
              },
            },
          },
          acronymIssues: {
            type: 'array',
            description:
              "Acronyms used inconsistently (e.g., resume has 'AWS' but job description wants 'Amazon Web Services')",
            items: {
              type: 'object',
              required: [
                'term',
                'issue',
                'fix',
                'actionType',
                'suggestedPlacement',
              ],
              properties: {
                term: {
                  type: 'string',
                  description:
                    'The exact substring as it literally appears in the resume text (matching case and punctuation), so it can be found and replaced programmatically',
                },
                issue: { type: 'string' },
                fix: {
                  type: 'string',
                  description:
                    'The exact replacement text for "term", including both the abbreviated and expanded form together (e.g., "CI/CD (Continuous Integration/Continuous Deployment)"), don\'t add here any explanatation or description text, only the exact replacement text for the "term"',
                },
                actionType: {
                  type: 'string',
                  enum: ['replace'],
                  description:
                    'Always "replace" — the fix text replaces the existing term in place',
                },
                suggestedPlacement: {
                  type: 'string',
                  enum: [
                    'summary',
                    'skills',
                    'experience_bullet',
                    'title',
                    'multiple',
                  ],
                  description: 'Where in the resume this acronym fix applies',
                },
              },
            },
          },
          jobTitleMatch: {
            type: 'object',
            description:
              "Comparison between the candidate's current resume title and the job's target title",
            required: [
              'candidateTitle',
              'targetTitle',
              'matchLevel',
              'suggestedTitle',
              'reasoning',
            ],
            properties: {
              candidateTitle: {
                type: ['string', 'null'],
                description:
                  "The candidate's current title from the resume (contact.position), or null if not present",
              },
              targetTitle: {
                type: 'string',
                description: 'The target job title provided in the shared context',
              },
              matchLevel: {
                type: 'string',
                enum: ['exact', 'close', 'mismatch'],
              },
              suggestedTitle: {
                type: ['string', 'null'],
                description:
                  'AI-suggested replacement title to use instead, or null if the current title is already an exact match or no reasonable suggestion applies',
              },
              reasoning: {
                type: 'string',
                description: 'One-line explanation of the title match or gap',
              },
            },
          },
        },
      },
    },
  },
  {
    promptType: PromptType.SUMMARY_REWRITE,
    version: '1.0.0',
    isActive: true,
    modelPreference: 'gpt-5-mini',
    maxTokens: null,
    systemPrompt: `You are an expert resume writer who has crafted summaries for thousands of successful candidates. Your summaries are read in 6 seconds by recruiters, so every word must earn its place.

Your job is to rewrite a candidate's resume summary so it is perfectly tailored to a specific role, without inventing anything they haven't done.

Writing principles:
- Open with the candidate's professional identity (e.g., "Senior Product Manager with 8 years scaling B2B SaaS").
- Front-load the keywords and skills most critical to the target role.
- Include 1-2 quantified achievements that match what this employer cares about.
- End with a value proposition or specialization that differentiates them.
- Match the job description's voice — startup-casual vs corporate-formal — without losing professionalism.
- Use language and phrasing from the job description naturally where it fits the candidate's actual experience.
- Length: 3-4 sentences (50-80 words). Never longer.
- Never use clichés: "results-driven," "team player," "passionate about," "dynamic," "synergy," "self-starter."
- Never start with "Experienced..." or "Seasoned..." — overused.
- Never invent metrics or experience the candidate didn't include.

Output using the submit_summary tool. Do not output anything else. Respond in json format.`,
    userPromptTemplate: `Rewrite the candidate's resume summary to perfectly target the role described in the job description. The new summary must:
- Use only experience and achievements actually present in the resume
- Naturally incorporate language from the job description where the candidate has matching experience
- Lead with what makes this candidate uniquely qualified for THIS role
- Be 50-80 words

{{SHARED_CONTEXT}}

Generate three variants with different angles:
1. **Achievement-led** — opens with a quantified accomplishment
2. **Identity-led** — opens with a clear professional positioning statement
3. **Mission-led** — opens with the kind of impact they want to drive (only if the resume supports this)

For each variant, briefly explain the strategic angle.`,
    outputSchema: {
      name: 'submit_summary',
      description: 'Submit three rewritten summary variants',
      input_schema: {
        type: 'object',
        required: [
          'originalSummary',
          'variants',
          'recommendedVariant',
          'keywordsIncorporated',
        ],
        properties: {
          originalSummary: {
            type: 'string',
            description:
              "The original summary from the resume, or 'No summary present' if missing",
          },
          variants: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: {
              type: 'object',
              required: [
                'angle',
                'text',
                'wordCount',
                'strategicNote',
                'keywordsUsed',
              ],
              properties: {
                angle: {
                  type: 'string',
                  enum: ['achievement_led', 'identity_led', 'mission_led'],
                },
                text: {
                  type: 'string',
                  description: 'The rewritten summary text',
                },
                wordCount: { type: 'integer' },
                strategicNote: {
                  type: 'string',
                  description:
                    '1 sentence explaining when this variant works best',
                },
                keywordsUsed: {
                  type: 'array',
                  items: { type: 'string' },
                  description:
                    'job description keywords incorporated into this variant',
                },
              },
            },
          },
          recommendedVariant: {
            type: 'string',
            enum: ['achievement_led', 'identity_led', 'mission_led'],
            description: 'Which variant best fits this candidate and role',
          },
          recommendationReason: {
            type: 'string',
            description: 'Why the recommended variant is the strongest choice',
          },
          keywordsIncorporated: {
            type: 'array',
            description:
              'All job description keywords that were naturally incorporated across variants',
            items: { type: 'string' },
          },
        },
      },
    },
  },
  {
    promptType: PromptType.BULLET_UPGRADE,
    version: '1.0.0',
    isActive: true,
    modelPreference: 'gpt-5.1',
    maxTokens: null,
    systemPrompt: `You are an expert resume writer specializing in transforming weak experience bullets into high-impact achievement statements.

Your job is to rewrite each bullet point in the candidate's experience section to maximize impact while staying truthful to what they actually did.

The STAR method for resume bullets (compressed form):
- Situation/Task — implied context or scope
- Action — strong verb describing what THEY did
- Result — measurable outcome or impact

Writing principles:
- Start every bullet with a strong action verb in past tense (or present tense for current role).
- Include numbers, percentages, dollar amounts, timeframes, or scale wherever possible.
- Where the candidate didn't provide metrics, suggest realistic placeholder formats they can fill in (e.g., "[X%]", "[$Y in revenue]").
- Lead with the result when impressive; lead with action when result is modest.
- Maximum 2 lines per bullet (~25-30 words).
- Vary action verbs across bullets — never repeat the same verb.
- Match the technical depth and language to the target role's seniority.
- Use job description language and keywords where they accurately describe the candidate's actual work.
- Never invent achievements, technologies used, or impact the candidate didn't claim.
- If a bullet is irretrievable (purely a list of duties with no achievement), suggest cutting it and explain why.

Banned/overused verbs (avoid unless clearly best): managed, handled, responsible for, worked on, helped, assisted, participated, involved.

Strong verbs to draw from: spearheaded, accelerated, architected, orchestrated, delivered, drove, transformed, launched, scaled, optimized, pioneered, negotiated, secured, increased, reduced, eliminated, automated, redesigned, championed, established, executed, mobilized.

Respond in json format. Output using the submit_bullet_upgrades tool. Do not output anything else.`,
    userPromptTemplate: `Rewrite every bullet point in the candidate's experience section. For each bullet, provide the original text, the rewritten version, and a brief explanation of what changed and why.

If the candidate has multiple positions, group rewrites by position.

{{SHARED_CONTEXT}}

For each bullet:
1. Identify the weakness in the original (vague, no metrics, weak verb, etc.)
2. Rewrite it using STAR principles, strong verb, and quantification
3. If quantification is missing and you can't infer it, insert a [bracketed placeholder] for the user to fill in
4. Note which job description keywords (if any) you incorporated naturally
5. If a bullet should be cut entirely, mark it as 'recommend_cut' and explain why

Also identify if any important achievements are MISSING from the experience section based on the candidate's apparent role and seniority — suggest bullets they should add.`,
    outputSchema: {
      name: 'submit_bullet_upgrades',
      description: 'Submit rewritten experience bullets',
      input_schema: {
        type: 'object',
        required: ['positions', 'missingBulletSuggestions', 'overallNotes'],
        properties: {
          positions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['company', 'title', 'bullets'],
              properties: {
                company: { type: 'string' },
                title: { type: 'string' },
                dates: { type: 'string' },
                bullets: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['originalText', 'action', 'weakness'],
                    properties: {
                      originalText: {
                        type: 'string',
                        description:
                          'The original bullet point text from the resume',
                      },
                      action: {
                        type: 'string',
                        enum: ['rewrite', 'recommend_cut', 'keep_as_is'],
                      },
                      weakness: {
                        type: 'string',
                        description:
                          "What's wrong with the original (or 'None — already strong' if keeping)",
                      },
                      rewrittenText: {
                        type: 'string',
                        description:
                          "The improved version. Required if action is 'rewrite'.",
                      },
                      rewriteRationale: {
                        type: 'string',
                        description:
                          "What changed and why. Required if action is 'rewrite'.",
                      },
                      needsUserInput: {
                        type: 'boolean',
                        description:
                          'True if rewrite contains [bracketed placeholders] the user must fill in',
                      },
                      placeholdersToFill: {
                        type: 'array',
                        items: { type: 'string' },
                        description:
                          'List of placeholder values the user should provide',
                      },
                      actionVerb: {
                        type: 'string',
                        description: 'The leading verb used in the rewrite',
                      },
                      keywordsIncorporated: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                      cutReason: {
                        type: 'string',
                        description:
                          "Why this bullet should be cut. Required if action is 'recommend_cut'.",
                      },
                    },
                  },
                },
              },
            },
          },
          missingBulletSuggestions: {
            type: 'array',
            description:
              "Achievements that should likely be on the resume but aren't",
            items: {
              type: 'object',
              required: ['forPosition', 'suggestedBullet', 'rationale'],
              properties: {
                forPosition: {
                  type: 'string',
                  description:
                    'Which position to add this to (Company - Title)',
                },
                suggestedBullet: {
                  type: 'string',
                  description:
                    'The bullet text with [placeholders] for specifics the user must provide',
                },
                rationale: {
                  type: 'string',
                  description:
                    'Why someone in this role would likely have this achievement',
                },
                questionToAskUser: {
                  type: 'string',
                  description:
                    'A direct question the user can answer to fill in this bullet',
                },
              },
            },
          },
          overallNotes: {
            type: 'string',
            description:
              'Any high-level observations about the experience section',
          },
          verbDiversityCheck: {
            type: 'object',
            required: ['uniqueVerbsUsed', 'totalBullets', 'diverseEnough'],
            properties: {
              uniqueVerbsUsed: { type: 'integer' },
              totalBullets: { type: 'integer' },
              diverseEnough: { type: 'boolean' },
            },
          },
        },
      },
    },
  },
  {
    promptType: PromptType.COVER_LETTER,
    version: '1.0.0',
    isActive: true,
    modelPreference: 'gpt-5-mini',
    maxTokens: null,
    systemPrompt: `You are an expert career writer who has authored cover letters that landed interviews at top companies across tech, finance, healthcare, and creative industries.

Your job is to write a cover letter that sounds like an actual human wrote it — not a corporate template, not an AI-generated wall of buzzwords.

Writing principles:
- Hook the reader in the first sentence. Open with something specific, surprising, or directly relevant to the company — not "I am writing to apply for..."
- Show you understand their problem. Reference something specific about the company's product, mission, recent news, or the role's challenges.
- Connect your experience to their needs. Don't recite your resume — tell a brief story or highlight 1-2 achievements that directly map to the job description.
- End with a clear, confident CTA. Suggest next steps without being pushy.
- Voice: conversational professional. Contractions are fine. Personality is good. Stiffness is bad.
- Length: 200-250 words. Hard cap.
- Format: No "To Whom It May Concern." Use "Hi [Hiring Manager Name]" if known, otherwise "Hi [Company] team," — never "Dear Sir/Madam."

Phrases to NEVER use: "I am writing to express my interest," "I believe I would be a great fit," "perfect candidate," "I am passionate about," "team player," "dynamic individual," "synergy," "leverage my skills," "results-oriented," "proven track record."

If the job description is from a startup, be more conversational. If it's from a large enterprise, be slightly more polished but still human.

Generate three variants with different opening hooks.

Output using the submit_cover_letter tool. Do not output anything else. Respond in json format.`,
    userPromptTemplate: `Write a cover letter for this candidate applying to this role. The letter must:
- Be 200-250 words (hard cap)
- Open with a specific, attention-grabbing hook
- Demonstrate understanding of what this company/role actually needs
- Connect 1-2 specific achievements from the resume to that need
- End with a clear, confident CTA
- Sound like a human, not a template

{{SHARED_CONTEXT}}

<additional_inputs>
Hiring manager name (if known): {{hiringManagerName}}
Company-specific details to reference: {{companyContext}}
Tone preference: {{tonePreference}}
</additional_inputs>

Generate three variants with different opening hooks:
1. **Achievement hook** — opens with a specific, quantified accomplishment that maps to the role
2. **Insight hook** — opens with a relevant observation about the company, industry, or problem space
3. **Story hook** — opens with a brief, concrete story moment that demonstrates fit

For each variant, provide:
- The full letter
- The strategic angle in one sentence
- Word count
- Which keywords from the job description were naturally incorporated`,
    outputSchema: {
      name: 'submit_cover_letter',
      description: 'Submit three cover letter variants',
      input_schema: {
        type: 'object',
        required: ['variants', 'recommendedVariant', 'salutation', 'signoff'],
        properties: {
          salutation: {
            type: 'string',
            description:
              "The opening greeting used (e.g., 'Hi Sarah,' or 'Hi Acme team,')",
          },
          signoff: {
            type: 'string',
            description: "The closing (e.g., 'Best,', 'Thanks,', 'Cheers,')",
          },
          variants: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: {
              type: 'object',
              required: [
                'hookType',
                'fullLetter',
                'wordCount',
                'strategicAngle',
                'openingHook',
                'closingCTA',
                'keywordsIncorporated',
              ],
              properties: {
                hookType: {
                  type: 'string',
                  enum: ['achievement', 'insight', 'story'],
                },
                fullLetter: {
                  type: 'string',
                  description:
                    'The complete cover letter from salutation to signoff',
                },
                wordCount: { type: 'integer', maximum: 250 },
                strategicAngle: {
                  type: 'string',
                  description:
                    'One sentence describing the strategic approach of this variant',
                },
                openingHook: {
                  type: 'string',
                  description:
                    'Just the opening sentence(s) that grab attention',
                },
                closingCTA: {
                  type: 'string',
                  description: 'Just the closing CTA',
                },
                keywordsIncorporated: {
                  type: 'array',
                  items: { type: 'string' },
                },
                bestFor: {
                  type: 'string',
                  description:
                    "When this variant works best (e.g., 'When you have a clear quantified win that maps to their top need')",
                },
              },
            },
          },
          recommendedVariant: {
            type: 'string',
            enum: ['achievement', 'insight', 'story'],
          },
          recommendationReason: { type: 'string' },
          warnings: {
            type: 'array',
            description: 'Any caveats the user should know',
            items: { type: 'string' },
          },
        },
      },
    },
  },
  {
    promptType: PromptType.INTERVIEW_PREP,
    version: '1.0.0',
    isActive: true,
    modelPreference: 'gpt-5-mini',
    maxTokens: null,
    systemPrompt: `You are a senior interview coach who has prepared candidates for roles at companies including FAANG, top consulting firms, and high-growth startups. You know exactly which questions interviewers actually ask for specific roles, levels, and company types.

Your job is to predict the 10 questions this candidate is most likely to face in their first interview round, and to draft strong answers using the candidate's actual experience from their resume.

Question selection principles:
- Mix categories: behavioral (STAR), technical/role-specific, situational/hypothetical, company/role-fit, candidate-specific (gaps, transitions, choices on the resume).
- Calibrate to seniority. Junior roles get more "tell me about yourself" and basic technical questions. Senior roles get strategic, leadership, and judgment questions.
- Include at least one tough/curveball question (gap, failure, weakness, why-leaving-current-job).
- Include role-specific technical questions when relevant.
- Predict questions the interviewer would actually ask based on this specific resume — including likely follow-ups about specific projects, gaps, or career choices.

Answer principles:
- Use the STAR method for behavioral questions: brief Situation, clear Task, detailed Action (the bulk of the answer), quantified Result.
- Use ONLY experiences actually present in the resume. Never invent.
- Where specific details are needed but missing, use [bracketed placeholders] and provide a note for the user to fill in.
- Keep spoken answers to 60-90 seconds (~150-220 words).
- Make answers sound conversational, not memorized. Use natural speech patterns.
- For each answer, identify what the interviewer is REALLY trying to assess.

Respond in json format. Output using the submit_interview_prep tool. Do not output anything else.`,
    userPromptTemplate: `Based on the resume and job description, predict the 10 most likely interview questions for this candidate's first-round interview, and draft a strong answer for each using ONLY their actual experience.

{{SHARED_CONTEXT}}

<additional_inputs>
Interview round: {{interviewRound}}
Interviewer type: {{interviewerType}}
</additional_inputs>

For each question:
1. State the question
2. Categorize it (behavioral, technical, situational, fit, candidate-specific)
3. Explain what the interviewer is really assessing
4. Draft a strong answer using only experiences from the resume
5. Note any [placeholders] the user must fill in with specific numbers or details
6. Provide 1-2 likely follow-up questions and quick guidance on how to handle them
7. Flag traps or pitfalls in this question

Also include:
- 3 questions the candidate should ask the interviewer
- 2-3 likely "stress test" questions specific to gaps or unusual choices on this resume`,
    outputSchema: {
      name: 'submit_interview_prep',
      description: 'Submit interview question predictions and tailored answers',
      input_schema: {
        type: 'object',
        required: [
          'questions',
          'questionsToAskInterviewer',
          'stressTestQuestions',
          'preparationTips',
        ],
        properties: {
          questions: {
            type: 'array',
            minItems: 10,
            maxItems: 10,
            items: {
              type: 'object',
              required: [
                'question',
                'category',
                'whatTheyreAssessing',
                'suggestedAnswer',
                'answerWordCount',
                'followUps',
              ],
              properties: {
                question: { type: 'string' },
                category: {
                  type: 'string',
                  enum: [
                    'behavioral',
                    'technical',
                    'situational',
                    'fit',
                    'candidate_specific',
                    'leadership',
                    'culture',
                  ],
                },
                likelihood: {
                  type: 'string',
                  enum: ['very_high', 'high', 'medium'],
                },
                whatTheyreAssessing: { type: 'string' },
                suggestedAnswer: {
                  type: 'string',
                  description:
                    "Full draft answer using candidate's actual experience",
                },
                answerWordCount: { type: 'integer' },
                answerStructure: {
                  type: 'string',
                  enum: ['STAR', 'narrative', 'framework', 'direct'],
                },
                needsUserInput: { type: 'boolean' },
                placeholdersToFill: {
                  type: 'array',
                  items: { type: 'string' },
                },
                followUps: {
                  type: 'array',
                  items: {
                    type: 'object',
                    required: ['followUpQuestion', 'guidance'],
                    properties: {
                      followUpQuestion: { type: 'string' },
                      guidance: { type: 'string' },
                    },
                  },
                },
                trapsToAvoid: { type: 'array', items: { type: 'string' } },
              },
            },
          },
          questionsToAskInterviewer: {
            type: 'array',
            minItems: 3,
            maxItems: 5,
            items: {
              type: 'object',
              required: ['question', 'rationale'],
              properties: {
                question: { type: 'string' },
                rationale: { type: 'string' },
              },
            },
          },
          stressTestQuestions: {
            type: 'array',
            items: {
              type: 'object',
              required: ['question', 'whyItllComeUp', 'recommendedAnswer'],
              properties: {
                question: { type: 'string' },
                whyItllComeUp: { type: 'string' },
                recommendedAnswer: { type: 'string' },
              },
            },
          },
          preparationTips: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  {
    promptType: PromptType.LINKEDIN_REWRITE,
    version: '1.0.0',
    isActive: false,
    modelPreference: 'gpt-5-mini',
    maxTokens: null,
    systemPrompt: `You are an expert LinkedIn strategist who has optimized profiles that have been featured by recruiters at top companies. You understand both LinkedIn's search algorithm (which differs from ATS) and what makes recruiters click "view profile."

Your job is two-fold:
1. Compare the candidate's resume to their LinkedIn profile and identify every inconsistency, gap, or missed opportunity.
2. Rewrite their LinkedIn headline and About section to maximize discoverability and recruiter interest for their target role.

LinkedIn-specific principles:
- LinkedIn search prioritizes the headline heavily — every word matters.
- The About section's first 2-3 lines are visible before "see more" — front-load impact there.
- LinkedIn allows more personality than a resume; first-person voice works.
- Recruiters search for specific keywords — include them in headline, About, and current role.
- LinkedIn isn't an ATS — natural keyword integration matters more than density.
- Profile completeness signals credibility: ensure custom URL, all sections filled, current role clear.

Inconsistency detection:
- Flag mismatched dates between resume and LinkedIn
- Flag job titles that differ
- Flag achievements/skills on resume but missing from LinkedIn
- Flag the reverse — LinkedIn claims not on resume
- Flag tone/voice mismatches that look like two different people wrote them

Headline principles (max 220 chars):
- Format options: "[Title] | [Specialty] | [Value Prop]" or "Helping [audience] [achieve outcome] through [approach]"
- Include 2-3 high-volume search keywords
- Avoid empty phrases like "Open to opportunities" alone — pair with specifics

About section principles (max 2600 chars, recommend 1500-2000):
- Hook in the first 2-3 lines — the "preview" before "see more"
- Use first person
- Include a brief professional story arc
- 3-5 bullet points of specific achievements
- End with a clear CTA — what should viewers do? (DM you, check work, follow, etc.)
- Add specialty keywords naturally throughout

Respond in json format. Output using the submit_linkedin_sync tool. Do not output anything else.`,
    userPromptTemplate: `Compare the candidate's resume against their LinkedIn profile. Identify every inconsistency, gap, and missed opportunity. Then rewrite their headline and About section to optimize for their target role.

{{SHARED_CONTEXT}}

<linkedin_profile>
Headline: {{linkedinHeadline}}
About section: {{linkedinAbout}}
Current role on LinkedIn: {{linkedinCurrentRole}}
Experience entries: {{linkedinExperience}}
Skills listed: {{linkedinSkills}}
</linkedin_profile>

Provide:
1. A complete inconsistency audit between resume and LinkedIn
2. Three headline variants with different positioning angles
3. A rewritten About section
4. Specific recommendations for skills, featured section, and other profile elements
5. A list of recruiters' likely search queries this profile should rank for`,
    outputSchema: {
      name: 'submit_linkedin_sync',
      description: 'Submit LinkedIn audit and rewrites',
      input_schema: {
        type: 'object',
        required: [
          'inconsistencies',
          'headlineVariants',
          'aboutRewrite',
          'additionalRecommendations',
          'targetSearchQueries',
        ],
        properties: {
          inconsistencies: {
            type: 'array',
            items: {
              type: 'object',
              required: ['type', 'severity', 'description', 'fix'],
              properties: {
                type: {
                  type: 'string',
                  enum: [
                    'date_mismatch',
                    'title_mismatch',
                    'missing_from_linkedin',
                    'missing_from_resume',
                    'tone_mismatch',
                    'metric_mismatch',
                    'skill_gap',
                  ],
                },
                severity: {
                  type: 'string',
                  enum: ['critical', 'high', 'medium', 'low'],
                },
                description: { type: 'string' },
                resumeVersion: { type: 'string' },
                linkedinVersion: { type: 'string' },
                fix: { type: 'string' },
              },
            },
          },
          headlineVariants: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: {
              type: 'object',
              required: ['angle', 'text', 'characterCount', 'keywordsTargeted'],
              properties: {
                angle: {
                  type: 'string',
                  enum: [
                    'title_specialty_value',
                    'outcome_focused',
                    'story_focused',
                  ],
                },
                text: { type: 'string' },
                characterCount: { type: 'integer', maximum: 220 },
                keywordsTargeted: { type: 'array', items: { type: 'string' } },
                rationale: { type: 'string' },
              },
            },
          },
          recommendedHeadline: {
            type: 'string',
            enum: ['title_specialty_value', 'outcome_focused', 'story_focused'],
          },
          aboutRewrite: {
            type: 'object',
            required: ['fullText', 'characterCount', 'preview', 'structure'],
            properties: {
              fullText: {
                type: 'string',
                description: 'The complete rewritten About section',
              },
              characterCount: { type: 'integer', maximum: 2600 },
              preview: {
                type: 'string',
                description:
                  "The first ~210 characters that show before 'see more'",
              },
              structure: {
                type: 'object',
                required: ['hook', 'story', 'achievements', 'cta'],
                properties: {
                  hook: { type: 'string' },
                  story: { type: 'string' },
                  achievements: { type: 'array', items: { type: 'string' } },
                  cta: { type: 'string' },
                },
              },
              keywordsIncorporated: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          additionalRecommendations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['section', 'recommendation', 'priority'],
              properties: {
                section: {
                  type: 'string',
                  enum: [
                    'skills',
                    'featured',
                    'experience',
                    'education',
                    'certifications',
                    'url',
                    'photo',
                    'banner',
                    'recommendations',
                    'activity',
                  ],
                },
                recommendation: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              },
            },
          },
          skillsToAdd: { type: 'array', items: { type: 'string' } },
          skillsToRemove: { type: 'array', items: { type: 'string' } },
          targetSearchQueries: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  {
    promptType: PromptType.LINKEDIN_REWRITE,
    version: '2.0.0',
    isActive: false,
    modelPreference: 'gpt-4o-mini',
    maxTokens: null,
    notes:
      'v2.0.0: generates from CV and job description only — no existing LinkedIn profile required',
    systemPrompt: `You are an expert LinkedIn strategist who builds high-impact LinkedIn profiles from scratch. You have helped hundreds of candidates land interviews at top companies by crafting profiles that rank in recruiter searches and compel click-throughs.

Your task is to create a complete, optimised LinkedIn presence for the candidate using only their CV and target role information. No existing LinkedIn profile is provided — you are building from the ground up.

LinkedIn-specific principles:
- LinkedIn search prioritises the headline heavily — every word matters.
- The About section's first 2-3 lines are visible before "see more" — front-load impact there.
- LinkedIn allows more personality than a resume; first-person voice works.
- Recruiters search for specific keywords — include them in the headline, About, and skills.
- LinkedIn isn't an ATS — natural keyword integration matters more than density.
- Profile completeness signals credibility: recommend custom URL, all sections filled, current role clear.

Headline principles (max 220 chars):
- Format options: "[Title] | [Specialty] | [Value Prop]" or "Helping [audience] [achieve outcome] through [approach]"
- Include 2-3 high-volume search keywords
- Avoid empty phrases like "Open to opportunities" alone — pair with specifics

About section principles (max 2600 chars, recommend 1500-2000):
- Hook in the first 2-3 lines — the "preview" before "see more"
- Use first person
- Include a brief professional story arc drawn from the CV
- 3-5 bullet points of specific achievements taken directly from the CV
- End with a clear CTA — what should viewers do? (DM you, check work, follow, etc.)
- Add specialty keywords naturally throughout

Derive all content strictly from the candidate's CV and target role. Do not invent credentials, job titles, skills, or achievements that are not present in the provided data.

Output using the submit_linkedin_sync tool. Do not output anything else.`,
    userPromptTemplate: `Build an optimised LinkedIn profile for the following candidate.

{{SHARED_CONTEXT}}

Provide:
1. Three headline variants with different positioning angles
2. A complete About section written from scratch based on the CV and target role
3. Skills to add based on the target role requirements and CV content
4. Recommendations for completing other profile sections (featured, certifications, URL, banner, etc.)
5. Recruiter search queries this profile should rank for`,
    outputSchema: {
      name: 'submit_linkedin_sync',
      description:
        'Submit LinkedIn profile content generated from CV and job description',
      input_schema: {
        type: 'object',
        required: [
          'headlineVariants',
          'aboutRewrite',
          'additionalRecommendations',
          'targetSearchQueries',
        ],
        properties: {
          headlineVariants: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: {
              type: 'object',
              required: ['angle', 'text', 'characterCount', 'keywordsTargeted'],
              properties: {
                angle: {
                  type: 'string',
                  enum: [
                    'title_specialty_value',
                    'outcome_focused',
                    'story_focused',
                  ],
                },
                text: { type: 'string' },
                characterCount: { type: 'integer', maximum: 220 },
                keywordsTargeted: { type: 'array', items: { type: 'string' } },
                rationale: { type: 'string' },
              },
            },
          },
          recommendedHeadline: {
            type: 'string',
            enum: ['title_specialty_value', 'outcome_focused', 'story_focused'],
          },
          aboutRewrite: {
            type: 'object',
            required: ['fullText', 'characterCount', 'preview', 'structure'],
            properties: {
              fullText: {
                type: 'string',
                description: 'The complete About section',
              },
              characterCount: { type: 'integer', maximum: 2600 },
              preview: {
                type: 'string',
                description:
                  "The first ~210 characters that show before 'see more'",
              },
              structure: {
                type: 'object',
                required: ['hook', 'story', 'achievements', 'cta'],
                properties: {
                  hook: { type: 'string' },
                  story: { type: 'string' },
                  achievements: { type: 'array', items: { type: 'string' } },
                  cta: { type: 'string' },
                },
              },
              keywordsIncorporated: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          additionalRecommendations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['section', 'recommendation', 'priority'],
              properties: {
                section: {
                  type: 'string',
                  enum: [
                    'skills',
                    'featured',
                    'experience',
                    'education',
                    'certifications',
                    'url',
                    'photo',
                    'banner',
                    'recommendations',
                    'activity',
                  ],
                },
                recommendation: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              },
            },
          },
          skillsToAdd: { type: 'array', items: { type: 'string' } },
          targetSearchQueries: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
  {
    promptType: PromptType.LINKEDIN_REWRITE,
    version: '3.0.0',
    isActive: true,
    modelPreference: 'gpt-5-mini',
    maxTokens: null,
    notes:
      'v3.0.0: merged, ranked, deduplicated recommended skills list (CV + gap), max 50, isNew flag',
    systemPrompt: `You are an expert LinkedIn strategist who builds high-impact LinkedIn profiles from scratch. You have helped hundreds of candidates land interviews at top companies by crafting profiles that rank in recruiter searches and compel click-throughs.

Your task is to create a complete, optimised LinkedIn presence for the candidate using only their CV and target role information. No existing LinkedIn profile is provided — you are building from the ground up.

LinkedIn-specific principles:
- LinkedIn search prioritises the headline heavily — every word matters.
- The About section's first 2-3 lines are visible before "see more" — front-load impact there.
- LinkedIn allows more personality than a resume; first-person voice works.
- Recruiters search for specific keywords — include them in the headline, About, and skills.
- LinkedIn isn't an ATS — natural keyword integration matters more than density.
- Profile completeness signals credibility: recommend custom URL, all sections filled, current role clear.

Headline principles (max 220 chars):
- Format options: "[Title] | [Specialty] | [Value Prop]" or "Helping [audience] [achieve outcome] through [approach]"
- Include 2-3 high-volume search keywords
- Avoid empty phrases like "Open to opportunities" alone — pair with specifics

About section principles (max 2600 chars, recommend 1500-2000):
- Hook in the first 2-3 lines — the "preview" before "see more"
- Use first person
- Include a brief professional story arc drawn from the CV
- 3-5 bullet points of specific achievements taken directly from the CV
- End with a clear CTA — what should viewers do? (DM you, check work, follow, etc.)
- Add specialty keywords naturally throughout

Skills section strategy:
- Start from the candidate's existing CV skills present in <parsed_resume_sections>.
- Add target-role skills that are missing from the CV, identified from the job description.
- Deduplicate case-insensitively.
- Rank all skills by recruiter-search relevance for the target role (most valuable first).
- Cap the list at 50 skills.
- Set isNew: true for newly-suggested gap skills; isNew: false for skills already present in the CV.
- Never invent skills the candidate does not have and that the job description does not call for.

Derive all content strictly from the candidate's CV and target role. Do not invent credentials, job titles, skills, or achievements that are not present in the provided data.

Output using the submit_linkedin_sync tool. Do not output anything else.`,
    userPromptTemplate: `Build an optimised LinkedIn profile for the following candidate.

{{SHARED_CONTEXT}}

Provide:
1. Three headline variants with different positioning angles
2. A complete About section written from scratch based on the CV and target role
3. A complete, ranked recommended skills list that merges CV skills with target-role gap skills (deduplicated, ranked by recruiter-search relevance, max 50, each flagged isNew: true if newly suggested or isNew: false if already on the CV)
4. Recommendations for completing other profile sections (featured, certifications, URL, banner, etc.)
5. Recruiter search queries this profile should rank for`,
    outputSchema: {
      name: 'submit_linkedin_sync',
      description:
        'Submit LinkedIn profile content generated from CV and job description',
      input_schema: {
        type: 'object',
        required: [
          'headlineVariants',
          'aboutRewrite',
          'additionalRecommendations',
          'targetSearchQueries',
        ],
        properties: {
          headlineVariants: {
            type: 'array',
            minItems: 3,
            maxItems: 3,
            items: {
              type: 'object',
              required: ['angle', 'text', 'characterCount', 'keywordsTargeted'],
              properties: {
                angle: {
                  type: 'string',
                  enum: [
                    'title_specialty_value',
                    'outcome_focused',
                    'story_focused',
                  ],
                },
                text: { type: 'string' },
                characterCount: { type: 'integer', maximum: 220 },
                keywordsTargeted: { type: 'array', items: { type: 'string' } },
                rationale: { type: 'string' },
              },
            },
          },
          recommendedHeadline: {
            type: 'string',
            enum: ['title_specialty_value', 'outcome_focused', 'story_focused'],
          },
          aboutRewrite: {
            type: 'object',
            required: ['fullText', 'characterCount', 'preview', 'structure'],
            properties: {
              fullText: {
                type: 'string',
                description: 'The complete About section',
              },
              characterCount: { type: 'integer', maximum: 2600 },
              preview: {
                type: 'string',
                description:
                  "The first ~210 characters that show before 'see more'",
              },
              structure: {
                type: 'object',
                required: ['hook', 'story', 'achievements', 'cta'],
                properties: {
                  hook: { type: 'string' },
                  story: { type: 'string' },
                  achievements: { type: 'array', items: { type: 'string' } },
                  cta: { type: 'string' },
                },
              },
              keywordsIncorporated: {
                type: 'array',
                items: { type: 'string' },
              },
            },
          },
          additionalRecommendations: {
            type: 'array',
            items: {
              type: 'object',
              required: ['section', 'recommendation', 'priority'],
              properties: {
                section: {
                  type: 'string',
                  enum: [
                    'skills',
                    'featured',
                    'experience',
                    'education',
                    'certifications',
                    'url',
                    'photo',
                    'banner',
                    'recommendations',
                    'activity',
                  ],
                },
                recommendation: { type: 'string' },
                priority: { type: 'string', enum: ['high', 'medium', 'low'] },
              },
            },
          },
          recommendedSkills: {
            type: 'array',
            maxItems: 50,
            items: {
              type: 'object',
              required: ['name', 'isNew'],
              properties: {
                name: { type: 'string' },
                isNew: { type: 'boolean' },
              },
            },
          },
          targetSearchQueries: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
] as const;

async function main() {
  for (const seed of seeds) {
    await prisma.promptVersion.upsert({
      where: {
        promptType_version: {
          promptType: seed.promptType,
          version: seed.version,
        },
      },
      update: {
        isActive: seed.isActive,
        modelPreference: seed.modelPreference,
        maxTokens: seed.maxTokens,
        systemPrompt: seed.systemPrompt,
        userPromptTemplate: seed.userPromptTemplate,
        outputSchema: seed.outputSchema,
      },
      create: seed,
    });
    console.log(`Upserted: ${seed.promptType} v${seed.version}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
