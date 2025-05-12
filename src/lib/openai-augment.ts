import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface AugmentationContext {
  hubspotNotes?: Array<{ body: string; timestamp: string }>;
  linkedinData?: {
    name: string;
    title: string;
    company: string;
    summary: string;
    experience: Array<{
      title: string;
      company: string;
      duration: string;
      description?: string;
    }>;
  };
}

export async function augmentAnswerWithAI(
  originalAnswer: string,
  context: AugmentationContext
): Promise<{ augmentedAnswer: string; context: AugmentationContext }> {
  try {
    const prompt = `Given the following answer and context, provide an enhanced version that incorporates relevant information from the context:

Original Answer: "${originalAnswer}"

Context:
${formatContextForPrompt(context)}

Please provide an enhanced version of the answer that incorporates relevant information from the context. If there's no relevant context, return the original answer.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content: "You are an AI assistant that enhances answers by incorporating relevant context from HubSpot notes and LinkedIn data. Your goal is to provide more comprehensive and insightful answers while maintaining the original meaning."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500
    });

    const augmentedAnswer = completion.choices[0]?.message?.content || originalAnswer;

    return {
      augmentedAnswer,
      context
    };
  } catch (error) {
    console.error('Error augmenting answer with AI:', error);
    return {
      augmentedAnswer: originalAnswer,
      context
    };
  }
}

function formatContextForPrompt(context: AugmentationContext): string {
  let formattedContext = '';

  if (context.hubspotNotes?.length) {
    formattedContext += 'HubSpot Notes:\n';
    context.hubspotNotes.forEach(note => {
      formattedContext += `- [${new Date(note.timestamp).toLocaleDateString()}] ${note.body}\n`;
    });
  }

  if (context.linkedinData) {
    formattedContext += '\nLinkedIn Profile:\n';
    formattedContext += `Name: ${context.linkedinData.name}\n`;
    formattedContext += `Title: ${context.linkedinData.title}\n`;
    formattedContext += `Company: ${context.linkedinData.company}\n`;
    formattedContext += `Summary: ${context.linkedinData.summary}\n`;
    
    if (context.linkedinData.experience?.length) {
      formattedContext += '\nExperience:\n';
      context.linkedinData.experience.forEach(exp => {
        formattedContext += `- ${exp.title} at ${exp.company} (${exp.duration})\n`;
        if (exp.description) {
          formattedContext += `  ${exp.description}\n`;
        }
      });
    }
  }

  return formattedContext;
} 