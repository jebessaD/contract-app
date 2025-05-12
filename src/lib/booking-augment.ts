import OpenAI from "openai";
import { searchHubspotContact } from "./hubspot";
import { linkedInService } from "./linkedin";

if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_ORG_ID) {
  throw new Error("Missing required OpenAI environment variables");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  organization: process.env.OPENAI_ORG_ID,
});

interface AugmentedAnswer {
  question: string;
  originalAnswer: string;
  augmentedAnswer: string;
  context: {
    hubspot: {
      notes: any[];
      deals: any[];
    } | null;
    linkedin: {
      experiences: any[];
      education: any[];
      skills: any[];
    } | null;
  };
}

function createFallbackAugmentedAnswer(qa: { question: string; answer: string }, context: any): AugmentedAnswer {
  // Create a simple augmented answer using the context data
  let contextSummary = "";
  
  if (context.hubspot?.notes?.length) {
    contextSummary += `\nRelevant notes: ${context.hubspot.notes.map((n: { body: string }) => n.body).join(", ")}`;
  }
  if (context.hubspot?.deals?.length) {
    contextSummary += `\nActive deals: ${context.hubspot.deals.map((d: { name: string }) => d.name).join(", ")}`;
  }
  if (context.linkedin?.experiences?.length) {
    contextSummary += `\nProfessional experience: ${context.linkedin.experiences.map((e: { title: string }) => e.title).join(", ")}`;
  }

  return {
    question: qa.question,
    originalAnswer: qa.answer,
    augmentedAnswer: `${qa.answer}${contextSummary}`,
    context
  };
}

export async function augmentBookingAnswers(
  answers: Array<{ question: string; answer: string; required: boolean }>,
  email: string,
  linkedinUrl: string,
  hubspotAccessToken?: string
): Promise<AugmentedAnswer[]> {
  // Get Hubspot context
  let hubspotContext = null;
  if (hubspotAccessToken) {
    hubspotContext = await searchHubspotContact(email, hubspotAccessToken);
  }

  // Get LinkedIn context
  let linkedinContext = null;
  try {
    linkedinContext = await linkedInService.getEmployeeProfile(linkedinUrl);
  } catch (error) {
    console.error("Error fetching LinkedIn profile:", error);
  }

  // Augment answers using OpenAI
  return Promise.all(
    answers.map(async (qa) => {
      const context = {
        hubspot: hubspotContext ? {
          notes: hubspotContext.notes || [],
          deals: hubspotContext.deals || [],
        } : null,
        linkedin: linkedinContext ? {
          experiences: linkedinContext.experiences || [],
          education: linkedinContext.education || [],
          skills: linkedinContext.skills || [],
        } : null,
      };

      try {
        const prompt = `Given the following question and answer, along with context from Hubspot and LinkedIn, provide an one line augmented version of the answer that includes relevant context.

Question: ${qa.question}
Answer: ${qa.answer}

Context from Hubspot:
${JSON.stringify(context.hubspot, null, 2)}

Context from LinkedIn:
${JSON.stringify(context.linkedin, null, 2)}

Please provide an augmented version of the answer that includes relevant context from the above sources. Format it as:
Original Answer: [original answer]
Context: [relevant context from Hubspot/LinkedIn]
Augmented Answer: [combined answer with context]`;

        const completion = await openai.chat.completions.create({
          messages: [{ role: "user", content: prompt }],
          model: "gpt-3.5-turbo",
          temperature: 0.7,
        });

        const augmentedAnswer = completion.choices[0]?.message?.content || qa.answer;

        return {
          question: qa.question,
          originalAnswer: qa.answer,
          augmentedAnswer,
          context,
        };
      } catch (error) {
        console.error("Error in OpenAI augmentation:", error);
        // If we hit quota limits or other API errors, use fallback
        return createFallbackAugmentedAnswer(qa, context);
      }
    })
  );
} 