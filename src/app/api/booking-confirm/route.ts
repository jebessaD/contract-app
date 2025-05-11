import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchHubspotContact, getHubspotClient } from "@/lib/hubspot";
import { mockLinkedInScrape } from "@/lib/linkedin-mock";
import { augmentAnswers } from "@/lib/ai-augment";
import { sendConfirmationEmail, sendAdvisorNotificationEmail } from "@/lib/email";
import { Prisma } from "@prisma/client";

interface BookingAnswers {
  question: string;
  answer: string;
  required: boolean;
}

type EnrichedBookingData = {
  originalAnswers: BookingAnswers[];
  enrichedAnswers: Record<string, string>;
  hubspotContactId?: string;
  linkedinData?: string;
} & Record<string, unknown>;

export async function POST(req: Request) {
  try {
    console.log("Starting booking confirmation process");
    
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("Request body:", { ...body, answers: body.answers ? "present" : "missing" });
    
    const { email, linkedinUrl, answers, bookingId } = body;

    if (!email || !linkedinUrl || !answers || !bookingId) {
      console.log("Missing required fields:", { email: !!email, linkedinUrl: !!linkedinUrl, answers: !!answers, bookingId: !!bookingId });
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the booking details
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        schedulingLink: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!booking) {
      console.log("Booking not found:", bookingId);
      return NextResponse.json(
        { error: "Booking not found" },
        { status: 404 }
      );
    }

    console.log("Found booking:", { id: booking.id, scheduledTime: booking.scheduledTime });

    // Get HubSpot client for the user
    let hubspotContact = null;
    try {
      const { accessToken } = await getHubspotClient(booking.schedulingLink.user.id);
      hubspotContact = await searchHubspotContact(email, accessToken);
      console.log("HubSpot contact search result:", hubspotContact ? "found" : "not found");
    } catch (error) {
      console.error("Error searching HubSpot contact:", error);
      // Continue without HubSpot data
    }

    // If no HubSpot contact found, scrape LinkedIn (mocked for now)
    const linkedinData = !hubspotContact ? await mockLinkedInScrape(linkedinUrl) : null;
    console.log("LinkedIn data:", linkedinData ? "found" : "not found");

    // Augment answers with AI using context
    const enrichedAnswers = await augmentAnswers(answers, {
      hubspotContact,
      linkedinData,
    });
    console.log("Enriched answers:", Object.keys(enrichedAnswers).length);

    // Calculate end time based on meeting length
    const startTime = new Date(booking.scheduledTime);
    const endTime = new Date(startTime.getTime() + booking.schedulingLink.meetingLength * 60000);

    try {
      // Send confirmation email to attendee
      await sendConfirmationEmail({
        to: email,
        bookingDetails: {
          startTime,
          endTime,
          meetingLength: booking.schedulingLink.meetingLength,
          hostName: booking.schedulingLink.user.name || "Your host",
          hostEmail: booking.schedulingLink.user.email || "",
        },
        enrichedAnswers,
      });
      console.log("Sent confirmation email to attendee");
    } catch (error) {
      console.error("Error sending confirmation email:", error);
      throw error;
    }

    try {
      // Send notification email to advisor
      await sendAdvisorNotificationEmail({
        advisorEmail: booking.schedulingLink.user.email || '',
        attendeeEmail: email,
        attendeeName: hubspotContact?.properties.firstname 
          ? `${hubspotContact.properties.firstname} ${hubspotContact.properties.lastname || ''}`
          : linkedinData?.name || email,
        bookingDetails: {
          startTime,
          endTime,
          meetingLength: booking.schedulingLink.meetingLength,
          hostName: booking.schedulingLink.user.name || "Your host",
          hostEmail: booking.schedulingLink.user.email || "",
        },
        enrichedAnswers,
        hubspotContact: hubspotContact ? {
          id: hubspotContact.id,
          properties: Object.fromEntries(
            Object.entries(hubspotContact.properties)
              .filter(([_, value]) => value !== undefined)
          ) as Record<string, string>
        } : null,
        linkedinData,
      });
      console.log("Sent notification email to advisor");
    } catch (error) {
      console.error("Error sending advisor notification:", error);
      throw error;
    }

    // Update booking with enriched data
    const updatedAnswers: EnrichedBookingData = {
      originalAnswers: (booking.answers as unknown as BookingAnswers[]),
      enrichedAnswers,
      hubspotContactId: hubspotContact?.id,
      linkedinData: linkedinData ? JSON.stringify(linkedinData) : undefined,
    };

    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        answers: updatedAnswers as unknown as Prisma.InputJsonValue,
      },
    });
    console.log("Updated booking with enriched data");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in booking confirmation:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return NextResponse.json(
      { error: "Failed to process booking confirmation", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 