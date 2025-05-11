import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const windows = await prisma.schedulingWindow.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    return NextResponse.json(windows);
  } catch (error) {
    console.error("Error fetching scheduling windows:", error);
    return NextResponse.json(
      { error: "Failed to fetch scheduling windows" },
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
    const { windows } = data;

    if (!Array.isArray(windows)) {
      return NextResponse.json(
        { error: "Windows must be an array" },
        { status: 400 }
      );
    }

    // Delete existing windows
    await prisma.schedulingWindow.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    // Create new windows
    const createdWindows = await Promise.all(
      windows.map((window) =>
        prisma.schedulingWindow.create({
          data: {
            startTime: window.startTime,
            endTime: window.endTime,
            weekdays: window.weekdays,
            userId: session.user.id,
          },
        })
      )
    );

    return NextResponse.json(createdWindows);
  } catch (error) {
    console.error("Error saving scheduling windows:", error);
    return NextResponse.json(
      { error: "Failed to save scheduling windows" },
      { status: 500 }
    );
  }
} 