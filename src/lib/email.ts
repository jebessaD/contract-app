import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface BookingDetails {
  startTime: Date;
  endTime: Date;
  meetingLength: number;
  hostName: string;
  hostEmail: string;
}

interface EnrichedAnswers {
  [key: string]: string;
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
        <ul>
          <li>Date: ${bookingDetails.startTime.toLocaleDateString()}</li>
          <li>Time: ${bookingDetails.startTime.toLocaleTimeString()} - ${bookingDetails.endTime.toLocaleTimeString()}</li>
          <li>Duration: ${bookingDetails.meetingLength} minutes</li>
        </ul>
        <h2>Your Information:</h2>
        <ul>
          ${Object.entries(enrichedAnswers)
            .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
            .join('')}
        </ul>
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
        <ul>
          <li>Date: ${bookingDetails.startTime.toLocaleDateString()}</li>
          <li>Time: ${bookingDetails.startTime.toLocaleTimeString()} - ${bookingDetails.endTime.toLocaleTimeString()}</li>
          <li>Duration: ${bookingDetails.meetingLength} minutes</li>
        </ul>

        <h2>Attendee Information:</h2>
        <ul>
          ${Object.entries(enrichedAnswers)
            .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
            .join('')}
        </ul>

        ${hubspotError ? `
        <div style="background-color: #fff3cd; padding: 10px; margin: 10px 0; border: 1px solid #ffeeba; border-radius: 4px;">
          <h3>HubSpot Integration Warning</h3>
          <p>Could not create/update HubSpot contact: ${hubspotError.message}</p>
          <p>The booking is confirmed, but you may want to manually create the contact in HubSpot.</p>
        </div>
        ` : ''}

        ${hubspotContact ? `
        <h2>HubSpot Contact Information:</h2>
        <ul>
          ${Object.entries(hubspotContact.properties)
            .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
            .join('')}
        </ul>
        ` : ''}

        ${hubspotContext ? `
        <h2>HubSpot Context:</h2>
        <h3>Recent Notes:</h3>
        <ul>
          ${hubspotContext.recentNotes.map(note => `
            <li>
              <strong>${note.timestamp.toLocaleDateString()}:</strong>
              <p>${note.body}</p>
            </li>
          `).join('')}
        </ul>

        <h3>Recent Deals:</h3>
        <ul>
          ${hubspotContext.recentDeals.map(deal => `
            <li>
              <strong>${deal.name}</strong>
              <p>Amount: ${deal.amount}</p>
              <p>Stage: ${deal.stage}</p>
            </li>
          `).join('')}
        </ul>
        ` : ''}

        ${linkedinData ? `
        <h2>LinkedIn Information:</h2>
        <ul>
          ${linkedinData.name ? `<li><strong>Name:</strong> ${linkedinData.name}</li>` : ''}
          ${linkedinData.title ? `<li><strong>Title:</strong> ${linkedinData.title}</li>` : ''}
          ${linkedinData.company ? `<li><strong>Company:</strong> ${linkedinData.company}</li>` : ''}
          ${linkedinData.location ? `<li><strong>Location:</strong> ${linkedinData.location}</li>` : ''}
          ${linkedinData.summary ? `<li><strong>Summary:</strong> ${linkedinData.summary}</li>` : ''}
          ${linkedinData.experience && linkedinData.experience.length > 0 ? `
            <li><strong>Experience:</strong>
              <ul>
                ${linkedinData.experience.map(exp => `
                  <li>${exp.title} at ${exp.company} (${exp.duration})</li>
                `).join('')}
              </ul>
            </li>
          ` : ''}
        </ul>
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