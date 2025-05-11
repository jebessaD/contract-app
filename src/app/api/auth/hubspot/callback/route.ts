import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    console.log("Starting HubSpot callback processing...");
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      console.error("Missing code or state:", { code, state });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=Missing code or state`
      );
    }

    // Verify the state
    const oauthState = await prisma.hubSpotOAuthState.findUnique({
      where: { state },
    });

    if (!oauthState) {
      console.error("Invalid state parameter:", state);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=Invalid state parameter`
      );
    }

    if (new Date() > oauthState.expiresAt) {
      console.error("State expired:", { state, expiresAt: oauthState.expiresAt });
      await prisma.hubSpotOAuthState.delete({
        where: { state },
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=State expired`
      );
    }

    // Check if user already has a HubSpot account
    const existingAccount = await prisma.hubSpotAccount.findUnique({
      where: { userId: oauthState.userId },
    });

    console.log("Exchanging code for tokens...");
    // Exchange the code for tokens
    const tokenResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID!,
        client_secret: process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_SECRET!,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/hubspot/callback`,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Failed to exchange code for tokens:", await tokenResponse.text());
      throw new Error("Failed to exchange code for tokens");
    }

    const tokens = await tokenResponse.json();
    console.log("Successfully obtained tokens");

    // Get the Hub ID
    const hubResponse = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + tokens.access_token);
    if (!hubResponse.ok) {
      console.error("Failed to get Hub ID:", await hubResponse.text());
      throw new Error("Failed to get Hub ID");
    }

    const hubData = await hubResponse.json();
    console.log("Successfully obtained Hub ID");

    if (existingAccount) {
      console.log("Updating existing HubSpot account:", { userId: oauthState.userId });
      // Update the existing account instead of creating a new one
      await prisma.hubSpotAccount.update({
        where: { userId: oauthState.userId },
        data: {
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
          hubId: hubData.hub_id.toString(),
        },
      });
      
      // Clean up the OAuth state
      await prisma.hubSpotOAuthState.delete({
        where: { state },
      });
      
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=Successfully reconnected to HubSpot`
      );
    }

    // Save the HubSpot account
    const hubspotAccount = await prisma.hubSpotAccount.create({
      data: {
        userId: oauthState.userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        hubId: hubData.hub_id.toString(),
      },
    });
    console.log("Successfully created HubSpot account:", { id: hubspotAccount.id });

    // Clean up the OAuth state
    await prisma.hubSpotOAuthState.delete({
      where: { state },
    });
    console.log("Cleaned up OAuth state");

    // Redirect to the settings page with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=Successfully connected to HubSpot`
    );
  } catch (error) {
    console.error("Error in HubSpot callback:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack
      });
    }
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=Failed to complete HubSpot connection: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
} 