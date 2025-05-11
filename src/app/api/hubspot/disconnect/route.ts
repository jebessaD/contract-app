import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Find the HubSpot account first
    const hubspotAccount = await prisma.hubSpotAccount.findUnique({
      where: { userId: session.user.id },
    });

    if (!hubspotAccount) {
      return NextResponse.json(
        { error: "No HubSpot account found" },
        { status: 404 }
      );
    }

    // Delete the HubSpot account
    await prisma.hubSpotAccount.delete({
      where: { userId: session.user.id },
    });

    // Clean up any existing OAuth states
    await prisma.hubSpotOAuthState.deleteMany({
      where: { userId: session.user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error disconnecting from HubSpot:", error);
    return NextResponse.json(
      { error: "Failed to disconnect from HubSpot" },
      { status: 500 }
    );
  }
} 