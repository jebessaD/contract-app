import { Client } from "@hubspot/api-client";
import { prisma } from "./prisma";
import { FilterOperatorEnum, AssociationSpecAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/objects";


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
    "crm.objects.deals.read",
    "crm.schemas.deals.read",
    "crm.objects.notes.read",
    "crm.objects.notes.write",
    "crm.objects.notes.custom.read",
    "crm.objects.notes.custom.write",
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
    console.log("🔄 Starting HubSpot token refresh process");
    console.log("Using refresh token:", refreshToken.substring(0, 10) + "...");
    
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
      const errorText = await response.text();
      console.error("❌ HubSpot token refresh failed:", {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
        headers: Object.fromEntries(response.headers.entries())
      });
      throw new Error(`Failed to refresh token: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ HubSpot token refresh successful:", {
      access_token: data.access_token ? data.access_token.substring(0, 10) + "..." : "missing",
      refresh_token: data.refresh_token ? data.refresh_token.substring(0, 10) + "..." : "missing",
      expires_in: data.expires_in,
      token_type: data.token_type
    });

    return data;
  } catch (error) {
    console.error("❌ HubSpot token refresh error:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
    }
    throw error;
  }
}

export async function getHubspotClient(userId: string) {
  try {
    console.log("🔑 Getting HubSpot client for user:", userId);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { hubspotAccount: true },
    });

    if (!user?.hubspotAccount?.accessToken) {
      console.error("❌ No HubSpot access token found for user:", userId);
      throw new Error("No HubSpot access token found for user");
    }

    // Check if token is expired
    const tokenExpiry = new Date(user.hubspotAccount.expiresAt || 0);
    const now = new Date();
    const isExpired = tokenExpiry <= now;

    console.log("🔍 Token state:", {
      userId,
      hasAccessToken: !!user.hubspotAccount.accessToken,
      hasRefreshToken: !!user.hubspotAccount.refreshToken,
      tokenExpiry: tokenExpiry.toISOString(),
      currentTime: now.toISOString(),
      isExpired,
      timeUntilExpiry: Math.floor((tokenExpiry.getTime() - now.getTime()) / 1000) + " seconds"
    });

    if (isExpired) {
      console.log("🔄 HubSpot token expired, refreshing...");
      if (!user.hubspotAccount.refreshToken) {
        console.error("❌ No refresh token available");
        throw new Error("No refresh token available");
      }

      try {
        const newTokens = await refreshHubspotToken(user.hubspotAccount.refreshToken);
        
        // Update the tokens in the database
        await prisma.hubSpotAccount.update({
          where: { id: user.hubspotAccount.id },
          data: {
            accessToken: newTokens.access_token,
            refreshToken: newTokens.refresh_token,
            expiresAt: new Date(Date.now() + newTokens.expires_in * 1000),
          },
        });

        console.log("✅ Successfully refreshed HubSpot token");
        return { 
          client: new Client({ accessToken: newTokens.access_token }), 
          accessToken: newTokens.access_token 
        };
      } catch (error) {
        console.error("❌ Failed to refresh HubSpot token:", error);
        throw new Error("Failed to refresh HubSpot token");
      }
    }

    console.log("✅ Using existing HubSpot token");
    return { 
      client: new Client({ accessToken: user.hubspotAccount.accessToken }), 
      accessToken: user.hubspotAccount.accessToken 
    };
  } catch (error) {
    console.error("❌ Error getting HubSpot client:", error);
    throw error;
  }
}

export async function searchHubspotContact(email: string, accessToken: string) {
  try {
    console.log("🔍 Searching HubSpot contact for email:", email);
    
    // Create client directly with the provided access token
    const hubspotClient = new Client({ accessToken });
    
    // Search for contact by email
    const response = await hubspotClient.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: FilterOperatorEnum.Eq,
              value: email,
            },
          ],
        },
      ],
      properties: [
        "email",
        "firstname",
        "lastname",
        "company",
        "phone",
        "linkedin_url",
        "lifecyclestage",
        "hs_lead_status",
        "createdate",
        "lastmodifieddate"
      ],
    });

    console.log("📊 HubSpot API Response:", {
      total: response.total,
      paging: response.paging,
      results: response.results.map(r => ({
        id: r.id,
        email: r.properties.email,
        name: `${r.properties.firstname || ''} ${r.properties.lastname || ''}`.trim(),
        company: r.properties.company,
        created: r.properties.createdate,
        modified: r.properties.lastmodifieddate
      }))
    });

    if (response.total === 0) {
      console.log("❌ No contact found for email:", email);
      return null;
    }

    const contact = response.results[0];
    console.log("✅ Found existing contact:", {
      id: contact.id,
      email: contact.properties.email,
      name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim(),
      company: contact.properties.company
    });
    
    let notes: { total: number; results: Array<{ properties: { hs_note_body?: string; hs_timestamp?: string } }> } = { total: 0, results: [] };
    let deals: { total: number; results: Array<{ properties: { dealname?: string; amount?: string; dealstage?: string; closedate?: string } }> } = { total: 0, results: [] };

    try {
      // Get associated notes
      const notesResponse = await hubspotClient.crm.objects.notes.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "associations.contact",
                operator: FilterOperatorEnum.Eq,
                value: contact.id,
              },
            ],
          },
        ],
        properties: ["hs_note_body", "hs_timestamp"],
        limit: 10,
      });
      notes = {
        total: notesResponse.total,
        results: notesResponse.results.map((note: { properties?: { hs_note_body?: string; hs_timestamp?: string } }) => ({
          properties: {
            hs_note_body: note.properties?.hs_note_body,
            hs_timestamp: note.properties?.hs_timestamp
          }
        }))
      };
    } catch (error: unknown) {
      console.warn("⚠️ Could not fetch notes:", error instanceof Error ? error.message : String(error));
    }

    try {
      // Get associated deals
      const dealsResponse = await hubspotClient.crm.deals.searchApi.doSearch({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "associations.contact",
                operator: FilterOperatorEnum.Eq,
                value: contact.id,
              },
            ],
          },
        ],
        properties: ["dealname", "amount", "dealstage", "closedate"],
        limit: 5,
      });
      deals = dealsResponse;
    } catch (error: unknown) {
      console.warn("⚠️ Could not fetch deals (missing scope):", error instanceof Error ? error.message : String(error));
    }

    console.log("📝 Contact context:", {
      contactId: contact.id,
      notesCount: notes.total,
      dealsCount: deals.total,
      recentNotes: notes.results.map(note => ({
        body: note.properties.hs_note_body || '',
        timestamp: new Date(parseInt(note.properties.hs_timestamp || Date.now().toString())).toISOString()
      })),
      recentDeals: deals.results.map(deal => ({
        name: deal.properties.dealname,
        stage: deal.properties.dealstage
      }))
    });

    return {
      id: contact.id,
      properties: {
        email: contact.properties.email || email,
        firstname: contact.properties.firstname || undefined,
        lastname: contact.properties.lastname || undefined,
        company: contact.properties.company || undefined,
        phone: contact.properties.phone || undefined,
        linkedin_url: contact.properties.linkedin_url || undefined,
        lifecyclestage: contact.properties.lifecyclestage || undefined,
        hs_lead_status: contact.properties.hs_lead_status || undefined,
        createdate: contact.properties.createdate,
        lastmodifieddate: contact.properties.lastmodifieddate
      },
      notes: notes.results.map(note => ({
        body: note.properties.hs_note_body || '',
        timestamp: new Date(parseInt(note.properties.hs_timestamp || Date.now().toString())).toISOString()
      })),
      deals: deals.results.map(deal => ({
        name: deal.properties.dealname,
        amount: deal.properties.amount,
        stage: deal.properties.dealstage,
        closeDate: deal.properties.closedate,
      }))
    };
  } catch (error) {
    console.error("❌ Error searching HubSpot contact:", error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        email
      });
    }
    return null;
  }
}

export async function createHubspotContact(
  email: string,
  firstName: string,
  lastName: string,
  company: string,
  accessToken: string
) {
  try {
    console.log("📝 Creating new HubSpot contact:", {
      email,
      firstName,
      lastName,
      company
    });

    const hubspotClient = new Client({ accessToken });

    // First check if contact already exists
    const existingContact = await searchHubspotContact(email, accessToken);
    if (existingContact) {
      console.log("⚠️ Contact already exists, updating instead:", {
        id: existingContact.id,
        email: existingContact.properties.email
      });

      // Update existing contact
      const updateResponse = await hubspotClient.crm.contacts.basicApi.update(
        existingContact.id,
        {
          properties: {
            firstname: firstName,
            lastname: lastName,
            company: company,
            lastmodifieddate: new Date().toISOString()
          }
        }
      );

      console.log("✅ Updated existing contact:", {
        id: updateResponse.id,
        email: updateResponse.properties.email,
        name: `${updateResponse.properties.firstname || ''} ${updateResponse.properties.lastname || ''}`.trim(),
        company: updateResponse.properties.company
      });

      return updateResponse;
    }

    // Create new contact
    const response = await hubspotClient.crm.contacts.basicApi.create({
      properties: {
        email,
        firstname: firstName,
        lastname: lastName,
        company,
        createdate: new Date().toISOString(),
        lastmodifieddate: new Date().toISOString()
      }
    });

    console.log("✅ Created new contact:", {
      id: response.id,
      email: response.properties.email,
      name: `${response.properties.firstname || ''} ${response.properties.lastname || ''}`.trim(),
      company: response.properties.company
    });

    return response;
  } catch (error) {
    console.error("❌ Error creating HubSpot contact:", error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        contact: { email, firstName, lastName, company }
      });
    }
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
    clientEmail: string;
    qaResponses?: Record<string, string>;
  }
) {
  try {
    console.log("📝 Adding booking note to HubSpot contact:", {
      contactId,
      clientEmail: bookingDetails.clientEmail,
      startTime: bookingDetails.startTime.toISOString(),
      endTime: bookingDetails.endTime.toISOString(),
      hostName: bookingDetails.hostName
    });

    // Create client directly with the provided access token
    const hubspotClient = new Client({ accessToken });
    
    // Format the note content
    const noteContent = [
      `Client: ${bookingDetails.clientEmail}`,
      `Time: ${bookingDetails.startTime.toLocaleString()} - ${bookingDetails.endTime.toLocaleString()}`,
      `Duration: ${bookingDetails.meetingLength} minutes`,
      `Host: ${bookingDetails.hostName}`,
    ];

    // Add Q&A responses if available
    if (bookingDetails.qaResponses && Object.keys(bookingDetails.qaResponses).length > 0) {
      noteContent.push("\nQ&A Responses:");
      Object.entries(bookingDetails.qaResponses).forEach(([question, answer]) => {
        noteContent.push(`${question}: ${answer}`);
      });
    }

    // Get contact context for the note
    const contactContext = await getContactContext(contactId, accessToken);
    if (contactContext) {
      noteContent.push("\nCRM Context:");
      if (contactContext.recentNotes.length > 0) {
        noteContent.push("Recent Notes:");
        contactContext.recentNotes.slice(0, 3).forEach(note => {
          noteContent.push(`- ${note.body} (${note.timestamp.toLocaleDateString()})`);
        });
      }
      if (contactContext.recentDeals.length > 0) {
        noteContent.push("Recent Deals:");
        contactContext.recentDeals.forEach(deal => {
          noteContent.push(`- ${deal.name} (${deal.stage})`);
        });
      }
    } else {
      noteContent.push("\nNo CRM context found");
    }

    console.log("📋 Prepared note content:", {
      contentLength: noteContent.join("\n").length,
      sections: noteContent.length,
      hasQAResponses: !!bookingDetails.qaResponses,
      hasContactContext: !!contactContext
    });

    // Create the note
    const noteResponse = await hubspotClient.crm.objects.notes.basicApi.create({
      properties: {
        hs_timestamp: Date.now().toString(),
        hs_note_body: noteContent.join("\n"),
        hs_attachment_ids: "",
        hubspot_owner_id: "",
      },
      associations: [
        {
          to: { id: contactId },
          types: [
            {
              associationCategory: AssociationSpecAssociationCategoryEnum.HubspotDefined,
              associationTypeId: 1,
            },
          ],
        },
      ],
    });

    console.log("✅ Successfully added booking note to contact:", {
      noteId: noteResponse.id,
      contactId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("❌ Error adding booking note to HubSpot contact:", error);
    // Log detailed error information
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        contactId,
        bookingDetails: {
          ...bookingDetails,
          startTime: bookingDetails.startTime.toISOString(),
          endTime: bookingDetails.endTime.toISOString()
        }
      });
    }
    // Don't throw the error to allow the booking flow to continue
    console.warn("Continuing booking flow despite HubSpot note creation failure");
  }
}

export async function getContactContext(contactId: string, accessToken: string) {
  try {
    console.log("🔍 Getting contact context for:", contactId);
    const hubspotClient = new Client({ accessToken });
    
    // Get contact details
    const contact = await hubspotClient.crm.contacts.basicApi.getById(contactId, [
      "email",
      "firstname",
      "lastname",
      "company",
      "lifecyclestage",
    ]);

    console.log("✅ Found contact:", {
      id: contact.id,
      email: contact.properties.email,
      name: `${contact.properties.firstname || ''} ${contact.properties.lastname || ''}`.trim()
    });

    // Get recent notes
    const notes = await hubspotClient.crm.objects.notes.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "associations.contact",
              operator: FilterOperatorEnum.Eq,
              value: contactId,
            },
          ],
        },
      ],
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
              operator: FilterOperatorEnum.Eq,
              value: contactId,
            },
          ],
        },
      ],
      properties: ["dealname", "amount", "dealstage"],
      limit: 5,
    });

    console.log("📝 Contact context retrieved:", {
      contactId,
      notesCount: notes.total,
      dealsCount: deals.total
    });

    return {
      contact: contact.properties,
      recentNotes: notes.results.map((note: { properties?: { hs_note_body?: string; hs_timestamp?: string } }) => ({
        body: note.properties?.hs_note_body,
        timestamp: new Date(parseInt(note.properties?.hs_timestamp || Date.now().toString())),
      })),
      recentDeals: deals.results.map(deal => ({
        name: deal.properties.dealname,
        amount: deal.properties.amount,
        stage: deal.properties.dealstage,
      })),
    };
  } catch (error) {
    console.error("❌ Error getting contact context:", error);
    if (error instanceof Error) {
      console.error("Error details:", {
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        contactId
      });
    }
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