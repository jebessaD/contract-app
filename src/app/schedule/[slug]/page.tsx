import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import BookingForm from "./BookingForm";

export default async function SchedulingPage({
  params,
}: {
  params: { slug: string };
}) {
  const link = await prisma.schedulingLink.findUnique({
    where: { slug: params.slug },
    include: {
      user: {
        include: {
          schedulingWindows: true,
        },
      },
    },
  });

  console.log("Found scheduling link:", link);

  if (!link) {
    notFound();
  }

  // Transform the data for the BookingForm
  const advisor = {
    name: link.user.name || "Advisor",
    email: link.user.email,
    schedulingWindows: link.user.schedulingWindows.map((window) => ({
      startTime: window.startTime,
      endTime: window.endTime,
      weekdays: window.weekdays,
    })),
  };

  console.log("Transformed advisor data:", advisor);

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-sm p-6 sm:p-8">
          <h1 className="text-2xl font-semibold text-gray-900 mb-8">
            Schedule a Meeting with {advisor.name}
          </h1>
          <BookingForm
            link={{
              id: link.id,
              meetingLength: link.meetingLength,
              maxAdvanceDays: link.maxAdvanceDays,
              customQuestions: link.customQuestions,
            }}
            advisor={advisor}
          />
        </div>
      </div>
    </div>
  );
} 