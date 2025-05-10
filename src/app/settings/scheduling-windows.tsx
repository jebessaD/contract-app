"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const weekdayOptions = [
  { value: "MONDAY", label: "Monday" },
  { value: "TUESDAY", label: "Tuesday" },
  { value: "WEDNESDAY", label: "Wednesday" },
  { value: "THURSDAY", label: "Thursday" },
  { value: "FRIDAY", label: "Friday" },
  { value: "SATURDAY", label: "Saturday" },
  { value: "SUNDAY", label: "Sunday" },
];

const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

const schedulingWindowSchema = z.object({
  windows: z.array(
    z.object({
      startTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
      endTime: z.string().regex(timeRegex, "Invalid time format (HH:mm)"),
      weekdays: z.array(z.string()).min(1, "Select at least one weekday"),
    }).refine(
      (data) => {
        const [startHours, startMinutes] = data.startTime.split(":").map(Number);
        const [endHours, endMinutes] = data.endTime.split(":").map(Number);
        const startTotal = startHours * 60 + startMinutes;
        const endTotal = endHours * 60 + endMinutes;
        return endTotal > startTotal;
      },
      {
        message: "End time must be after start time",
        path: ["endTime"],
      }
    )
  ),
});

type SchedulingWindowForm = z.infer<typeof schedulingWindowSchema>;

interface SchedulingWindow {
  id: string;
  startTime: string;
  endTime: string;
  weekdays: string[];
}

export default function SchedulingWindows({
  initialWindows = [],
}: {
  initialWindows?: SchedulingWindow[];
}) {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SchedulingWindowForm>({
    resolver: zodResolver(schedulingWindowSchema),
    defaultValues: {
      windows: initialWindows.length > 0
        ? initialWindows.map(w => ({
            startTime: w.startTime,
            endTime: w.endTime,
            weekdays: w.weekdays,
          }))
        : [{ startTime: "09:00", endTime: "17:00", weekdays: [] }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "windows",
  });

  const onSubmit = async (data: SchedulingWindowForm) => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to save scheduling windows");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/scheduling-windows", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          windows: data.windows,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save scheduling windows");
      }

      const result = await response.json();
      toast.success("Scheduling windows saved successfully");
    } catch (error) {
      console.error("Error saving scheduling windows:", error);
      toast.error("Failed to save scheduling windows");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-4 py-5 sm:p-6">
        <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
          Scheduling Windows
        </h3>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {fields.map((field, index) => (
            <div
              key={field.id}
              className="flex flex-col sm:flex-row gap-4 p-4 bg-gray-50 rounded-lg"
            >
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  Start Time
                </label>
                <input
                  type="time"
                  {...register(`windows.${index}.startTime`)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900 border px-3 py-2"
                  min="00:00"
                  max="23:59"
                />
                {errors.windows?.[index]?.startTime && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.windows[index]?.startTime?.message}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  End Time
                </label>
                <input
                  type="time"
                  {...register(`windows.${index}.endTime`)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900 border px-3 py-2"
                  min="00:00"
                  max="23:59"
                />
                {errors.windows?.[index]?.endTime && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.windows[index]?.endTime?.message}
                  </p>
                )}
              </div>

              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700">
                  Weekdays
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  {weekdayOptions.map((weekday) => (
                    <label
                      key={weekday.value}
                      className="inline-flex items-center"
                    >
                      <input
                        type="checkbox"
                        value={weekday.value}
                        {...register(`windows.${index}.weekdays`)}
                        className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        {weekday.label}
                      </span>
                    </label>
                  ))}
                </div>
                {errors.windows?.[index]?.weekdays && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.windows[index]?.weekdays?.message}
                  </p>
                )}
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() =>
                append({ startTime: "09:00", endTime: "17:00", weekdays: [] })
              }
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Window
            </button>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : "Save Windows"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 