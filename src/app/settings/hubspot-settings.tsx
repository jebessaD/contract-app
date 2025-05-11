"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

interface HubspotSettingsProps {
  isConnected: boolean;
  hubId: string | null;
}

export default function HubspotSettings({ isConnected, hubId }: HubspotSettingsProps) {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const handleConnect = async () => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to connect HubSpot");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/hubspot/connect", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to connect HubSpot");
      }

      const data = await response.json();
      window.location.href = data.authUrl;
    } catch (error) {
      console.error("Error connecting to HubSpot:", error);
      toast.error("Failed to connect HubSpot");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to disconnect HubSpot");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/hubspot/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to disconnect HubSpot");
      }

      toast.success("Successfully disconnected from HubSpot");
      window.location.reload();
    } catch (error) {
      console.error("Error disconnecting from HubSpot:", error);
      toast.error("Failed to disconnect HubSpot");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          HubSpot Integration
        </h3>
        <div className="mt-2 max-w-xl text-sm text-gray-500">
          <p>
            Connect your HubSpot account to automatically sync contacts and meetings.
          </p>
        </div>
        <div className="mt-5">
          {isConnected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg
                    className="h-6 w-6 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">
                    Connected to HubSpot
                  </p>
                  {hubId && (
                    <p className="text-sm text-gray-500">Hub ID: {hubId}</p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
              >
                {isLoading ? "Disconnecting..." : "Disconnect"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleConnect}
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoading ? "Connecting..." : "Connect HubSpot"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
} 