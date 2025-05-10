import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const links = await prisma.schedulingLink.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(links);
  } catch (error) {
    console.error("Error fetching scheduling links:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduling links" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const data = await request.json();
    console.log("Received data:", data);

    // Validate required fields
    if (!data.meetingLength || !data.maxAdvanceDays) {
      return NextResponse.json(
        { error: "Meeting length and max advance days are required" },
        { status: 400 }
      );
    }

    // Validate meeting length
    if (data.meetingLength < 15 || data.meetingLength > 480) {
      return NextResponse.json(
        { error: "Meeting length must be between 15 and 480 minutes" },
        { status: 400 }
      );
    }

    // Validate max advance days
    if (data.maxAdvanceDays < 1 || data.maxAdvanceDays > 365) {
      return NextResponse.json(
        { error: "Max advance days must be between 1 and 365" },
        { status: 400 }
      );
    }

    // Validate custom questions
    if (!Array.isArray(data.customQuestions)) {
      return NextResponse.json(
        { error: "Custom questions must be an array" },
        { status: 400 }
      );
    }

    // Filter out empty questions
    const validQuestions = data.customQuestions.filter(
      (q: any) => q.question && q.question.trim() !== ""
    );

    if (validQuestions.length === 0) {
      return NextResponse.json(
        { error: "At least one question is required" },
        { status: 400 }
      );
    }

    // Generate a unique slug
    let slug;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 5;

    while (!isUnique && attempts < maxAttempts) {
      slug = nanoid(10);
      const existing = await prisma.schedulingLink.findUnique({
        where: { slug },
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return NextResponse.json(
        { error: "Failed to generate unique slug" },
        { status: 500 }
      );
    }

    console.log("Creating link with data:", {
      userId: session.user.id,
      slug,
      usageLimit: data.usageLimit || null,
      expiresAt: data.expiresAt || null,
      meetingLength: data.meetingLength,
      maxAdvanceDays: data.maxAdvanceDays,
      customQuestions: validQuestions,
    });

    const link = await prisma.schedulingLink.create({
      data: {
        userId: session.user.id,
        slug: slug!,
        usageLimit: data.usageLimit || null,
        expiresAt: data.expiresAt || null,
        meetingLength: data.meetingLength,
        maxAdvanceDays: data.maxAdvanceDays,
        customQuestions: validQuestions,
      },
    });

    console.log("Created link:", link);
    return NextResponse.json(link);
  } catch (error) {
    console.error("Error creating scheduling link:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
      });
    }
    return NextResponse.json(
      { error: "Failed to create scheduling link", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
} 