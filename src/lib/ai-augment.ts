interface HubspotContact {
  id: string;
  properties: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
    linkedin_url?: string;
  };
}

interface LinkedInData {
  name: string;
  title: string;
  company: string;
  location: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
  }>;
}

interface AugmentContext {
  hubspotContact: HubspotContact | null;
  linkedinData: LinkedInData | null;
}

export async function augmentAnswers(
  answers: Record<string, string>,
  context: AugmentContext
): Promise<Record<string, string>> {
  const enrichedAnswers = { ...answers };

  // Add context from HubSpot if available
  if (context.hubspotContact) {
    const { properties } = context.hubspotContact;
    Object.entries(properties).forEach(([key, value]) => {
      if (value && key !== 'email') {
        enrichedAnswers[`HubSpot ${key}`] = value;
      }
    });
  }

  // Add context from LinkedIn if available
  if (context.linkedinData) {
    const { name, title, company, location, summary, experience } = context.linkedinData;
    enrichedAnswers['LinkedIn Name'] = name;
    enrichedAnswers['LinkedIn Title'] = title;
    enrichedAnswers['LinkedIn Company'] = company;
    enrichedAnswers['LinkedIn Location'] = location;
    enrichedAnswers['LinkedIn Summary'] = summary;
    enrichedAnswers['LinkedIn Experience'] = experience
      .map(exp => `${exp.title} at ${exp.company} (${exp.duration})`)
      .join('\n');
  }

  return enrichedAnswers;
} 