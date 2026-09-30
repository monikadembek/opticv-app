export const TIER_LIMITS = {
    FREE: {
        features: {
            CV_OPTIMIZATION: 1,
            COVER_LETTER: 1,
            INTERVIEW_PREP: 1,
            LINKEDIN: 0,
        },
        maxStoredCvs: 2,
        allowedTemplates: ['default', 'classic'],
    },
    BASIC: {
        features: {
            CV_OPTIMIZATION: 10,
            COVER_LETTER: 10,
            INTERVIEW_PREP: 10,
            LINKEDIN: 10,
        },
        maxStoredCvs: 10,
        allowedTemplates: 'ALL',
    },
    PRO: {
        features: {
            CV_OPTIMIZATION: 30,
            COVER_LETTER: 30,
            INTERVIEW_PREP: 30,
            LINKEDIN: 30,
        },
        maxStoredCvs: 20,
        allowedTemplates: 'ALL',
    },
};
export function getEffectiveTier(tier, status) {
    return status === 'ACTIVE' || status === 'TRIALING' ? tier : 'FREE';
}
export var PromptType;
(function (PromptType) {
    PromptType["RESUME_AUTOPSY"] = "RESUME_AUTOPSY";
    PromptType["KEYWORD_GAP"] = "KEYWORD_GAP";
    PromptType["SUMMARY_REWRITE"] = "SUMMARY_REWRITE";
    PromptType["BULLET_UPGRADE"] = "BULLET_UPGRADE";
    PromptType["COVER_LETTER"] = "COVER_LETTER";
    PromptType["INTERVIEW_PREP"] = "INTERVIEW_PREP";
    PromptType["LINKEDIN_REWRITE"] = "LINKEDIN_REWRITE";
})(PromptType || (PromptType = {}));
