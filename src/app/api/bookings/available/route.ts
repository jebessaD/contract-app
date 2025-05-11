import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get("linkId");
    const date = searchParams.get("date");

    if (!linkId) {
      return NextResponse.json(
        { error: "Link ID is required" },
        { status: 400 }
      );
    }

    // Get the scheduling link with advisor's windows
    const link = await prisma.schedulingLink.findUnique({
      where: { id: linkId },
      include: {
        user: {
          include: {
            schedulingWindows: true,
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json(
        { error: "Invalid scheduling link" },
        { status: 400 }
      );
    }

    // Check if the link has expired
    if (link.expiresAt && new Date(link.expiresAt) < new Date()) {
      return NextResponse.json(
        { error: "This scheduling link has expired" },
        { status: 400 }
      );
    }

    // Get all bookings for this user across all their links
    const bookings = await prisma.booking.findMany({
      where: {
        userId: link.userId, // Get all bookings for this user
        scheduledTime: {
          gte: new Date().toISOString(), // Only future bookings
        },
      },
      select: {
        scheduledTime: true,
      },
    });

    // Get current usage count for this specific link
    const currentUsage = await prisma.booking.count({
      where: {
        schedulingLinkId: linkId,
      },
    });

    // Check if usage limit is reached
    const isUsageLimitReached = link.usageLimit ? currentUsage >= link.usageLimit : false;

    // Extract booked time slots
    const bookedSlots = bookings.map(booking => booking.scheduledTime);

    // Get advisor's scheduling windows
    const schedulingWindows = link.user.schedulingWindows;

    return NextResponse.json({
      bookedSlots,
      schedulingWindows,
      meetingLength: link.meetingLength,
      maxAdvanceDays: link.maxAdvanceDays,
      currentUsage,
      usageLimit: link.usageLimit,
      isUsageLimitReached,
      expiresAt: link.expiresAt,
    });
  } catch (error) {
    console.error("Error fetching available slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch available slots" },
      { status: 500 }
    );
  }
} 