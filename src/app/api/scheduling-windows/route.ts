import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const windows = await prisma.schedulingWindow.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "asc",
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
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { windows } = await request.json();

    // Delete existing windows
    await prisma.schedulingWindow.deleteMany({
      where: {
        userId: session.user.id,
      },
    });

    // Create new windows one by one to get their IDs
    const createdWindows = await Promise.all(
      windows.map((window: any) =>
        prisma.schedulingWindow.create({
          data: {
            userId: session.user.id,
            startTime: window.startTime,
            endTime: window.endTime,
            weekdays: window.weekdays,
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