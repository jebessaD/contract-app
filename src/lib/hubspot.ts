import { Client } from "@hubspot/api-client";
import { prisma } from "./prisma";

// Debug logging
console.log("Environment variables:", {
  NEXT_PUBLIC_HUBSPOT_CLIENT_ID: process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID,
  NEXT_PUBLIC_HUBSPOT_CLIENT_SECRET: process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_SECRET,
  NEXT_PUBLIC_AUTH_URL: process.env.NEXT_PUBLIC_AUTH_URL,
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
});

if (!process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID) {
  throw new Error("NEXT_PUBLIC_HUBSPOT_CLIENT_ID is not defined in environment variables");
}

if (!process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_SECRET) {
  throw new Error("NEXT_PUBLIC_HUBSPOT_CLIENT_SECRET is not defined in environment variables");
}

const HUBSPOT_CLIENT_ID = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_ID;
const HUBSPOT_CLIENT_SECRET = process.env.NEXT_PUBLIC_HUBSPOT_CLIENT_SECRET;
const HUBSPOT_REDIRECT_URI = `${process.env.NEXT_PUBLIC_AUTH_URL || 'http://localhost:3000'}/api/auth/hubspot/callback`;

export const hubspotClient = new Client();

export async function getHubspotAuthUrl(state: string) {
  if (!HUBSPOT_CLIENT_ID || !HUBSPOT_REDIRECT_URI) {
    throw new Error("HubSpot configuration is incomplete");
  }

  const scopes = [
    "crm.objects.contacts.read",
    "crm.objects.contacts.write",
    "crm.schemas.contacts.read",
    "crm.schemas.contacts.write",
    "oauth",
    "timeline"
  ];

  // Store state in session storage
  if (typeof window !== 'undefined') {
    sessionStorage.setItem('hubspot_oauth_state', state);
  }

  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${HUBSPOT_CLIENT_ID}&redirect_uri=${encodeURIComponent(HUBSPOT_REDIRECT_URI)}&scope=${scopes.join(" ")}&state=${state}`;
  return authUrl;
}

export async function exchangeCodeForToken(code: string) {
  try {
    console.log("Exchanging code for token...");
    const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
        redirect_uri: HUBSPOT_REDIRECT_URI,
        code,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("HubSpot token exchange error:", error);
      throw new Error(`Failed to exchange code for token: ${error}`);
    }

    const data = await response.json();
    console.log("Token exchange successful");
    return data;
  } catch (error) {
    console.error("HubSpot token exchange error:", error);
    throw error;
  }
}

export async function refreshHubspotToken(refreshToken: string) {
  try {
    const response = await fetch("https://api.hubapi.com/oauth/v1/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        client_id: HUBSPOT_CLIENT_ID,
        client_secret: HUBSPOT_CLIENT_SECRET,
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("HubSpot token refresh error:", error);
      throw new Error(`Failed to refresh token: ${error}`);
    }

    return response.json();
  } catch (error) {
    console.error("HubSpot token refresh error:", error);
    throw error;
  }
}

export async function getHubspotClient(userId: string) {
  const hubspotAccount = await prisma.hubSpotAccount.findUnique({
    where: { userId },
  });

  if (!hubspotAccount) {
    throw new Error("No HubSpot account found");
  }

  // Check if token needs refresh
  if (new Date() >= hubspotAccount.expiresAt) {
    const tokens = await refreshHubspotToken(hubspotAccount.refreshToken);
    
    await prisma.hubSpotAccount.update({
      where: { id: hubspotAccount.id },
      data: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    });

    hubspotClient.setAccessToken(tokens.access_token);
  } else {
    hubspotClient.setAccessToken(hubspotAccount.accessToken);
  }

  return hubspotClient;
} 