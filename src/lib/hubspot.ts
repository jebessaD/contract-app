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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { hubspotAccessToken: true },
  });

  if (!user?.hubspotAccessToken) {
    throw new Error("No HubSpot access token found for user");
  }

  const hubspotClient = new Client({ accessToken: user.hubspotAccessToken });
  return { client: hubspotClient, accessToken: user.hubspotAccessToken };
}

export async function searchHubspotContact(email: string, accessToken: string) {
  try {
    const hubspotClient = new Client({ accessToken });
    const response = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ",
              value: email,
            },
          ],
        },
      ],
    });

    if (response.total === 0) {
      return null;
    }

    const contact = response.results[0];
    return {
      id: contact.id,
      properties: {
        email: contact.properties.email || email,
        firstname: contact.properties.firstname || undefined,
        lastname: contact.properties.lastname || undefined,
        company: contact.properties.company || undefined,
        phone: contact.properties.phone || undefined,
        linkedin_url: contact.properties.linkedin_url || undefined,
      },
    };
  } catch (error) {
    console.error("Error searching HubSpot contact:", error);
    return null;
  }
}

export async function createHubspotContact(
  email: string,
  accessToken: string,
  data: {
    firstname?: string;
    lastname?: string;
    company?: string;
  }
) {
  try {
    const hubspotClient = new Client({ accessToken });
    
    // Create the contact
    const contact = await hubspotClient.crm.contacts.basicApi.create({
      properties: {
        email,
        firstname: data.firstname || "",
        lastname: data.lastname || "",
        company: data.company || "",
        lifecyclestage: "lead",
      },
    });

    // Add a note about the booking
    await hubspotClient.crm.objects.notes.basicApi.create({
      properties: {
        hs_timestamp: Date.now().toString(),
        hs_note_body: `Automatically created after booking on ${new Date().toLocaleDateString()}.`,
        hs_attachment_ids: "",
        hubspot_owner_id: "",
      },
      associations: [
        {
          to: { id: contact.id },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 1,
            },
          ],
        },
      ],
    });

    return {
      id: contact.id,
      properties: contact.properties,
    };
  } catch (error) {
    console.error("Error creating HubSpot contact:", error);
    throw error;
  }
}

export async function addBookingNoteToContact(
  contactId: string,
  accessToken: string,
  bookingDetails: {
    startTime: Date;
    endTime: Date;
    meetingLength: number;
    hostName: string;
  }
) {
  try {
    const hubspotClient = new Client({ accessToken });
    
    await hubspotClient.crm.objects.notes.basicApi.create({
      properties: {
        hs_timestamp: Date.now().toString(),
        hs_note_body: `New meeting scheduled with ${bookingDetails.hostName} on ${bookingDetails.startTime.toLocaleDateString()} at ${bookingDetails.startTime.toLocaleTimeString()} (${bookingDetails.meetingLength} minutes).`,
        hs_attachment_ids: "",
        hubspot_owner_id: "",
      },
      associations: [
        {
          to: { id: contactId },
          types: [
            {
              associationCategory: "HUBSPOT_DEFINED",
              associationTypeId: 1,
            },
          ],
        },
      ],
    });
  } catch (error) {
    console.error("Error adding booking note to HubSpot contact:", error);
    throw error;
  }
}

export async function getContactContext(contactId: string, accessToken: string) {
  try {
    const hubspotClient = new Client({ accessToken });
    
    // Get contact details
    const contact = await hubspotClient.crm.contacts.basicApi.getById(contactId, [
      "email",
      "firstname",
      "lastname",
      "company",
      "lifecyclestage",
    ]);

    // Get recent notes
    const notes = await hubspotClient.crm.objects.notes.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "hs_timestamp",
              operator: "GTE",
              value: (Date.now() - 30 * 24 * 60 * 60 * 1000).toString(), // Last 30 days
            },
          ],
        },
      ],
      sorts: [{ propertyName: "hs_timestamp", direction: "DESCENDING" }],
      properties: ["hs_note_body", "hs_timestamp"],
      limit: 5,
    });

    // Get associated deals
    const deals = await hubspotClient.crm.deals.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "associations.contact",
              operator: "EQ",
              value: contactId,
            },
          ],
        },
      ],
      properties: ["dealname", "amount", "dealstage"],
      limit: 5,
    });

    return {
      contact: contact.properties,
      recentNotes: notes.results.map(note => ({
        body: note.properties.hs_note_body,
        timestamp: new Date(parseInt(note.properties.hs_timestamp)),
      })),
      recentDeals: deals.results.map(deal => ({
        name: deal.properties.dealname,
        amount: deal.properties.amount,
        stage: deal.properties.dealstage,
      })),
    };
  } catch (error) {
    console.error("Error getting contact context:", error);
    return null;
  }
}

export async function updateHubspotContact(
  contactId: string,
  data: {
    email?: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
    linkedin_url?: string;
  },
  accessToken: string
) {
  try {
    const client = new Client({ accessToken });

    const response = await client.crm.contacts.basicApi.update(contactId, {
      properties: data,
    });

    return response;
  } catch (error) {
    console.error("Error updating HubSpot contact:", error);
    throw new Error("Failed to update HubSpot contact");
  }
} 