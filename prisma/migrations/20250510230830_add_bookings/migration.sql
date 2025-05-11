-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "linkedinUrl" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "scheduledTime" TIMESTAMP(3) NOT NULL,
    "schedulingLinkId" TEXT NOT NULL,
    "advisorEmail" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Booking_schedulingLinkId_idx" ON "Booking"("schedulingLinkId");

-- CreateIndex
CREATE INDEX "Booking_advisorEmail_idx" ON "Booking"("advisorEmail");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_schedulingLinkId_fkey" FOREIGN KEY ("schedulingLinkId") REFERENCES "SchedulingLink"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
