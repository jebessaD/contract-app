import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_AUTH_URL}/settings?error=${encodeURIComponent(error)}`
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_AUTH_URL}/settings?error=${encodeURIComponent("Missing code or state")}`
      );
    }

    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_AUTH_URL}/settings?error=${encodeURIComponent("Not authenticated")}`
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_AUTH_URL}/settings?error=${encodeURIComponent("User not found")}`
      );
    }

    // Verify state
    const oauthState = await prisma.hubSpotOAuthState.findFirst({
      where: {
        userId: user.id,
        state,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!oauthState) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_AUTH_URL}/settings?error=${encodeURIComponent("Invalid state parameter")}`
      );
    }

    const clientId = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID;
    const clientSecret = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_SECRET;
    const redirectUri = `${process.env.NEXT_PUBLIC_AUTH_URL}/api/auth/hubspot/callback`;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error("Missing required environment variables");
    }

    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error("Token exchange error:", error);
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_AUTH_URL}/settings?error=${encodeURIComponent("Failed to exchange code for tokens")}`
      );
    }

    const tokens = await tokenResponse.json();

    // Get Hub ID
    const hubResponse = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + tokens.access_token);
    if (!hubResponse.ok) {
      return NextResponse.redirect(
        `${process.env.NEXT_PUBLIC_AUTH_URL}/settings?error=${encodeURIComponent("Failed to get Hub ID")}`
      );
    }

    const hubData = await hubResponse.json();
    console.log("HubSpot data received:", { hubId: hubData.hub_id });

    // Convert hubId to string and ensure it exists
    const hubId = String(hubData.hub_id);
    if (!hubId) {
      throw new Error("Invalid Hub ID received from HubSpot");
    }

    // Save tokens and Hub ID
    await prisma.hubSpotAccount.upsert({
      where: {
        userId: user.id,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        hubId,
      },
      create: {
        userId: user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        hubId,
      },
    });

    // Clean up used state
    await prisma.hubSpotOAuthState.delete({
      where: {
        id: oauthState.id,
      },
    });

    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_AUTH_URL}/settings?success=${encodeURIComponent("Successfully connected to HubSpot")}`
    );
  } catch (error) {
    console.error("HubSpot callback error:", error);
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_AUTH_URL}/settings?error=${encodeURIComponent(error instanceof Error ? error.message : "An unexpected error occurred")}`
    );
  }
} 