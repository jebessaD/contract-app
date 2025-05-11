import { Resend } from "resend";

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
  [key: string]: string | Note[] | Deal[] | undefined | BookingAnswers[];
  notes?: Note[];
  deals?: Deal[];
  originalAnswers?: BookingAnswers[];
}

interface EmailParams {
  to: string;
  bookingDetails: BookingDetails;
  enrichedAnswers: EnrichedAnswers;
}

interface HubspotContext {
  contact: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    lifecyclestage?: string;
  };
  recentNotes: Array<{
    body: string;
    timestamp: Date;
  }>;
  recentDeals: Array<{
    name: string;
    amount: string;
    stage: string;
  }>;
}

interface AdvisorNotificationParams {
  advisorEmail: string;
  attendeeEmail: string;
  attendeeName: string;
  bookingDetails: BookingDetails;
  enrichedAnswers: EnrichedAnswers;
  hubspotContact?: {
    id: string;
    properties: Record<string, string>;
  } | null;
  linkedinData?: {
    name?: string;
    title?: string;
    company?: string;
    location?: string;
    summary?: string;
    experience?: Array<{
      title: string;
      company: string;
      duration: string;
    }>;
  } | null;
  hubspotContext?: HubspotContext | null;
  hubspotError?: {
    message: string;
  } | null;
}

export async function sendConfirmationEmail({
  to,
  bookingDetails,
  enrichedAnswers,
}: EmailParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: "Scheduling <scheduling@updates.jebessa.tech>",
      to,
      subject: `Meeting Confirmation: ${bookingDetails.hostName}`,
      html: `
        <h1>Meeting Confirmation</h1>
        <p>Your meeting has been scheduled with ${bookingDetails.hostName}.</p>
        
        <h2>Meeting Details:</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            <li style="margin-bottom: 10px;"><strong>Date:</strong> ${bookingDetails.startTime.toLocaleDateString()}</li>
            <li style="margin-bottom: 10px;"><strong>Time:</strong> ${bookingDetails.startTime.toLocaleTimeString()} - ${bookingDetails.endTime.toLocaleTimeString()}</li>
            <li style="margin-bottom: 10px;"><strong>Duration:</strong> ${bookingDetails.meetingLength} minutes</li>
          </ul>
        </div>

        <h2>Your Responses:</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${enrichedAnswers.originalAnswers ? `
            <ul style="list-style-type: none; padding-left: 0; margin: 0;">
              ${(enrichedAnswers.originalAnswers as BookingAnswers[]).map(qa => `
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
          <h3>Contact Details</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${Object.entries(enrichedAnswers)
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
            ${enrichedAnswers.notes && enrichedAnswers.notes.length > 0 ? 
              enrichedAnswers.notes.map(note => `
                <li style="margin-bottom: 15px; border-left: 3px solid #dee2e6; padding-left: 10px;">
                  <strong>${new Date(note.timestamp).toLocaleString()}</strong>
                  <div style="margin: 5px 0;">${note.body}</div>
                </li>
              `).join('') : 
              '<li>No recent notes</li>'
            }
          </ul>

          <h3>Recent Deals</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${enrichedAnswers.deals && enrichedAnswers.deals.length > 0 ? 
              enrichedAnswers.deals.map(deal => `
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

    return data;
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    throw error;
  }
}

export async function sendAdvisorNotificationEmail({
  advisorEmail,
  attendeeEmail,
  attendeeName,
  bookingDetails,
  enrichedAnswers,
  hubspotContact,
  linkedinData,
  hubspotContext,
  hubspotError,
}: AdvisorNotificationParams) {
  try {
    const { data, error } = await resend.emails.send({
      from: "Scheduling <scheduling@updates.jebessa.tech>",
      to: advisorEmail,
      subject: `New Meeting Scheduled with ${attendeeName}`,
      html: `
        <h1>New Meeting Scheduled</h1>
        <p>You have a new meeting scheduled with ${attendeeName} (${attendeeEmail}).</p>
        
        <h2>Meeting Details:</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            <li style="margin-bottom: 10px;"><strong>Date:</strong> ${bookingDetails.startTime.toLocaleDateString()}</li>
            <li style="margin-bottom: 10px;"><strong>Time:</strong> ${bookingDetails.startTime.toLocaleTimeString()} - ${bookingDetails.endTime.toLocaleTimeString()}</li>
            <li style="margin-bottom: 10px;"><strong>Duration:</strong> ${bookingDetails.meetingLength} minutes</li>
          </ul>
        </div>

        <h2>Attendee Responses:</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
          ${enrichedAnswers.originalAnswers ? `
            <ul style="list-style-type: none; padding-left: 0; margin: 0;">
              ${(enrichedAnswers.originalAnswers as BookingAnswers[]).map(qa => `
                <li style="margin-bottom: 15px;">
                  <strong>${qa.question}:</strong>
                  <div style="margin: 5px 0;">${qa.answer}</div>
                </li>
              `).join('')}
            </ul>
          ` : '<p>No responses provided</p>'}
        </div>

        ${hubspotError ? `
        <div style="background-color: #fff3cd; padding: 15px; margin: 15px 0; border: 1px solid #ffeeba; border-radius: 5px;">
          <h3>⚠️ HubSpot Integration Warning</h3>
          <p>Could not create/update HubSpot contact: ${hubspotError.message}</p>
          <p>The booking is confirmed, but you may want to manually create the contact in HubSpot.</p>
        </div>
        ` : ''}

        ${hubspotContact ? `
        <h2>HubSpot Contact Information:</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${Object.entries(hubspotContact.properties)
              .filter(([key, value]) => 
                value !== undefined && 
                value !== null && 
                typeof value !== 'object')
              .map(([key, value]) => `
                <li style="margin-bottom: 10px;">
                  <strong>${key}:</strong>
                  <div style="margin: 5px 0;">${value}</div>
                </li>
              `).join('')}
          </ul>
        </div>
        ` : ''}

        ${hubspotContext ? `
        <h2>HubSpot Context:</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <h3>Recent Notes:</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${hubspotContext.recentNotes.length > 0 ? 
              hubspotContext.recentNotes.map(note => `
                <li style="margin-bottom: 15px; border-left: 3px solid #dee2e6; padding-left: 10px;">
                  <strong>${note.timestamp.toLocaleDateString()}</strong>
                  <div style="margin: 5px 0;">${note.body}</div>
                </li>
              `).join('') :
              '<li>No recent notes</li>'
            }
          </ul>

          <h3>Recent Deals:</h3>
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${hubspotContext.recentDeals.length > 0 ?
              hubspotContext.recentDeals.map(deal => `
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
        ` : ''}

        ${linkedinData ? `
        <h2>LinkedIn Information:</h2>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 10px 0;">
          <ul style="list-style-type: none; padding-left: 0; margin: 0;">
            ${linkedinData.name ? `<li style="margin-bottom: 10px;"><strong>Name:</strong> ${linkedinData.name}</li>` : ''}
            ${linkedinData.title ? `<li style="margin-bottom: 10px;"><strong>Title:</strong> ${linkedinData.title}</li>` : ''}
            ${linkedinData.company ? `<li style="margin-bottom: 10px;"><strong>Company:</strong> ${linkedinData.company}</li>` : ''}
            ${linkedinData.location ? `<li style="margin-bottom: 10px;"><strong>Location:</strong> ${linkedinData.location}</li>` : ''}
            ${linkedinData.summary ? `
              <li style="margin: 10px 0;">
                <strong>Summary:</strong>
                <div style="margin: 5px 0;">${linkedinData.summary}</div>
              </li>
            ` : ''}
            ${linkedinData.experience && linkedinData.experience.length > 0 ? `
              <li style="margin: 10px 0;">
                <strong>Experience:</strong>
                <ul style="margin: 5px 0; padding-left: 20px;">
                  ${linkedinData.experience.map(exp => `
                    <li style="margin: 5px 0;">${exp.title} at ${exp.company} (${exp.duration})</li>
                  `).join('')}
                </ul>
              </li>
            ` : ''}
          </ul>
        </div>
        ` : ''}
      `,
    });

    if (error) {
      console.error('Failed to send advisor notification:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error sending advisor notification:', error);
    throw error;
  }
} 