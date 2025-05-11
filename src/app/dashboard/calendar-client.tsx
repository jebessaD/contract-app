"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";

export function CalendarClient() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  const refreshCalendar = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await router.refresh();
      setLastSync(new Date());
    } catch (error) {
      console.error("Error refreshing calendar:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [router]);

  useEffect(() => {
    refreshCalendar();
  }, [refreshCalendar]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(refreshCalendar, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshCalendar]);

  return (
    <div className="flex items-center space-x-4">
      <button
        onClick={refreshCalendar}
        disabled={isRefreshing}
        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
      >
        {isRefreshing ? (
          <>
            <svg
              className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            Refreshing...
          </>
        ) : (
          <>
            <svg
              className="-ml-1 mr-2 h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </>
        )}
      </button>
      <span className="text-sm text-gray-500">
        Last synced: {lastSync.toLocaleTimeString()}
      </span>
    </div>
  );
} 