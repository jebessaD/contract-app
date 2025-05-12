import { prisma } from "./prisma";

export async function getUserBookings(userId: string) {
  const bookings = await prisma.booking.findMany({
    where: {
      userId: userId,
    },
    include: {
      schedulingLink: true,
      augmentedAnswersDetails: true
    },
    orderBy: {
      scheduledTime: 'asc',
    },
  });

  return bookings;
} 