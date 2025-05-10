import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { getHubspotClient } from "@/lib/hubspot";

export async function GET() {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const client = await getHubspotClient(session.user.id);
    
    // Test the connection by making a simple API call
    const response = await client.crm.contacts.basicApi.getPage(1);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("HubSpot test connection error:", error);
    return NextResponse.json(
      { error: "Failed to test connection" },
      { status: 500 }
    );
  }
} 