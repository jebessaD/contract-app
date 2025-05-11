import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=Missing code or state`
      );
    }

    // Verify the state
    const oauthState = await prisma.hubSpotOAuthState.findUnique({
      where: { state },
    });

    if (!oauthState) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=Invalid state parameter`
      );
    }

    if (new Date() > oauthState.expiresAt) {
      await prisma.hubSpotOAuthState.delete({
        where: { state },
      });
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=State expired`
      );
    }

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
      throw new Error("Failed to exchange code for tokens");
    }

    const tokens = await tokenResponse.json();

    // Get the Hub ID
    const hubResponse = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + tokens.access_token);
    if (!hubResponse.ok) {
      throw new Error("Failed to get Hub ID");
    }

    const hubData = await hubResponse.json();

    // Save the HubSpot account
    await prisma.hubSpotAccount.create({
      data: {
        userId: oauthState.userId,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        hubId: hubData.hub_id,
      },
    });

    // Clean up the OAuth state
    await prisma.hubSpotOAuthState.delete({
      where: { state },
    });

    // Redirect to the settings page with success message
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=Successfully connected to HubSpot`
    );
  } catch (error) {
    console.error("Error in HubSpot callback:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL}/settings?error=Failed to complete HubSpot connection`
    );
  }
} 