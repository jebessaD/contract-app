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

    // Generate a unique state
    const state = nanoid();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // State expires in 10 minutes

    // Save the state
    await prisma.hubSpotOAuthState.create({
      data: {
        userId: session.user.id,
        state,
        expiresAt,
      },
    });

    // Construct the HubSpot OAuth URL
    const clientId = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID;
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/hubspot/callback`;
    const scopes = "crm.objects.contacts.read%20crm.objects.contacts.write%20crm.schemas.contacts.read%20crm.schemas.contacts.write%20oauth%20timeline";

    const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating HubSpot connection:", error);
    return NextResponse.json(
      { error: "Failed to initiate HubSpot connection" },
      { status: 500 }
    );
  }
} 