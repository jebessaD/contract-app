import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google-calendar";
import { CalendarClient } from "./calendar-client";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const { events, timeSlots } = await getCalendarEvents(session.user.id);

  return (
    <div className="space-y-6">
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Upcoming Events
            </h3>
            <CalendarClient />
          </div>
          <div className="mt-6">
            {events.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-gray-500">
                  No upcoming events found. Make sure you have enabled the Google Calendar API in your Google Cloud Console.
                </p>
                <a
                  href="https://console.cloud.google.com/apis/library/calendar-json.googleapis.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Enable Google Calendar API
                </a>
              </div>
            ) : (
              <div className="flow-root">
                <ul role="list" className="-my-5 divide-y divide-gray-200">
                  {events.map((event) => (
                    <li key={event.id} className="py-4">
                      <div className="flex items-center space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                            <svg
                              className="h-6 w-6 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {event.summary}
                          </p>
                          <p className="text-sm text-gray-500">
                            {new Date(
                              event.start?.dateTime || event.start?.date || new Date()
                            ).toLocaleString()}
                          </p>
                          {event.location && (
                            <p className="text-sm text-gray-500 truncate">
                              📍 {event.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Availability Calendar
          </h3>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() + i);
              return (
                <div key={i} className="text-center">
                  <div className="text-sm font-medium text-gray-900">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div className="text-xs text-gray-500">
                    {date.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {Array.from({ length: 7 }, (_, dayIndex) => (
              <div key={dayIndex} className="space-y-1">
                {Array.from({ length: 24 }, (_, hourIndex) => {
                  const slot = timeSlots.find(
                    (slot) =>
                      slot.start.getDate() === new Date().getDate() + dayIndex &&
                      slot.start.getHours() === hourIndex
                  );
                  return (
                    <div
                      key={hourIndex}
                      className={`h-6 rounded ${
                        slot?.isBusy ? "bg-red-100" : "bg-green-100"
                      }`}
                      title={`${hourIndex}:00 - ${hourIndex + 1}:00`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <div className="mt-4 flex items-center justify-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <div className="w-4 h-4 bg-green-100 rounded mr-2" />
              Available
            </div>
            <div className="flex items-center">
              <div className="w-4 h-4 bg-red-100 rounded mr-2" />
              Busy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 