import { google } from "googleapis";
import { prisma } from "./prisma";

interface TimeSlot {
  start: Date;
  end: Date;
  isBusy: boolean;
}

export async function getCalendarEvents(userId: string) {
  const googleAccount = await prisma.googleAccount.findFirst({
    where: {
      userId,
      isPrimary: true,
    },
  });

  if (!googleAccount) {
    console.log("No primary Google account found for user:", userId);
    return { events: [], timeSlots: [] };
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.NEXTAUTH_URL + "/api/auth/callback/google"
  );

  oauth2Client.setCredentials({
    access_token: googleAccount.accessToken,
    refresh_token: googleAccount.refreshToken,
    expiry_date: googleAccount.expiryDate.getTime(),
  });

  const calendar = google.calendar({ version: "v3", auth: oauth2Client });

  try {
    // Get events for the next 7 days
    const now = new Date();
    const oneWeekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [eventsResponse, freeBusyResponse] = await Promise.all([
      calendar.events.list({
        calendarId: "primary",
        timeMin: now.toISOString(),
        timeMax: oneWeekLater.toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime",
      }),
      calendar.freebusy.query({
        requestBody: {
          timeMin: now.toISOString(),
          timeMax: oneWeekLater.toISOString(),
          items: [{ id: "primary" }],
        },
      }),
    ]);

    const events = eventsResponse.data.items || [];
    const busySlots = freeBusyResponse.data.calendars?.primary?.busy || [];

    // Create time slots for visualization
    const timeSlots: TimeSlot[] = [];
    let currentTime = new Date(now);

    // Create 30-minute slots for the next 7 days
    while (currentTime < oneWeekLater) {
      const slotEnd = new Date(currentTime.getTime() + 30 * 60 * 1000);
      const isBusy = busySlots.some(
        (busy) =>
          new Date(busy.start!) <= slotEnd &&
          new Date(busy.end!) >= currentTime
      );

      timeSlots.push({
        start: new Date(currentTime),
        end: slotEnd,
        isBusy,
      });

      currentTime = slotEnd;
    }

    return { events, timeSlots };
  } catch (error) {
    console.error("Error fetching calendar data:", error);
    
    if (error instanceof Error && error.message.includes("API has not been used") || error.message.includes("API is disabled")) {
      console.log("Google Calendar API needs to be enabled. Please visit the Google Cloud Console to enable it.");
      return { events: [], timeSlots: [] };
    }

    if (error instanceof Error && error.message.includes("invalid_grant")) {
      try {
        const { tokens } = await oauth2Client.refreshAccessToken();
        
        await prisma.googleAccount.update({
          where: { id: googleAccount.id },
          data: {
            accessToken: tokens.access_token!,
            refreshToken: tokens.refresh_token || googleAccount.refreshToken,
            expiryDate: new Date(tokens.expiry_date!),
          },
        });

        oauth2Client.setCredentials(tokens);
        return getCalendarEvents(userId); // Retry the request
      } catch (refreshError) {
        console.error("Error refreshing token:", refreshError);
        return { events: [], timeSlots: [] };
      }
    }

    return { events: [], timeSlots: [] };
  }
} 