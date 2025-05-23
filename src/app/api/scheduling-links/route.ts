import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

interface CustomQuestion {
  question: string;
  required: boolean;
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
      (q: CustomQuestion) => q.question && q.question.trim() !== ""
    );

    if (validQuestions.length === 0) {
      return NextResponse.json(
        { error: "At least one question is required" },
        { status: 400 }
      );
    }

    // Validate usage limit if provided
    if (data.usageLimit !== undefined && data.usageLimit !== null) {
      if (typeof data.usageLimit !== 'number' || data.usageLimit < 1) {
        return NextResponse.json(
          { error: "Usage limit must be a positive number" },
          { status: 400 }
        );
      }
    }

    // Validate expiration date if provided
    if (data.expiresAt) {
      const expirationDate = new Date(data.expiresAt);
      if (isNaN(expirationDate.getTime())) {
        return NextResponse.json(
          { error: "Invalid expiration date format" },
          { status: 400 }
        );
      }
      if (expirationDate < new Date()) {
        return NextResponse.json(
          { error: "Expiration date must be in the future" },
          { status: 400 }
        );
      }
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

    const link = await prisma.schedulingLink.create({
      data: {
        userId: session.user.id,
        slug: slug!,
        meetingLength: data.meetingLength,
        maxAdvanceDays: data.maxAdvanceDays,
        customQuestions: validQuestions,
        usageLimit: data.usageLimit,
        expiresAt: data.expiresAt || null,
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

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Link ID is required" },
        { status: 400 }
      );
    }

    await prisma.schedulingLink.delete({
      where: {
        id,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting scheduling link:", error);
    return NextResponse.json(
      { error: "Failed to delete scheduling link" },
      { status: 500 }
    );
  }
} 