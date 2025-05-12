import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getCalendarEvents } from "@/lib/google-calendar";
import { CalendarClient } from "./calendar-client";
import { getUserBookings } from "@/lib/bookings";
import { BookingDetails } from "./booking-details";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  const { events, timeSlots } = await getCalendarEvents(session.user.id);
  const bookings = await getUserBookings(session.user.id);

  return (
    <div className="mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upcoming Events Section */}
        <div className="bg-white shadow-sm rounded-md overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Upcoming Meetings</h2>
              <CalendarClient />
            </div>
            <div className="space-y-4">
              {events.length === 0 && bookings.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
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
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No meetings scheduled</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by scheduling your first meeting.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Display Calendar Events */}
                  {events.map((event) => (
                    <div
                      key={event.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-start space-x-4">
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
                          <h3 className="text-lg font-semibold text-gray-900">
                            {event.summary}
                          </h3>
                          <div className="mt-1 space-y-1">
                            <p className="text-sm text-gray-600 flex items-center">
                              <svg
                                className="h-4 w-4 mr-2 text-gray-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth="2"
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              {new Date(
                                event.start?.dateTime || event.start?.date || new Date()
                              ).toLocaleString()}
                            </p>
                            {event.location && (
                              <p className="text-sm text-gray-600 flex items-center">
                                <svg
                                  className="h-4 w-4 mr-2 text-gray-400"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                                  />
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                                  />
                                </svg>
                                {event.location}
                              </p>
                            )}
                          </div>
                          {event.description && (
                            <div className="mt-3 p-3 bg-gray-50 rounded-md">
                              <p className="text-sm text-gray-700">{event.description}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Display Bookings */}
                  {bookings.map((booking) => (
                    <div
                      key={booking.id}
                      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200"
                    >
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                            <svg
                              className="h-6 w-6 text-green-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                              Meeting with {booking.email}
                            </h3>
                            {booking.linkedinUrl && (
                              <a
                                href={booking.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm"
                              >
                                LinkedIn
                              </a>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 flex items-center mt-1">
                            <svg
                              className="h-4 w-4 mr-2 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth="2"
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            {new Date(booking.scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(new Date(booking.scheduledTime).getTime() + booking.schedulingLink.meetingLength * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <BookingDetails booking={booking} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Availability Calendar Section */}
        <div className="bg-white shadow-sm rounded-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Availability Calendar</h2>
            <div className="grid grid-cols-7 gap-2 mb-4">
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
                    const booking = bookings.find(
                      (booking) =>
                        new Date(booking.scheduledTime).getDate() === new Date().getDate() + dayIndex &&
                        new Date(booking.scheduledTime).getHours() === hourIndex
                    );
                    return (
                      <div
                        key={hourIndex}
                        className={`h-6 rounded transition-colors duration-200 ${
                          booking
                            ? "bg-purple-300 hover:bg-purple-200"
                            : slot?.isBusy
                            ? "bg-red-200 hover:bg-red-200"
                            : "bg-green-50 hover:bg-green-200"
                        }`}
                        title={`${hourIndex}:00 - ${hourIndex + 1}:00 ${
                          booking ? " (Booked)" : slot?.isBusy ? " (Busy)" : " (Available)"
                        }`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-center space-x-6 text-sm">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-100 rounded mr-2" />
                <span className="text-gray-600">Available</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-200 rounded mr-2" />
                <span className="text-gray-600">Busy</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-purple-200 rounded mr-2" />
                <span className="text-gray-600">Booked</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 