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

export function sendConfirmationEmail(params: EmailParams): Promise<any>;
export function sendAdvisorNotificationEmail(params: AdvisorNotificationParams): Promise<any>; 