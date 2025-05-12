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
  notes?: Array<{
    body: string;
    timestamp: string;
  }>;
  deals?: Array<{
    name: string;
    amount: string;
    stage: string;
  }>;
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
    description?: string;
  }>;
  skills?: string[];
  education?: Array<{
    school: string;
    degree_name?: string;
    field_of_study?: string;
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
    const { properties, notes, deals } = context.hubspotContact;
    
    // Add basic properties
    Object.entries(properties).forEach(([key, value]) => {
      if (value && key !== 'email') {
        enrichedAnswers[`HubSpot ${key}`] = value;
      }
    });

    // Add relevant notes as context
    if (notes && notes.length > 0) {
      const relevantNotes = notes
        .filter(note => note.body && note.timestamp)
        .map(note => ({
          content: note.body,
          date: new Date(note.timestamp).toLocaleDateString()
        }));

      if (relevantNotes.length > 0) {
        enrichedAnswers['HubSpot Notes'] = relevantNotes
          .map(note => `[${note.date}] ${note.content}`)
          .join('\n');
      }
    }

    // Add deal information if available
    if (deals && deals.length > 0) {
      const activeDeals = deals
        .filter(deal => deal.name && deal.stage)
        .map(deal => ({
          name: deal.name,
          amount: deal.amount || 'Not specified',
          stage: deal.stage
        }));

      if (activeDeals.length > 0) {
        enrichedAnswers['HubSpot Deals'] = activeDeals
          .map(deal => `${deal.name} (${deal.amount}) - ${deal.stage}`)
          .join('\n');
      }
    }
  }

  // Add context from LinkedIn if available
  if (context.linkedinData) {
    const { name, title, company, location, summary, experience, skills, education } = context.linkedinData;
    
    // Basic profile information
    enrichedAnswers['LinkedIn Name'] = name;
    enrichedAnswers['LinkedIn Title'] = title;
    enrichedAnswers['LinkedIn Company'] = company;
    enrichedAnswers['LinkedIn Location'] = location;
    enrichedAnswers['LinkedIn Summary'] = summary;

    // Detailed experience
    if (experience && experience.length > 0) {
      enrichedAnswers['LinkedIn Experience'] = experience
        .map(exp => {
          const description = exp.description ? `\n${exp.description}` : '';
          return `${exp.title} at ${exp.company} (${exp.duration})${description}`;
        })
        .join('\n\n');
    }

    // Skills
    if (skills && skills.length > 0) {
      enrichedAnswers['LinkedIn Skills'] = skills.join(', ');
    }

    // Education
    if (education && education.length > 0) {
      enrichedAnswers['LinkedIn Education'] = education
        .map(edu => {
          const degree = edu.degree_name ? ` in ${edu.degree_name}` : '';
          const field = edu.field_of_study ? ` (${edu.field_of_study})` : '';
          return `${edu.school}${degree}${field} - ${edu.duration}`;
        })
        .join('\n');
    }
  }

  return enrichedAnswers;
} 