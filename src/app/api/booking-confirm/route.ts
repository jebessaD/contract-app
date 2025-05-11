import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { searchHubspotContact, getHubspotClient } from "@/lib/hubspot";
import { linkedInService } from "@/lib/linkedin";
import { augmentAnswers } from "@/lib/ai-augment";
import { sendAdvisorNotificationEmail } from "@/lib/email";
import type { LinkedInData } from "@/lib/linkedin.d";
import { Prisma } from "@prisma/client";

interface BookingAnswers {
  question: string;
  answer: string;
  required: boolean;
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

type EnrichedBookingData = {
  originalAnswers: BookingAnswers[];
  enrichedAnswers: Record<string, string>;
  hubspotContactId?: string;
  linkedinData?: string;
  notes?: Note[];
  deals?: Deal[];
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

    // If no HubSpot contact found, try to get LinkedIn data
    let linkedinData: LinkedInData | null = null;
    if (!hubspotContact && linkedinUrl) {
      try {
        console.log("Attempting to fetch LinkedIn data for URL:", linkedinUrl);
        const profile = await linkedInService.getEmployeeProfile(linkedinUrl);
        console.log("Successfully fetched LinkedIn profile:", {
          name: profile.full_name,
          title: profile.headline
        });

        linkedinData = {
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
        console.error("Error fetching LinkedIn data:", error);
        // If LinkedIn fetch fails, try domain-based search
        try {
          const domain = email.split('@')[1];
          if (domain) {
            console.log("Attempting domain-based search for:", domain);
            const company = await linkedInService.findCompanyByDomain(domain);
            if (company.linkedin_url) {
              const employees = await linkedInService.searchEmployeesByTitle(
                company.linkedin_url,
                'Software Engineer'
              );
              if (employees.length > 0) {
                const employee = employees[0];
                linkedinData = {
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
                } as LinkedInData;
              }
            }
          }
        } catch (domainError) {
          console.error("Error in domain-based search:", domainError);
        }
      }
    }

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

    // Process HubSpot notes and deals
    const processedNotes = hubspotContact?.notes?.map(note => ({
      body: note.body || '',
      timestamp: note.timestamp || new Date().toISOString()
    })) || [];

    const processedDeals = hubspotContact?.deals?.map(deal => ({
      name: deal.name || 'Unnamed Deal',
      amount: deal.amount || '0',
      stage: deal.stage || 'Unknown'
    })) || [];

    try {
      console.log("Attempting to send confirmation email with data:", {
        email,
        bookingDetails: {
          startTime,
          endTime,
          meetingLength: booking.schedulingLink.meetingLength,
          hostName: booking.schedulingLink.user.name,
          hostEmail: booking.schedulingLink.user.email,
        },
        enrichedAnswers: {
          ...enrichedAnswers,
          originalAnswers: answers,
          notes: processedNotes,
          deals: processedDeals,
          linkedinData
        }
      });
      // Send notification email to both advisor and attendee
      await sendAdvisorNotificationEmail({
        attendeeEmail: email,
        advisorEmail: booking.schedulingLink.user.email || '',
        scheduledTime: new Date(booking.scheduledTime),
        bookingId,
        linkedinData,
        enrichedAnswers: {
          ...enrichedAnswers,
          originalAnswers: answers,
          notes: processedNotes,
          deals: processedDeals,
          name: hubspotContact?.properties.firstname 
            ? `${hubspotContact.properties.firstname} ${hubspotContact.properties.lastname || ''}`
            : linkedinData?.name || email,
          duration: `${booking.schedulingLink.meetingLength} minutes`,
          hostName: booking.schedulingLink.user.name || 'Your host'
        },
        attendeeName: hubspotContact?.properties.firstname 
          ? `${hubspotContact.properties.firstname} ${hubspotContact.properties.lastname || ''}`
          : linkedinData?.name || email,
        hostName: booking.schedulingLink.user.name || 'Your host',
        bookingDetails: {
          startTime: new Date(booking.scheduledTime),
          endTime: new Date(booking.scheduledTime.getTime() + booking.schedulingLink.meetingLength * 60000),
          meetingLength: booking.schedulingLink.meetingLength,
          hostName: booking.schedulingLink.user.name || 'Your host',
          hostEmail: booking.schedulingLink.user.email || '',
          attendeeEmail: email
        }
      });
      console.log("Sent notification emails to both advisor and attendee");
    } catch (error) {
      console.error("Error sending notification emails:", error);
      throw error;
    }

    // Update booking with enriched data
    const updatedAnswers: EnrichedBookingData = {
      originalAnswers: (booking.answers as unknown as BookingAnswers[]),
      enrichedAnswers,
      hubspotContactId: hubspotContact?.id,
      linkedinData: linkedinData ? JSON.stringify(linkedinData) : undefined,
      notes: processedNotes,
      deals: processedDeals
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
      return NextResponse.json(
        { error: "Failed to process booking confirmation", details: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Failed to process booking confirmation", details: "Unknown error" },
      { status: 500 }
    );
  }
} 