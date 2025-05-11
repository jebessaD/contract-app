import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const bookingSchema = z.object({
  email: z.string().email("Invalid email address"),
  linkedinUrl: z.string().url("Invalid LinkedIn URL").refine(
    (url) => url.includes("linkedin.com"),
    "Must be a LinkedIn URL"
  ),
  answers: z.array(
    z.object({
      question: z.string(),
      answer: z.string().min(1, "This field is required"),
      required: z.boolean(),
    })
  ),
  selectedTime: z.string().min(1, "Please select a time slot"),
  schedulingLinkId: z.string(),
  advisorEmail: z.string().email(),
});

export async function POST(request: Request) {
  try {
    console.log("Received booking request");
    const data = await request.json();
    console.log("Request data:", data);

    const validatedData = bookingSchema.parse(data);
    console.log("Validated data:", validatedData);

    // Check if the scheduling link exists and is valid
    const link = await prisma.schedulingLink.findUnique({
      where: { id: validatedData.schedulingLinkId },
      include: {
        user: true,
      },
    });

    console.log("Found scheduling link:", link);

    if (!link) {
      console.log("Invalid scheduling link:", validatedData.schedulingLinkId);
      return new NextResponse(
        JSON.stringify({ error: "Invalid scheduling link" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if the link has expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      console.log("Link expired:", link.expiresAt);
      return new NextResponse(
        JSON.stringify({ error: "This scheduling link has expired" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if the usage limit has been reached
    if (link.usageLimit) {
      const bookingCount = await prisma.booking.count({
        where: { schedulingLinkId: link.id },
      });

      console.log("Current booking count:", bookingCount, "Limit:", link.usageLimit);

      if (bookingCount >= link.usageLimit) {
        return new NextResponse(
          JSON.stringify({ 
            error: `This scheduling link has reached its limit of ${link.usageLimit} bookings`,
            currentUsage: bookingCount,
            limit: link.usageLimit
          }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // Parse and validate the date
    const scheduledTime = new Date(validatedData.selectedTime);
    if (isNaN(scheduledTime.getTime())) {
      console.error("Invalid date:", validatedData.selectedTime);
      return new NextResponse(
        JSON.stringify({ error: "Invalid date format" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if the selected time is available across all user's links
    const existingBooking = await prisma.booking.findFirst({
      where: {
        userId: link.userId, // Check across all user's links
        scheduledTime: scheduledTime,
      },
    });

    if (existingBooking) {
      console.log("Time slot already booked:", scheduledTime);
      return new NextResponse(
        JSON.stringify({ error: "This time slot is already booked" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Use a transaction to ensure atomicity
    const booking = await prisma.$transaction(async (tx) => {
      // Double-check usage limit within transaction
      if (link.usageLimit) {
        const currentCount = await tx.booking.count({
          where: { schedulingLinkId: link.id },
        });

        if (currentCount >= link.usageLimit) {
          throw new Error(`This scheduling link has reached its limit of ${link.usageLimit} bookings`);
        }
      }

      // Create the booking
      return await tx.booking.create({
        data: {
          email: validatedData.email,
          linkedinUrl: validatedData.linkedinUrl,
          answers: validatedData.answers,
          scheduledTime,
          schedulingLinkId: link.id,
          advisorEmail: validatedData.advisorEmail,
          userId: link.userId,
        },
      });
    });

    console.log("Booking created successfully:", booking);

    return new NextResponse(
      JSON.stringify({
        success: true,
        booking,
        message: "Meeting booked successfully!",
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Error creating booking:", error);
    
    if (error instanceof z.ZodError) {
      console.error("Validation error:", error.errors);
      return new NextResponse(
        JSON.stringify({ error: "Invalid booking data", details: error.errors }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (error instanceof Error) {
      console.error("Error details:", error.message);
      return new NextResponse(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new NextResponse(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} 