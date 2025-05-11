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

interface LinkedInData {
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
  linkedinData?: LinkedInData | null;
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

        ${hubspotContact ? `
        <h2>HubSpot Contact Information:</h2>
        <ul>
          ${Object.entries(hubspotContact.properties)
            .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
            .join('')}
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