import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";

export async function GET() {
  try {
    console.log("Getting HubSpot auth URL...");
    
    const session = await getServerSession(authOptions);
    console.log("Session:", { 
      hasSession: !!session, 
      hasUser: !!session?.user,
      userEmail: session?.user?.email 
    });

    if (!session?.user?.email) {
      console.log("No session or user email found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    console.log("User from database:", { 
      found: !!user,
      userId: user?.id 
    });

    if (!user) {
      console.log("User not found in database");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Generate a random state
    const state = randomBytes(32).toString('hex');
    console.log("Generated state:", state);

    try {
      // Store state in database
      await prisma.hubSpotOAuthState.create({
        data: {
          userId: user.id,
          state,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        },
      });
      console.log("State stored in database");
    } catch (dbError) {
      console.error("Error storing state in database:", dbError);
      throw new Error("Failed to store OAuth state");
    }

    const clientId = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID;
    if (!clientId) {
      console.error("HubSpot client ID not configured");
      throw new Error("HubSpot client ID is not configured");
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_AUTH_URL}/api/auth/hubspot/callback`;
    if (!redirectUri) {
      console.error("Auth URL not configured");
      throw new Error("Auth URL is not configured");
    }

    const scopes = [
      'crm.objects.contacts.read',
      'crm.objects.contacts.write',
      'crm.schemas.contacts.read',
      'crm.schemas.contacts.write',
      'oauth',
      'timeline'
    ].join(' ');

    const authUrl = `https://app-eu1.hubspot.com/oauth/146180408/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`;
    console.log("Generated auth URL");

    return NextResponse.json({ url: authUrl });
  } catch (error) {
    console.error("Error generating HubSpot auth URL:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate auth URL" },
      { status: 500 }
    );
  }
} 