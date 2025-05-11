import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getHubspotClient } from "@/lib/hubspot";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const hubspotAccount = await prisma.hubSpotAccount.findUnique({
      where: { userId: session.user.id },
    });

    if (!hubspotAccount) {
      return NextResponse.json(
        { error: "No HubSpot account found" },
        { status: 404 }
      );
    }
    const { client: hubspotClient } = await getHubspotClient(hubspotAccount.accessToken);
    await hubspotClient.crm.owners.ownersApi.getPage();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error testing HubSpot connection:", error);
    return NextResponse.json(
      { error: "Failed to test HubSpot connection" },
      { status: 500 }
    );
  }
} 