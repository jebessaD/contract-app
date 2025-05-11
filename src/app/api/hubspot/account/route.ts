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

    const hubspotAccount = await prisma.hubSpotAccount.findUnique({
      where: { userId: session.user.id },
    });

    if (!hubspotAccount) {
      return NextResponse.json({ error: "No HubSpot account found" }, { status: 404 });
    }

    return NextResponse.json(hubspotAccount);
  } catch (error) {
    console.error("Error fetching HubSpot account:", error);
    return NextResponse.json(
      { error: "Failed to fetch HubSpot account" },
      { status: 500 }
    );
  }
} 