import { Router } from "express";
import OpenAI from "openai";

const router = Router();

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

// Context-aware help content generation
router.post("/generate", async (req, res) => {
  try {
    const { context } = req.body;

    if (!context || !context.page) {
      return res.status(400).json({ error: "Context with page is required" });
    }

    const helpContent = await generateContextualHelp(context);
    res.json(helpContent);
  } catch (error) {
    console.error("Error generating AI help:", error);
    res.status(500).json({ error: "Failed to generate help content" });
  }
});

async function generateContextualHelp(context: any) {
  const { page, section, userAction, data } = context;

  // Build context-aware prompt
  const systemPrompt = `Vous êtes un assistant expert en gestion de cycle de vie des contrats (CLM). 
Votre rôle est de fournir une aide contextuelle précise et utile aux utilisateurs d'une application CLM française.

Règles importantes :
- Répondez UNIQUEMENT en français
- Soyez concis mais informatif (maximum 150 mots pour le contenu principal)
- Adaptez votre réponse au contexte spécifique fourni
- Fournissez des conseils pratiques et actionnables
- Utilisez un ton professionnel mais accessible
- Évitez le jargon technique inutile

Structure de réponse attendue (JSON) :
{
  "title": "Titre court et descriptif",
  "content": "Explication principale adaptée au contexte",
  "tips": ["Conseil 1", "Conseil 2"],
  "relatedActions": [
    {"label": "Action 1", "description": "Description courte"},
    {"label": "Action 2", "description": "Description courte"}
  ]
}`;

  const userPrompt = buildUserPrompt(page, section, userAction, data);

  const response = await openai.chat.completions.create({
    model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: { type: "json_object" },
    temperature: 0.7,
    max_tokens: 800,
  });

  const content = response.choices[0].message.content;
  if (!content) {
    throw new Error("No response from OpenAI");
  }

  return JSON.parse(content);
}

function buildUserPrompt(
  page: string,
  section: string,
  userAction?: string,
  data?: any
): string {
  let prompt = `L'utilisateur est actuellement sur la page "${page}"`;

  if (section && section !== "main") {
    prompt += ` dans la section "${section}"`;
  }

  if (userAction) {
    prompt += ` et ${userAction}`;
  }

  // Add page-specific context
  switch (page) {
    case "dashboard":
      prompt += `. Cette page affiche les KPI et métriques principales du CLM. L'utilisateur peut voir les contrats en attente, les échéances à venir, et les validations requises.`;
      break;
    case "contracts":
      prompt += `. Cette page permet de gérer le cycle de vie des contrats : création, validation, modification, et suivi. L'utilisateur peut filtrer, rechercher et consulter les détails des contrats.`;
      break;
    case "validation":
      prompt += `. Cette page présente les demandes de validation en attente (contrats, avenants, résiliations, indexations). L'utilisateur peut approuver ou rejeter ces demandes avec commentaires.`;
      break;
    case "indexations":
      prompt += `. Cette page gère les indexations automatiques et manuelles des contrats selon les indices économiques. L'utilisateur peut calculer, valider et suivre les indexations.`;
      break;
    case "amendments":
      prompt += `. Cette page permet de créer et gérer les avenants aux contrats existants. L'utilisateur peut modifier les termes, montants, et dates des contrats.`;
      break;
    case "terminations":
      prompt += `. Cette page gère les résiliations de contrats avec calcul automatique des indemnités et pénalités. L'utilisateur peut initier et suivre les procédures de résiliation.`;
      break;
    case "deadlines":
      prompt += `. Cette page affiche toutes les échéances contractuelles : fins de contrat, renouvellements, indexations. L'utilisateur peut planifier et suivre les actions nécessaires.`;
      break;
    case "documents":
      prompt += `. Cette page est la GED (Gestion Électronique de Documents) permettant de stocker, organiser et retrouver tous les documents contractuels.`;
      break;
    default:
      prompt += `. Cette section de l'application CLM permet de gérer différents aspects des contrats.`;
  }

  if (data) {
    prompt += ` Données contextuelles disponibles : ${JSON.stringify(
      data,
      null,
      2
    )}`;
  }

  prompt += `\n\nFournissez une aide contextuelle adaptée à cette situation spécifique.`;

  return prompt;
}

export default router;
