import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ConnectGoogleAccount from "./ConnectGoogleAccount";
import { prisma } from "@/lib/prisma";
import type { GoogleAccount, User } from "@prisma/client";
import HubspotSettings from "./hubspot-settings";
import SchedulingWindows from "./scheduling-windows";
import SchedulingLinks from "./scheduling-links";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: { error?: string; success?: string };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  const googleAccounts = await prisma.googleAccount.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      isPrimary: "desc",
    },
  });

  if (!session.user.email) {
    redirect("/api/auth/signin");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      hubspotAccount: true,
      schedulingWindows: true,
    },
  }) as (User & { hubspotAccount: any; schedulingWindows: any[] }) | null;

  if (!user) {
    redirect("/auth/signin");
  }

  const hubspotAccount = user.hubspotAccount;

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>
          
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Connected Google Accounts
          </h3>
          <div className="mt-5">
            <div className="space-y-4">
              {googleAccounts.map((account: GoogleAccount) => (
                <div
                  key={account.id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <img
                        className="h-10 w-10 rounded-full"
                        src={`https://www.gravatar.com/avatar/${account.email}?d=mp`}
                        alt=""
                      />
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">
                        {account.email}
                      </div>
                      {account.isPrimary && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Primary
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    {!account.isPrimary && (
                      <button
                        type="button"
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Set as Primary
                      </button>
                    )}
                    <button
                      type="button"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Disconnect
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <ConnectGoogleAccount />
            </div>
          </div>
        </div>
      </div>

      {searchParams.error && (
        <div className="p-4 bg-red-50 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{searchParams.error}</p>
            </div>
          </div>
        </div>
      )}

      {searchParams.success && (
        <div className="p-4 bg-green-50 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700">{searchParams.success}</p>
            </div>
          </div>
        </div>
      )}

      <HubspotSettings 
        isConnected={!!hubspotAccount}
        hubId={hubspotAccount?.hubId}
      />

      <SchedulingWindows initialWindows={user.schedulingWindows} />

      <SchedulingLinks />
    </div>
  );
} 