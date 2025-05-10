import { Client } from "@hubspot/api-client";
import { prisma } from "./prisma";

const HUBSPOT_CLIENT_ID = process.env.HUBSPOT_CLIENT_ID!;
const HUBSPOT_CLIENT_SECRET = process.env.HUBSPOT_CLIENT_SECRET!;
const HUBSPOT_REDIRECT_URI = `${process.env.NEXTAUTH_URL}/api/auth/hubspot/callback`;

export const hubspotClient = new Client();

export async function getHubspotAuthUrl(state: string) {
  const scopes = ["contacts", "crm.objects.contacts.read", "crm.objects.contacts.write"];
  const authUrl = `https://app.hubspot.com/oauth/authorize?client_id=${HUBSPOT_CLIENT_ID}&redirect_uri=${HUBSPOT_REDIRECT_URI}&scope=${scopes.join(" ")}&state=${state}`;
  return authUrl;
}

export async function exchangeCodeForToken(code: string) {
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
    throw new Error("Failed to exchange code for token");
  }

  return response.json();
}

export async function refreshHubspotToken(refreshToken: string) {
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
    throw new Error("Failed to refresh token");
  }

  return response.json();
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