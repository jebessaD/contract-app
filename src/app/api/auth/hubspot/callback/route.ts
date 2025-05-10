import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { exchangeCodeForToken } from "@/lib/hubspot";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.redirect("/auth/signin");
    }

    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");

    if (!code || !state) {
      return NextResponse.redirect("/settings?error=hubspot_auth_failed");
    }

    const tokens = await exchangeCodeForToken(code);

    // Get user info from HubSpot
    const response = await fetch("https://api.hubapi.com/oauth/v1/access-tokens/" + tokens.access_token);
    const userInfo = await response.json();

    // Store the tokens
    await prisma.hubspotAccount.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        hubId: userInfo.hub_id,
      },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        hubId: userInfo.hub_id,
      },
    });

    return NextResponse.redirect("/settings?success=hubspot_connected");
  } catch (error) {
    console.error("HubSpot callback error:", error);
    return NextResponse.redirect("/settings?error=hubspot_auth_failed");
  }
} 