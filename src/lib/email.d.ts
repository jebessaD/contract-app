export interface BookingDetails {
  startTime: Date;
  endTime: Date;
  meetingLength: number;
  hostName: string;
  hostEmail: string;
}

export interface EnrichedAnswers {
  [key: string]: string;
}

export interface EmailParams {
  to: string;
  bookingDetails: BookingDetails;
  enrichedAnswers: EnrichedAnswers;
}

export interface AdvisorNotificationParams {
  advisorEmail: string;
  attendeeEmail: string;
  attendeeName: string;
  bookingDetails: BookingDetails;
  enrichedAnswers: EnrichedAnswers;
  hubspotContact?: {
    id: string;
    properties: {
      email: string;
      firstname?: string;
      lastname?: string;
      company?: string;
      phone?: string;
      linkedin_url?: string;
    };
  } | null;
  linkedinData?: {
    name: string;
    title: string;
    company: string;
    summary: string;
  } | null;
}

export interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

export interface EmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailTemplate {
  name: string;
  subject: string;
  html: string;
  text?: string;
}

export interface EmailContext {
  [key: string]: string | number | boolean | object | undefined;
}

export function sendConfirmationEmail(params: EmailParams): Promise<EmailResponse>;
export function sendAdvisorNotificationEmail(params: AdvisorNotificationParams): Promise<EmailResponse>; 