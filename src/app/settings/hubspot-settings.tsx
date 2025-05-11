"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface HubspotSettingsProps {
  isConnected: boolean;
  hubId?: string;
}

export default function HubspotSettings({ isConnected, hubId }: HubspotSettingsProps) {
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [hubspotAccount, setHubspotAccount] = useState<any>(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  useEffect(() => {
    const fetchHubspotAccount = async () => {
      try {
        const response = await fetch("/api/hubspot/account");
        if (!response.ok) {
          if (response.status === 404) {
            setHubspotAccount(null);
          } else {
            throw new Error("Failed to fetch HubSpot account");
          }
        } else {
          const data = await response.json();
          setHubspotAccount(data);
        }
      } catch (error) {
        console.error("Error fetching HubSpot account:", error);
        toast.error("Failed to load HubSpot account");
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchHubspotAccount();
    }
  }, [session?.user?.id]);

  const handleDisconnect = async () => {
    if (!confirm("Are you sure you want to disconnect your HubSpot account?")) {
      return;
    }

    setIsDisconnecting(true);
    try {
      const response = await fetch("/api/hubspot/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to disconnect from HubSpot");
      }

      setHubspotAccount(null);
      toast.success("Successfully disconnected from HubSpot");
    } catch (error) {
      console.error("Error disconnecting from HubSpot:", error);
      toast.error(error instanceof Error ? error.message : "Failed to disconnect from HubSpot");
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex justify-center py-4">
        <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      </div>
    );
  }

  if (!session?.user?.id) {
    return (
      <div className="text-center py-4 text-gray-500">
        Not authenticated
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            HubSpot Integration
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Connect your HubSpot account to sync contacts and deals.
          </p>

          {hubspotAccount ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Connected to HubSpot
                  </p>
                  <p className="text-sm text-gray-500">
                    Hub ID: {hubspotAccount.hubId}
                  </p>
                </div>
                <button
                  onClick={handleDisconnect}
                  disabled={isDisconnecting}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDisconnecting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-red-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Disconnecting...
                    </>
                  ) : (
                    "Disconnect"
                  )}
                </button>
              </div>
            </div>
          ) : (
            <a
              href="/api/hubspot/connect"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Connect HubSpot
            </a>
          )}
        </div>
      </div>
    </div>
  );
} 