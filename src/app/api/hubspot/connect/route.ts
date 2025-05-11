import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nanoid } from "nanoid";

export async function GET() {
  try {
    console.log("Starting HubSpot connection process...");
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.error("No authenticated user found");
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user already has a HubSpot account
    const existingAccount = await prisma.hubSpotAccount.findUnique({
      where: { userId: session.user.id },
    });

    if (existingAccount) {
      console.log("User already has a HubSpot account:", { userId: session.user.id });
      return NextResponse.json(
        { error: "HubSpot account already exists" },
        { status: 400 }
      );
    }

    // Clean up any existing OAuth states for this user
    await prisma.hubSpotOAuthState.deleteMany({
      where: { userId: session.user.id },
    });
    console.log("Cleaned up existing OAuth states for user:", session.user.id);

    // Generate a unique state
    const state = nanoid();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10); // State expires in 10 minutes

    console.log("Creating new OAuth state:", { state, expiresAt });

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
    if (!clientId) {
      console.error("HubSpot client ID not configured");
      throw new Error("HubSpot client ID is not configured");
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/hubspot/callback`;
    if (!redirectUri) {
      console.error("App URL not configured");
      throw new Error("App URL is not configured");
    }

    const scopes = "crm.objects.contacts.read%20crm.objects.contacts.write%20crm.schemas.contacts.read%20crm.schemas.contacts.write%20oauth%20timeline";

    const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}`;
    console.log("Generated HubSpot auth URL");

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Error initiating HubSpot connection:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate HubSpot connection" },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check if user already has a HubSpot account
    const existingAccount = await prisma.hubSpotAccount.findUnique({
      where: { userId: session.user.id },
    });

    if (existingAccount) {
      return NextResponse.json(
        { error: "HubSpot account already exists" },
        { status: 400 }
      );
    }

    // Clean up any existing OAuth states for this user
    await prisma.hubSpotOAuthState.deleteMany({
      where: { userId: session.user.id },
    });

    // Generate a unique state
    const state = nanoid();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

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
    if (!clientId) {
      throw new Error("HubSpot client ID is not configured");
    }

    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/hubspot/callback`;
    if (!redirectUri) {
      throw new Error("App URL is not configured");
    }

    const scopes = "crm.objects.contacts.read%20crm.objects.contacts.write%20crm.schemas.contacts.read%20crm.schemas.contacts.write%20oauth%20timeline";

    const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scopes}&state=${state}`;

    return NextResponse.json({ authUrl });
  } catch (error) {
    console.error("Error initiating HubSpot connection:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to initiate HubSpot connection" },
      { status: 500 }
    );
  }
} 