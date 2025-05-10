-- CreateTable
CREATE TABLE "SchedulingWindow" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "weekdays" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchedulingWindow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchedulingWindow_userId_idx" ON "SchedulingWindow"("userId");

-- AddForeignKey
ALTER TABLE "SchedulingWindow" ADD CONSTRAINT "SchedulingWindow_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
