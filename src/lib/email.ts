import { Resend } from "resend";
import { linkedInService } from './linkedin';

const resend = new Resend(process.env.RESEND_API_KEY);

interface BookingDetails {
  startTime: Date;
  endTime: Date;
  meetingLength: number;
  hostName: string;
  hostEmail: string;
}

interface Note {
  body: string;
  timestamp: string;
}

interface Deal {
  name: string;
  amount: string;
  stage: string;
}

interface BookingAnswers {
  question: string;
  answer: string;
  required: boolean;
}

interface EnrichedAnswers {
  [key: string]: string | Note[] | Deal[] | BookingAnswers[] | LinkedInData | null | undefined;
  notes?: Note[];
  deals?: Deal[];
  originalAnswers?: BookingAnswers[];
  linkedinData?: LinkedInData | null;
  linkedinUrl?: string;
  augmentedAnswers?: string;
}

export interface LinkedInData {
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
  skills: string[];
  education: Array<{
    school: string;
    degree_name?: string;
    field_of_study?: string;
    duration?: string;
  }>;
}

interface EmailParams {
  to: string;
  bookingDetails: BookingDetails;
  enrichedAnswers: EnrichedAnswers & {
    linkedinData?: LinkedInData | null;
  };
}

interface EmailResponse {
  id?: string;
  from: string;
  to: string;
  subject: string;
  error?: string;
}

interface EmailTemplateData {
  [key: string]: string | number | boolean | object | undefined;
}

interface AdvisorNotificationParams {
  attendeeEmail: string;
  advisorEmail: string;
  scheduledTime: Date;
  bookingId: string;
  linkedinData: LinkedInData | null;
  enrichedAnswers?: EnrichedAnswers;
  attendeeName: string;
  hostName: string;
  bookingDetails: {
    startTime: Date;
    endTime: Date;
    meetingLength: number;
    hostName: string;
    hostEmail: string;
    attendeeEmail: string;
  };
}

export async function sendConfirmationEmail(params: EmailParams): Promise<EmailResponse> {
  try {
    console.log('[Email Debug] Starting sendConfirmationEmail with params:', {
      to: params.to,
      hasEnrichedAnswers: !!params.enrichedAnswers,
      enrichedAnswersKeys: params.enrichedAnswers ? Object.keys(params.enrichedAnswers) : [],
      hasAugmentedAnswers: !!params.enrichedAnswers?.augmentedAnswers,
      augmentedAnswersType: params.enrichedAnswers?.augmentedAnswers ? typeof params.enrichedAnswers.augmentedAnswers : 'undefined'
    });

    const { data, error } = await resend.emails.send({
      from: "Scheduling <scheduling@updates.alberttutorial.com>",
      to: params.to,
      subject: `Meeting Confirmation: ${params.bookingDetails.hostName}`,
      html: `
        <h1>Meeting Confirmation</h1>
        <p>Your meeting has been scheduled with ${params.bookingDetails.hostName}.</p>
        
        <h2>Meeting Details:</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            <li style="margin-bottom: 10px;"><strong>Date:</strong> ${params.bookingDetails.startTime.toLocaleDateString()}</li>
            <li style="margin-bottom: 10px;"><strong>Time:</strong> ${params.bookingDetails.startTime.toLocaleTimeString()} - ${params.bookingDetails.endTime.toLocaleTimeString()}</li>
            <li style="margin-bottom: 10px;"><strong>Duration:</strong> ${params.bookingDetails.meetingLength} minutes</li>
          </ul>
        </div>

        <h2>Augmented Analysis:</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${params.enrichedAnswers?.augmentedAnswers ? `
            ${(() => {
              try {
                console.log('[Email Debug] Starting augmented answers processing');
                console.log('[Email Debug] Raw enrichedAnswers:', {
                  hasAugmentedAnswers: !!params.enrichedAnswers?.augmentedAnswers,
                  type: typeof params.enrichedAnswers?.augmentedAnswers,
                  value: params.enrichedAnswers?.augmentedAnswers
                });

                // Handle both string and object formats
                const augmentedData = typeof params.enrichedAnswers.augmentedAnswers === 'string' 
                  ? JSON.parse(params.enrichedAnswers.augmentedAnswers)
                  : params.enrichedAnswers.augmentedAnswers;

                console.log('[Email Debug] Parsed augmentedData:', {
                  type: typeof augmentedData,
                  isArray: Array.isArray(augmentedData),
                  keys: Object.keys(augmentedData),
                  value: augmentedData
                });

                // Handle array format from database
                if (Array.isArray(augmentedData)) {
                  console.log('[Email Debug] Processing array format:', {
                    length: augmentedData.length,
                    firstItem: augmentedData[0]
                  });
                  return augmentedData.map(item => {
                    // Parse the answer string into components
                    const parts = item.answer.split('\n\n');
                    console.log('[Email Debug] Array item parts:', {
                      question: item.question,
                      parts: parts,
                      originalAnswer: parts[0],
                      context: parts[1],
                      augmentedAnswer: parts[2]
                    });
                    
                    const originalAnswer = parts[0].replace('Original Answer: ', '');
                    const context = parts[1].replace('Context: ', '');
                    const augmentedAnswer = parts[2].replace('Augmented Answer: ', '');
                    
                    return `
                      <div style="margin-bottom: 20px;">
                        <h3 style="color: #4a5568; margin-bottom: 10px;">${item.question}</h3>
                        <div style="margin-bottom: 10px;">
                          <strong>Original Answer:</strong>
                          <div style="margin: 5px 0;">${originalAnswer}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                          <strong>Context:</strong>
                          <div style="margin: 5px 0;">${context}</div>
                        </div>
                        <div>
                          <strong>Augmented Answer:</strong>
                          <div style="margin: 5px 0;">${augmentedAnswer}</div>
                        </div>
                      </div>
                    `;
                  }).join('');
                }
                
                // Handle AugmentedAnswersDetails format
                if (augmentedData.originalAnswer && augmentedData.augmentedAnswer) {
                  console.log('[Email Debug] Processing AugmentedAnswersDetails format:', {
                    hasOriginalAnswer: true,
                    hasAugmentedAnswer: true,
                    originalAnswerType: typeof augmentedData.originalAnswer,
                    augmentedAnswerType: typeof augmentedData.augmentedAnswer
                  });

                  try {
                    const originalAnswers = JSON.parse(augmentedData.originalAnswer);
                    const augmentedAnswers = JSON.parse(augmentedData.augmentedAnswer);
                    
                    console.log('[Email Debug] Parsed answers:', {
                      originalAnswersLength: originalAnswers.length,
                      augmentedAnswersLength: augmentedAnswers.length,
                      firstOriginalAnswer: originalAnswers[0],
                      firstAugmentedAnswer: augmentedAnswers[0]
                    });
                    
                    return augmentedAnswers.map((item: any) => {
                      const originalAnswer = originalAnswers.find((oa: any) => oa.question === item.question)?.answer || '';
                      const parts = item.answer.split('\n\n');
                      console.log('[Email Debug] Processing item:', {
                        question: item.question,
                        originalAnswer,
                        parts,
                        context: parts[1],
                        augmentedAnswer: parts[2] || item.answer
                      });
                      
                      // Parse the context JSON
                      let contextText = '';
                      try {
                        const contextObj = JSON.parse(parts[1].replace('Context: ', ''));
                        if (contextObj.hubspot?.notes?.length) {
                          contextText = contextObj.hubspot.notes
                            .map((note: any) => note.body.replace(/<[^>]*>/g, '').trim())
                            .join('. ');
                        }
                      } catch (e) {
                        console.error('[Email Debug] Error parsing context:', e);
                        contextText = parts[1].replace('Context: ', '');
                      }
                      
                      // Get the final augmented answer
                      const augmentedAnswer = parts[2]?.replace('Augmented Answer: ', '') || 
                        item.answer.split('Augmented Answer: ')[1] || 
                        item.answer;
                      
                      return `
                        <div style="margin-bottom: 20px;">
                          <h3 style="color: #4a5568; margin-bottom: 10px;">${item.question}</h3>
                          <div style="margin-bottom: 10px;">
                            <strong>Original Answer:</strong>
                            <div style="margin: 5px 0;">${originalAnswer}</div>
                          </div>
                          <div style="margin-bottom: 10px;">
                            <strong>Context:</strong>
                            <div style="margin: 5px 0;">${contextText}</div>
                          </div>
                          <div>
                            <strong>Augmented Answer:</strong>
                            <div style="margin: 5px 0;">${augmentedAnswer}</div>
                          </div>
                        </div>
                      `;
                    }).join('');
                  } catch (parseError) {
                    console.error('[Email Debug] Error parsing answers:', {
                      error: parseError,
                      originalAnswer: augmentedData.originalAnswer,
                      augmentedAnswer: augmentedData.augmentedAnswer
                    });
                    throw parseError;
                  }
                }

                console.error('[Email Debug] Unexpected augmented answers format:', augmentedData);
                return '<p>Invalid augmented answers format</p>';
              } catch (error) {
                console.error('[Email Debug] Error in augmented answers processing:', {
                  error: error instanceof Error ? error.message : 'Unknown error',
                  stack: error instanceof Error ? error.stack : undefined,
                  enrichedAnswers: params.enrichedAnswers
                });
                return '<p>Error displaying augmented analysis</p>';
              }
            })()}
          ` : '<p>No augmented analysis available</p>'}
        </div>

        <h2>Your Responses:</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${params.enrichedAnswers.originalAnswers ? `
            <ul style="list-style-type: none; padding-left: 0; margin: 0;">
              ${(params.enrichedAnswers.originalAnswers as BookingAnswers[]).map(qa => `
                <li style="margin-bottom: 15px;">
                  <strong>${qa.question}:</strong>
                  <div style="margin: 5px 0;">${qa.answer}</div>
                </li>
              `).join('')}
            </ul>
          ` : '<p>No responses provided</p>'}
        </div>

        <h2>Contact Context:</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${params.enrichedAnswers.linkedinData ? `
            <h3>LinkedIn Profile</h3>
            <ul style="list-style-type: none; padding-left: 0; margin: 0;">
              ${params.enrichedAnswers.linkedinData.title ? `
                <li style="margin-bottom: 10px;">
                  <strong>Title:</strong>
                  <div style="margin: 5px 0;">${params.enrichedAnswers.linkedinData.title}</div>
                </li>
              ` : ''}
              ${params.enrichedAnswers.linkedinData.company ? `
                <li style="margin-bottom: 10px;">
                  <strong>Company:</strong>
                  <div style="margin: 5px 0;">${params.enrichedAnswers.linkedinData.company}</div>
                </li>
              ` : ''}
              ${params.enrichedAnswers.linkedinData.location ? `
                <li style="margin-bottom: 10px;">
                  <strong>Location:</strong>
                  <div style="margin: 5px 0;">${params.enrichedAnswers.linkedinData.location}</div>
                </li>
              ` : ''}
              ${params.enrichedAnswers.linkedinData.summary ? `
                <li style="margin-bottom: 10px;">
                  <strong>Summary:</strong>
                  <div style="margin: 5px 0;">${params.enrichedAnswers.linkedinData.summary}</div>
                </li>
              ` : ''}
            </ul>
          ` : ''}

          <h3>Contact Details</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${Object.entries(params.enrichedAnswers)
              .filter(([key, value]) => 
                key.startsWith('HubSpot') && 
                value !== undefined && 
                value !== null &&
                typeof value === 'string')
              .map(([key, value]) => `
                <li style="margin-bottom: 10px;">
                  <strong>${key.replace('HubSpot', '')}:</strong>
                  <div style="margin: 5px 0;">${value}</div>
                </li>
              `).join('')}
          </ul>
          
          <h3>Recent Notes</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${params.enrichedAnswers.notes && params.enrichedAnswers.notes.length > 0 ? 
              params.enrichedAnswers.notes.map(note => `
                <li style="margin-bottom: 15px; border-left: 3px solid #dee2e6; padding-left: 10px;">
                  <strong>${new Date(note.timestamp).toLocaleString()}</strong>
                  <div style="margin: 5px 0; white-space: pre-wrap;">${note.body.replace(/<[^>]*>/g, '')}</div>
                </li>
              `).join('') : 
              '<li>No recent notes</li>'
            }
          </ul>

          <h3>Recent Deals</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${params.enrichedAnswers.deals && params.enrichedAnswers.deals.length > 0 ? 
              params.enrichedAnswers.deals.map(deal => `
                <li style="margin-bottom: 15px; border-left: 3px solid #dee2e6; padding-left: 10px;">
                  <strong>${deal.name}</strong>
                  <div style="margin: 5px 0;">Amount: ${deal.amount}</div>
                  <div style="margin: 5px 0;">Stage: ${deal.stage}</div>
                </li>
              `).join('') : 
              '<li>No recent deals</li>'
            }
          </ul>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send confirmation email:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No response received from email service');
    }

    return {
      id: data.id,
      from: "Scheduling <scheduling@updates.alberttutorial.com>",
      to: params.to,
      subject: `Meeting Confirmation: ${params.bookingDetails.hostName}`
    };
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
}

export async function sendAdvisorNotificationEmail(params: AdvisorNotificationParams): Promise<EmailResponse> {
  console.log('[Email Debug] Starting sendAdvisorNotificationEmail with params:', {
    attendeeEmail: params.attendeeEmail,
    advisorEmail: params.advisorEmail,
    hasEnrichedAnswers: !!params.enrichedAnswers,
    enrichedAnswersKeys: params.enrichedAnswers ? Object.keys(params.enrichedAnswers) : [],
    hasAugmentedAnswers: !!params.enrichedAnswers?.augmentedAnswers,
    augmentedAnswersType: params.enrichedAnswers?.augmentedAnswers ? typeof params.enrichedAnswers.augmentedAnswers : 'undefined',
    hasLinkedinData: !!params.linkedinData
  });

  try {
    let finalLinkedInData = params.linkedinData;
    const { attendeeName, hostName, bookingDetails } = params;

    // If no LinkedIn data is provided but we have an email, try to fetch it
    if (!finalLinkedInData && params.attendeeEmail) {
      console.log('[Email Debug] No LinkedIn data provided, attempting to fetch from LinkedIn...');
      
      // First try to get data from LinkedIn URL if available
      const linkedinUrl = params.enrichedAnswers?.linkedinUrl;
      if (linkedinUrl) {
        console.log('Found LinkedIn URL in enriched answers:', linkedinUrl);
        try {
          const profile = await linkedInService.getEmployeeProfile(linkedinUrl);
          console.log('Successfully fetched profile from LinkedIn URL:', {
            name: profile.full_name,
            title: profile.headline
          });
          
          finalLinkedInData = {
            name: profile.full_name,
            title: profile.headline || '',
            company: profile.experiences?.[0]?.company || '',
            location: profile.location || profile.city ? `${profile.city}, ${profile.country}` : '',
            summary: profile.summary || '',
            experience: profile.experiences?.map(exp => ({
              title: exp.title,
              company: exp.company,
              duration: `${exp.starts_at?.year || ''} - ${exp.ends_at?.year || 'Present'}`,
              description: exp.description || ''
            })) || [],
            skills: profile.skills?.map(skill => skill.name) || [],
            education: profile.education?.map(edu => ({
              school: edu.school,
              degree_name: edu.degree_name || '',
              field_of_study: edu.field_of_study || '',
              duration: `${edu.starts_at?.year || ''} - ${edu.ends_at?.year || 'Present'}`
            })) || []
          };
        } catch (error) {
          console.error('Failed to fetch profile from LinkedIn URL:', error);
          // Don't try domain-based search if we have a LinkedIn URL but failed to fetch
          // This prevents unnecessary API calls
          finalLinkedInData = null;
        }
      } else {
        // Only try domain-based search if we don't have a LinkedIn URL
        console.log('No LinkedIn URL provided, attempting domain-based search...');
        const domain = params.attendeeEmail.split('@')[1];
        if (domain && !domain.includes('gmail.com') && !domain.includes('yahoo.com') && !domain.includes('hotmail.com')) {
          try {
            const company = await linkedInService.findCompanyByDomain(domain);
            console.log('Found company by domain:', {
              name: company.name,
              website: company.website
            });

            if (company.linkedin_url) {
              const employees = await linkedInService.searchEmployeesByTitle(
                company.linkedin_url,
                'Software Engineer' // You might want to make this more dynamic
              );

              if (employees.length > 0) {
                const employee = employees[0];
                console.log('Found matching employee:', {
                  name: employee.full_name,
                  title: employee.headline
                });

                finalLinkedInData = {
                  name: employee.full_name,
                  title: employee.headline || '',
                  company: employee.experiences?.[0]?.company || '',
                  location: employee.location || employee.city ? `${employee.city}, ${employee.country}` : '',
                  summary: employee.summary || '',
                  experience: employee.experiences?.map(exp => ({
                    title: exp.title,
                    company: exp.company,
                    duration: `${exp.starts_at?.year || ''} - ${exp.ends_at?.year || 'Present'}`,
                    description: exp.description || ''
                  })) || [],
                  skills: employee.skills?.map(skill => skill.name) || [],
                  education: employee.education?.map(edu => ({
                    school: edu.school,
                    degree_name: edu.degree_name || '',
                    field_of_study: edu.field_of_study || '',
                    duration: `${edu.starts_at?.year || ''} - ${edu.ends_at?.year || 'Present'}`
                  })) || []
                };
              }
            }
          } catch (error) {
            console.error('Failed to fetch data using domain-based search:', error);
            finalLinkedInData = null;
          }
        } else {
          console.log('Skipping domain-based search for personal email domain');
          finalLinkedInData = null;
        }
      }
    }

    console.log('Final LinkedIn data being used:', finalLinkedInData);

    // Prepare the email content for advisor
    const advisorEmailContent = `
      <h1>Meeting Confirmation</h1>
      <p>Your meeting has been scheduled with ${attendeeName}.</p>
      
      <h2>Meeting Details:</h2>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <ul style="list-style-type: none; padding-left: 0; margin: 0;">
          <li style="margin-bottom: 10px;"><strong>Date:</strong> ${bookingDetails.startTime.toLocaleDateString()}</li>
          <li style="margin-bottom: 10px;"><strong>Time:</strong> ${bookingDetails.startTime.toLocaleTimeString()} - ${bookingDetails.endTime.toLocaleTimeString()}</li>
          <li style="margin-bottom: 10px;"><strong>Duration:</strong> ${bookingDetails.meetingLength} minutes</li>
          <li style="margin-bottom: 10px;"><strong>Attendee Email:</strong> ${params.attendeeEmail}</li>
        </ul>
      </div>

      <h2>Augmented Analysis:</h2>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
        ${params.enrichedAnswers?.augmentedAnswers ? `
          ${(() => {
            try {
              console.log('[Email Debug] Starting augmented answers processing');
              console.log('[Email Debug] Raw enrichedAnswers:', {
                hasAugmentedAnswers: !!params.enrichedAnswers?.augmentedAnswers,
                type: typeof params.enrichedAnswers?.augmentedAnswers,
                value: params.enrichedAnswers?.augmentedAnswers
              });

              // Handle both string and object formats
              const augmentedData = typeof params.enrichedAnswers.augmentedAnswers === 'string' 
                ? JSON.parse(params.enrichedAnswers.augmentedAnswers)
                : params.enrichedAnswers.augmentedAnswers;

              console.log('[Email Debug] Parsed augmentedData:', {
                type: typeof augmentedData,
                isArray: Array.isArray(augmentedData),
                keys: Object.keys(augmentedData),
                value: augmentedData
              });

              // Handle array format from database
              if (Array.isArray(augmentedData)) {
                console.log('[Email Debug] Processing array format:', {
                  length: augmentedData.length,
                  firstItem: augmentedData[0]
                });
                return augmentedData.map(item => {
                  // Parse the answer string into components
                  const parts = item.answer.split('\n\n');
                  console.log('[Email Debug] Array item parts:', {
                    question: item.question,
                    parts: parts,
                    originalAnswer: parts[0],
                    context: parts[1],
                    augmentedAnswer: parts[2]
                  });
                  
                  const originalAnswer = parts[0].replace('Original Answer: ', '');
                  const context = parts[1].replace('Context: ', '');
                  const augmentedAnswer = parts[2].replace('Augmented Answer: ', '');
                  
                  return `
                    <div style="margin-bottom: 20px;">
                      <h3 style="color: #4a5568; margin-bottom: 10px;">${item.question}</h3>
                      <div style="margin-bottom: 10px;">
                        <strong>Original Answer:</strong>
                        <div style="margin: 5px 0;">${originalAnswer}</div>
                      </div>
                      <div style="margin-bottom: 10px;">
                        <strong>Context:</strong>
                        <div style="margin: 5px 0;">${context}</div>
                      </div>
                      <div>
                        <strong>Augmented Answer:</strong>
                        <div style="margin: 5px 0;">${augmentedAnswer}</div>
                      </div>
                    </div>
                  `;
                }).join('');
              }
              
              // Handle AugmentedAnswersDetails format
              if (augmentedData.originalAnswer && augmentedData.augmentedAnswer) {
                console.log('[Email Debug] Processing AugmentedAnswersDetails format:', {
                  hasOriginalAnswer: true,
                  hasAugmentedAnswer: true,
                  originalAnswerType: typeof augmentedData.originalAnswer,
                  augmentedAnswerType: typeof augmentedData.augmentedAnswer
                });

                try {
                  const originalAnswers = JSON.parse(augmentedData.originalAnswer);
                  const augmentedAnswers = JSON.parse(augmentedData.augmentedAnswer);
                  
                  console.log('[Email Debug] Parsed answers:', {
                    originalAnswersLength: originalAnswers.length,
                    augmentedAnswersLength: augmentedAnswers.length,
                    firstOriginalAnswer: originalAnswers[0],
                    firstAugmentedAnswer: augmentedAnswers[0]
                  });
                  
                  return augmentedAnswers.map((item: any) => {
                    const originalAnswer = originalAnswers.find((oa: any) => oa.question === item.question)?.answer || '';
                    const parts = item.answer.split('\n\n');
                    console.log('[Email Debug] Processing item:', {
                      question: item.question,
                      originalAnswer,
                      parts,
                      context: parts[1],
                      augmentedAnswer: parts[2] || item.answer
                    });
                    
                    // Parse the context JSON
                    let contextText = '';
                    try {
                      const contextObj = JSON.parse(parts[1].replace('Context: ', ''));
                      if (contextObj.hubspot?.notes?.length) {
                        contextText = contextObj.hubspot.notes
                          .map((note: any) => note.body.replace(/<[^>]*>/g, '').trim())
                          .join('. ');
                      }
                    } catch (e) {
                      console.error('[Email Debug] Error parsing context:', e);
                      contextText = parts[1].replace('Context: ', '');
                    }
                    
                    // Get the final augmented answer
                    const augmentedAnswer = parts[2]?.replace('Augmented Answer: ', '') || 
                      item.answer.split('Augmented Answer: ')[1] || 
                      item.answer;
                    
                    return `
                      <div style="margin-bottom: 20px;">
                        <h3 style="color: #4a5568; margin-bottom: 10px;">${item.question}</h3>
                        <div style="margin-bottom: 10px;">
                          <strong>Original Answer:</strong>
                          <div style="margin: 5px 0;">${originalAnswer}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                          <strong>Context:</strong>
                          <div style="margin: 5px 0;">${contextText}</div>
                        </div>
                        <div>
                          <strong>Augmented Answer:</strong>
                          <div style="margin: 5px 0;">${augmentedAnswer}</div>
                        </div>
                      </div>
                    `;
                  }).join('');
                } catch (parseError) {
                  console.error('[Email Debug] Error parsing answers:', {
                    error: parseError,
                    originalAnswer: augmentedData.originalAnswer,
                    augmentedAnswer: augmentedData.augmentedAnswer
                  });
                  throw parseError;
                }
              }

              console.error('[Email Debug] Unexpected augmented answers format:', augmentedData);
              return '<p>Invalid augmented answers format</p>';
            } catch (error) {
              console.error('[Email Debug] Error in augmented answers processing:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                enrichedAnswers: params.enrichedAnswers
              });
              return '<p>Error displaying augmented analysis</p>';
            }
          })()}
        ` : '<p>No augmented analysis available</p>'}
      </div>

      <h2>Attendee Responses:</h2>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
        ${params.enrichedAnswers?.originalAnswers ? `
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${(params.enrichedAnswers.originalAnswers as BookingAnswers[]).map(qa => `
              <li style="margin-bottom: 15px;">
                <strong>${qa.question}:</strong>
                <div style="margin: 5px 0;">${qa.answer}</div>
              </li>
            `).join('')}
          </ul>
        ` : '<p>No responses provided</p>'}
      </div>

      <h2>Contact Context:</h2>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
        ${finalLinkedInData ? `
          <h3>LinkedIn Profile</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${finalLinkedInData.title ? `
              <li style="margin-bottom: 10px;">
                <strong>Title:</strong>
                <div style="margin: 5px 0;">${finalLinkedInData.title}</div>
              </li>
            ` : ''}
            ${finalLinkedInData.company ? `
              <li style="margin-bottom: 10px;">
                <strong>Company:</strong>
                <div style="margin: 5px 0;">${finalLinkedInData.company}</div>
              </li>
            ` : ''}
            ${finalLinkedInData.location ? `
              <li style="margin-bottom: 10px;">
                <strong>Location:</strong>
                <div style="margin: 5px 0;">${finalLinkedInData.location}</div>
              </li>
            ` : ''}
            ${finalLinkedInData.summary ? `
              <li style="margin-bottom: 10px;">
                <strong>Summary:</strong>
                <div style="margin: 5px 0;">${finalLinkedInData.summary}</div>
              </li>
            ` : ''}
          </ul>
        ` : ''}

        <h3>Contact Details</h3>
        <ul style="list-style-type: none; padding-left: 0; margin: 0;">
          ${Object.entries(params.enrichedAnswers || {})
            .filter(([key, value]) => 
              key.startsWith('HubSpot') && 
              value !== undefined && 
              value !== null &&
              typeof value === 'string')
            .map(([key, value]) => `
              <li style="margin-bottom: 10px;">
                <strong>${key.replace('HubSpot', '')}:</strong>
                <div style="margin: 5px 0;">${value}</div>
              </li>
            `).join('')}
        </ul>
        
        <h3>Recent Notes</h3>
        <ul style="list-style-type: none; padding-left: 0; margin: 0;">
          ${params.enrichedAnswers?.notes && params.enrichedAnswers.notes.length > 0 ? 
            params.enrichedAnswers.notes.map((note: Note) => `
              <li style="margin-bottom: 15px; border-left: 3px solid #dee2e6; padding-left: 10px;">
                <strong>${new Date(note.timestamp).toLocaleString()}</strong>
                <div style="margin: 5px 0; white-space: pre-wrap;">${note.body.replace(/<[^>]*>/g, '')}</div>
              </li>
            `).join('') : 
            '<li>No recent notes</li>'
          }
        </ul>

        <h3>Recent Deals</h3>
        <ul style="list-style-type: none; padding-left: 0; margin: 0;">
          ${params.enrichedAnswers?.deals && params.enrichedAnswers.deals.length > 0 ? 
            params.enrichedAnswers.deals.map((deal: Deal) => `
              <li style="margin-bottom: 15px; border-left: 3px solid #dee2e6; padding-left: 10px;">
                <strong>${deal.name}</strong>
                <div style="margin: 5px 0;">Amount: ${deal.amount}</div>
                <div style="margin: 5px 0;">Stage: ${deal.stage}</div>
              </li>
            `).join('') : 
            '<li>No recent deals</li>'
          }
        </ul>
      </div>
    `;

    // Prepare the email content for attendee
    const attendeeEmailContent = `
      <h1>Meeting Confirmation</h1>
      <p>Your meeting has been scheduled with ${hostName}.</p>
      
      <h2>Meeting Details:</h2>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
        <ul style="list-style-type: none; padding-left: 0; margin: 0;">
          <li style="margin-bottom: 10px;"><strong>Date:</strong> ${bookingDetails.startTime.toLocaleDateString()}</li>
          <li style="margin-bottom: 10px;"><strong>Time:</strong> ${bookingDetails.startTime.toLocaleTimeString()} - ${bookingDetails.endTime.toLocaleTimeString()}</li>
          <li style="margin-bottom: 10px;"><strong>Duration:</strong> ${bookingDetails.meetingLength} minutes</li>
          <li style="margin-bottom: 10px;"><strong>Host Email:</strong> ${params.advisorEmail}</li>
        </ul>
      </div>

      <h2>Augmented Analysis:</h2>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
        ${params.enrichedAnswers?.augmentedAnswers ? `
          ${(() => {
            try {
              console.log('[Email Debug] Starting augmented answers processing');
              console.log('[Email Debug] Raw enrichedAnswers:', {
                hasAugmentedAnswers: !!params.enrichedAnswers?.augmentedAnswers,
                type: typeof params.enrichedAnswers?.augmentedAnswers,
                value: params.enrichedAnswers?.augmentedAnswers
              });

              // Handle both string and object formats
              const augmentedData = typeof params.enrichedAnswers.augmentedAnswers === 'string' 
                ? JSON.parse(params.enrichedAnswers.augmentedAnswers)
                : params.enrichedAnswers.augmentedAnswers;

              console.log('[Email Debug] Parsed augmentedData:', {
                type: typeof augmentedData,
                isArray: Array.isArray(augmentedData),
                keys: Object.keys(augmentedData),
                value: augmentedData
              });

              // Handle array format from database
              if (Array.isArray(augmentedData)) {
                console.log('[Email Debug] Processing array format:', {
                  length: augmentedData.length,
                  firstItem: augmentedData[0]
                });
                return augmentedData.map(item => {
                  // Parse the answer string into components
                  const parts = item.answer.split('\n\n');
                  console.log('[Email Debug] Array item parts:', {
                    question: item.question,
                    parts: parts,
                    originalAnswer: parts[0],
                    context: parts[1],
                    augmentedAnswer: parts[2]
                  });
                  
                  const originalAnswer = parts[0].replace('Original Answer: ', '');
                  const context = parts[1].replace('Context: ', '');
                  const augmentedAnswer = parts[2].replace('Augmented Answer: ', '');
                  
                  return `
                    <div style="margin-bottom: 20px;">
                      <h3 style="color: #4a5568; margin-bottom: 10px;">${item.question}</h3>
                      <div style="margin-bottom: 10px;">
                        <strong>Original Answer:</strong>
                        <div style="margin: 5px 0;">${originalAnswer}</div>
                      </div>
                      <div style="margin-bottom: 10px;">
                        <strong>Context:</strong>
                        <div style="margin: 5px 0;">${context}</div>
                      </div>
                      <div>
                        <strong>Augmented Answer:</strong>
                        <div style="margin: 5px 0;">${augmentedAnswer}</div>
                      </div>
                    </div>
                  `;
                }).join('');
              }
              
              // Handle AugmentedAnswersDetails format
              if (augmentedData.originalAnswer && augmentedData.augmentedAnswer) {
                console.log('[Email Debug] Processing AugmentedAnswersDetails format:', {
                  hasOriginalAnswer: true,
                  hasAugmentedAnswer: true,
                  originalAnswerType: typeof augmentedData.originalAnswer,
                  augmentedAnswerType: typeof augmentedData.augmentedAnswer
                });

                try {
                  const originalAnswers = JSON.parse(augmentedData.originalAnswer);
                  const augmentedAnswers = JSON.parse(augmentedData.augmentedAnswer);
                  
                  console.log('[Email Debug] Parsed answers:', {
                    originalAnswersLength: originalAnswers.length,
                    augmentedAnswersLength: augmentedAnswers.length,
                    firstOriginalAnswer: originalAnswers[0],
                    firstAugmentedAnswer: augmentedAnswers[0]
                  });
                  
                  return augmentedAnswers.map((item: any) => {
                    const originalAnswer = originalAnswers.find((oa: any) => oa.question === item.question)?.answer || '';
                    const parts = item.answer.split('\n\n');
                    console.log('[Email Debug] Processing item:', {
                      question: item.question,
                      originalAnswer,
                      parts,
                      context: parts[1],
                      augmentedAnswer: parts[2] || item.answer
                    });
                    
                    // Parse the context JSON
                    let contextText = '';
                    try {
                      const contextObj = JSON.parse(parts[1].replace('Context: ', ''));
                      if (contextObj.hubspot?.notes?.length) {
                        contextText = contextObj.hubspot.notes
                          .map((note: any) => note.body.replace(/<[^>]*>/g, '').trim())
                          .join('. ');
                      }
                    } catch (e) {
                      console.error('[Email Debug] Error parsing context:', e);
                      contextText = parts[1].replace('Context: ', '');
                    }
                    
                    // Get the final augmented answer
                    const augmentedAnswer = parts[2]?.replace('Augmented Answer: ', '') || 
                      item.answer.split('Augmented Answer: ')[1] || 
                      item.answer;
                    
                    return `
                      <div style="margin-bottom: 20px;">
                        <h3 style="color: #4a5568; margin-bottom: 10px;">${item.question}</h3>
                        <div style="margin-bottom: 10px;">
                          <strong>Original Answer:</strong>
                          <div style="margin: 5px 0;">${originalAnswer}</div>
                        </div>
                        <div style="margin-bottom: 10px;">
                          <strong>Context:</strong>
                          <div style="margin: 5px 0;">${contextText}</div>
                        </div>
                        <div>
                          <strong>Augmented Answer:</strong>
                          <div style="margin: 5px 0;">${augmentedAnswer}</div>
                        </div>
                      </div>
                    `;
                  }).join('');
                } catch (parseError) {
                  console.error('[Email Debug] Error parsing answers:', {
                    error: parseError,
                    originalAnswer: augmentedData.originalAnswer,
                    augmentedAnswer: augmentedData.augmentedAnswer
                  });
                  throw parseError;
                }
              }

              console.error('[Email Debug] Unexpected augmented answers format:', augmentedData);
              return '<p>Invalid augmented answers format</p>';
            } catch (error) {
              console.error('[Email Debug] Error in augmented answers processing:', {
                error: error instanceof Error ? error.message : 'Unknown error',
                stack: error instanceof Error ? error.stack : undefined,
                enrichedAnswers: params.enrichedAnswers
              });
              return '<p>Error displaying augmented analysis</p>';
            }
          })()}
        ` : '<p>No augmented analysis available</p>'}
      </div>

      <h2>Your Responses:</h2>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
        ${params.enrichedAnswers?.originalAnswers ? `
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${(params.enrichedAnswers.originalAnswers as BookingAnswers[]).map(qa => `
              <li style="margin-bottom: 15px;">
                <strong>${qa.question}:</strong>
                <div style="margin: 5px 0;">${qa.answer}</div>
              </li>
            `).join('')}
          </ul>
        ` : '<p>No responses provided</p>'}
      </div>

      <h2>Contact Context:</h2>
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
        ${finalLinkedInData ? `
          <h3>LinkedIn Profile</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${finalLinkedInData.title ? `
              <li style="margin-bottom: 10px;">
                <strong>Title:</strong>
                <div style="margin: 5px 0;">${finalLinkedInData.title}</div>
              </li>
            ` : ''}
            ${finalLinkedInData.company ? `
              <li style="margin-bottom: 10px;">
                <strong>Company:</strong>
                <div style="margin: 5px 0;">${finalLinkedInData.company}</div>
              </li>
            ` : ''}
            ${finalLinkedInData.location ? `
              <li style="margin-bottom: 10px;">
                <strong>Location:</strong>
                <div style="margin: 5px 0;">${finalLinkedInData.location}</div>
              </li>
            ` : ''}
            ${finalLinkedInData.summary ? `
              <li style="margin-bottom: 10px;">
                <strong>Summary:</strong>
                <div style="margin: 5px 0;">${finalLinkedInData.summary}</div>
              </li>
            ` : ''}
          </ul>
        ` : ''}

        <h3>Contact Details</h3>
        <ul style="list-style-type: none; padding-left: 0; margin: 0;">
          ${Object.entries(params.enrichedAnswers || {})
            .filter(([key, value]) => 
              key.startsWith('HubSpot') && 
              value !== undefined && 
              value !== null &&
              typeof value === 'string')
            .map(([key, value]) => `
              <li style="margin-bottom: 10px;">
                <strong>${key.replace('HubSpot', '')}:</strong>
                <div style="margin: 5px 0;">${value}</div>
              </li>
            `).join('')}
        </ul>
        
        <h3>Recent Notes</h3>
        <ul style="list-style-type: none; padding-left: 0; margin: 0;">
          ${params.enrichedAnswers?.notes && params.enrichedAnswers.notes.length > 0 ? 
            params.enrichedAnswers.notes.map((note: Note) => `
              <li style="margin-bottom: 15px; border-left: 3px solid #dee2e6; padding-left: 10px;">
                <strong>${new Date(note.timestamp).toLocaleString()}</strong>
                <div style="margin: 5px 0; white-space: pre-wrap;">${note.body.replace(/<[^>]*>/g, '')}</div>
              </li>
            `).join('') : 
            '<li>No recent notes</li>'
          }
        </ul>

        <h3>Recent Deals</h3>
        <ul style="list-style-type: none; padding-left: 0; margin: 0;">
          ${params.enrichedAnswers?.deals && params.enrichedAnswers.deals.length > 0 ? 
            params.enrichedAnswers.deals.map((deal: Deal) => `
              <li style="margin-bottom: 15px; border-left: 3px solid #dee2e6; padding-left: 10px;">
                <strong>${deal.name}</strong>
                <div style="margin: 5px 0;">Amount: ${deal.amount}</div>
                <div style="margin: 5px 0;">Stage: ${deal.stage}</div>
              </li>
            `).join('') : 
            '<li>No recent deals</li>'
          }
        </ul>
      </div>
    `;

    // Send email to advisor
    const advisorEmailResult = await resend.emails.send({
      from: "Scheduling <scheduling@updates.alberttutorial.com>",
      to: params.advisorEmail,
      subject: `Meeting Confirmation: ${attendeeName}`,
      html: advisorEmailContent
    });

    const attendeeEmailResult = await resend.emails.send({
      from: "Scheduling <scheduling@updates.alberttutorial.com>",
      to: params.attendeeEmail,
      subject: `Meeting Confirmation: ${hostName}`,
      html: attendeeEmailContent
    });

    if (!advisorEmailResult || !attendeeEmailResult) {
      throw new Error('Failed to send one or both emails');
    }

    const response: EmailResponse = {
      from: "Scheduling <scheduling@updates.alberttutorial.com>",
      to: params.advisorEmail,
      subject: `Meeting Confirmation: ${attendeeName}`
    };

    if (advisorEmailResult.data?.id) {
      response.id = advisorEmailResult.data.id;
    }

    return response;
  } catch (error: unknown) {
    console.error('Error in sendAdvisorNotificationEmail:', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
      attendeeEmail: params.attendeeEmail,
      advisorEmail: params.advisorEmail
    });
    throw error;
  }
}

export function renderTemplate(template: string, data: EmailTemplateData): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (match, key) => {
    const value = data[key.trim()];
    return value !== undefined ? String(value) : match;
  });
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    timeZoneName: 'short'
  });
} 