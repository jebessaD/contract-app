import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { getHubspotClient } from "@/lib/hubspot";
import type { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/objects/feedback_submissions";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const hubspot = await getHubspotClient(session.user.id);
    // Search for contact by email
    const searchResponse = await hubspot.client.crm.contacts.searchApi.doSearch({
      filterGroups: [
        {
          filters: [
            {
              propertyName: "email",
              operator: "EQ" as FilterOperatorEnum,
              value: email,
            },
          ],
        },
      ],
      properties: ["firstname", "lastname", "email"],
      limit: 1,
    });

    if (!searchResponse.results.length) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const contact = searchResponse.results[0];
    // Fetch notes (engagements) and deals
    const notes = await hubspot.client.crm.objects.notes.basicApi.getPage();
    const deals = await hubspot.client.crm.contacts.basicApi.getPage();

    return NextResponse.json({
      contact,
      notes: notes.results,
      deals: deals.results,
    });
  } catch (error) {
    console.error("HubSpot contact search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
} 