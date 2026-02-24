const OpenAI = require("openai");

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT_FR = `Tu es un expert en analyse ATS (Applicant Tracking System) specialise dans le marche de l'emploi francais.
Tu analyses la compatibilite entre un CV et une offre d'emploi pour aider les candidats a optimiser leur CV.
IMPORTANT: Les ATS rejettent automatiquement ~75% des candidatures. Ton role est d'aider les candidats a passer ces filtres.
Reponds UNIQUEMENT avec un objet JSON valide, sans texte avant ou apres.`;

const SYSTEM_PROMPT_EN = `You are an expert ATS (Applicant Tracking System) analyzer specialized in resume optimization.
You analyze the compatibility between a resume and a job description to help candidates improve their chances.
IMPORTANT: ATS systems automatically reject ~75% of applications. Your role is to help candidates pass these filters.
Respond ONLY with a valid JSON object, no text before or after.`;

const USER_PROMPT_FR = (cv, job) => `Analyse ce CV par rapport a cette offre d'emploi.

CV DU CANDIDAT:
${cv}

OFFRE D'EMPLOI:
${job}

Retourne un JSON avec cette structure exacte:
{
  "ats_score": <entier 0-100, score de correspondance global>,
  "matching_keywords": [<liste des mots-cles importants presents dans le CV ET l'offre>],
  "missing_keywords": [<liste des mots-cles importants de l'offre ABSENTS du CV>],
  "strengths": [<points forts du candidat pour ce poste specifique, 3-5 items>],
  "improvements": [<ameliorations concretes et actionnables, 3-5 items>],
  "suggestions": [
    {
      "section": "<une valeur parmi: titre, experience, competences, formation, resume>",
      "issue": "<probleme identifie dans cette section>",
      "suggestion": "<réécriture ou amelioration concrete et detaillee>"
    }
  ],
  "summary": "<evaluation globale concise en 2-3 phrases>"
}`;

const USER_PROMPT_EN = (cv, job) => `Analyze this resume against the job description.

CANDIDATE RESUME:
${cv}

JOB DESCRIPTION:
${job}

Return a JSON with this exact structure:
{
  "ats_score": <integer 0-100, overall match score>,
  "matching_keywords": [<important keywords present in BOTH resume and job>],
  "missing_keywords": [<important job keywords MISSING from resume>],
  "strengths": [<candidate strengths for this specific position, 3-5 items>],
  "improvements": [<concrete and actionable improvements, 3-5 items>],
  "suggestions": [
    {
      "section": "<one of: title, experience, skills, education, summary>",
      "issue": "<identified issue in this section>",
      "suggestion": "<concrete and detailed rewrite or improvement>"
    }
  ],
  "summary": "<concise overall assessment in 2-3 sentences>"
}`;

async function analyzeCV(cvText, jobDescription, language) {
  const isFr = language === "fr";
  const systemPrompt = isFr ? SYSTEM_PROMPT_FR : SYSTEM_PROMPT_EN;
  const userPrompt = isFr
    ? USER_PROMPT_FR(cvText, jobDescription)
    : USER_PROMPT_EN(cvText, jobDescription);

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    response_format: { type: "json_object" },
    temperature: 0.2,
    max_tokens: 2000
  });

  const result = JSON.parse(completion.choices[0].message.content);
  const tokensUsed = completion.usage.total_tokens;

  if (typeof result.ats_score !== "number") {
    throw new Error("Invalid AI response format. Please try again.");
  }

  return { result, tokensUsed };
}

module.exports = { analyzeCV };
