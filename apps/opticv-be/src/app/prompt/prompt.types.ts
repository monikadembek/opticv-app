export type SharedPromptVariables = {
  resumeText: string;
  parsedSectionsJson: string;
  jobDescription: string;
  targetRole: string;
  seniority: string;
  industry: string;
  yearsExperience: string;
};

export type CoverLetterExtraVars = {
  hiringManagerName?: string;
  companyContext?: string;
  tonePreference?: string;
};

export type InterviewPrepExtraVars = {
  interviewRound?: string;
  interviewerType?: string;
};

export type LinkedInExtraVars = {
  linkedinHeadline?: string;
  linkedinAbout?: string;
  linkedinCurrentRole?: string;
  linkedinExperience?: string;
  linkedinSkills?: string;
};

export type PromptVariables = SharedPromptVariables &
  Partial<CoverLetterExtraVars> &
  Partial<InterviewPrepExtraVars> &
  Partial<LinkedInExtraVars>;
