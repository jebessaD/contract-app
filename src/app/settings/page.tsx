import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import ConnectGoogleAccount from "./ConnectGoogleAccount";
import { prisma } from "@/lib/prisma";
import type { GoogleAccount } from "@prisma/client";

export default async function SettingsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const googleAccounts = await prisma.googleAccount.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      isPrimary: "desc",
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
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
        </div>
      </div>
    </div>
  );
} 