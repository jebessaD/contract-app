"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

const meetingLengthOptions = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 45, label: "45 minutes" },
  { value: 60, label: "1 hour" },
  { value: 90, label: "1.5 hours" },
  { value: 120, label: "2 hours" },
];

const schedulingLinkSchema = z.object({
  usageLimit: z.number().min(1).optional().nullable(),
  expiresAt: z.string().optional().nullable(),
  meetingLength: z.number().min(15).max(480),
  maxAdvanceDays: z.number().min(1).max(365),
  customQuestions: z.array(
    z.object({
      question: z.string().min(1, "Question is required"),
      required: z.boolean().default(false),
    })
  ).min(1, "At least one question is required"),
});

type SchedulingLinkForm = z.infer<typeof schedulingLinkSchema>;

interface SchedulingLink {
  id: string;
  slug: string;
  usageLimit: number | null;
  expiresAt: string | null;
  meetingLength: number;
  maxAdvanceDays: number;
  customQuestions: Array<{ question: string; required: boolean }>;
  createdAt: string;
}

export default function SchedulingLinks() {
  const { data: session } = useSession();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [existingLinks, setExistingLinks] = useState<SchedulingLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch existing links
  useEffect(() => {
    const fetchLinks = async () => {
      try {
        const response = await fetch("/api/scheduling-links");
        if (!response.ok) throw new Error("Failed to fetch links");
        const data = await response.json();
        setExistingLinks(data);
      } catch (error) {
        console.error("Error fetching links:", error);
        toast.error("Failed to load existing links");
      } finally {
        setIsLoading(false);
      }
    };

    if (session?.user?.id) {
      fetchLinks();
    }
  }, [session?.user?.id]);

  // Ensure component is mounted before rendering
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const {
    control,
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SchedulingLinkForm>({
    resolver: zodResolver(schedulingLinkSchema),
    defaultValues: {
      meetingLength: 30,
      maxAdvanceDays: 30,
      customQuestions: [{ question: "", required: false }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "customQuestions",
  });

  const onSubmit = async (data: SchedulingLinkForm) => {
    if (!session?.user?.id) {
      toast.error("You must be logged in to create scheduling links");
      return;
    }

    setIsSubmitting(true);
    try {
      const validQuestions = data.customQuestions.filter(
        (q) => q.question && q.question.trim() !== ""
      );

      if (validQuestions.length === 0) {
        toast.error("At least one question is required");
        return;
      }

      const response = await fetch("/api/scheduling-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          customQuestions: validQuestions,
          expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to create scheduling link");
      }

      // Add the new link to the existing links
      setExistingLinks(prev => [result, ...prev]);
      setGeneratedLink(`${window.location.origin}/schedule/${result.slug}`);
      toast.success("Scheduling link created successfully");
      reset();
    } catch (error) {
      console.error("Error creating scheduling link:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create scheduling link");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Don't render anything until component is mounted
  if (!isMounted) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Existing Links Section */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Your Scheduling Links
          </h3>
          {isLoading ? (
            <div className="flex justify-center py-4">
              <svg className="animate-spin h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : existingLinks.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No scheduling links created yet</p>
          ) : (
            <div className="space-y-4">
              {existingLinks.map((link) => (
                <div key={link.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {link.meetingLength} min meeting
                      </p>
                      <p className="text-sm text-gray-500">
                        Created {new Date(link.createdAt).toLocaleDateString()}
                      </p>
                      {link.usageLimit && (
                        <p className="text-sm text-gray-500">
                          Usage limit: {link.usageLimit}
                        </p>
                      )}
                      {link.expiresAt && (
                        <p className="text-sm text-gray-500">
                          Expires: {new Date(link.expiresAt).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={`${window.location.origin}/schedule/${link.slug}`}
                        readOnly
                        className="block w-64 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900 border px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/schedule/${link.slug}`);
                          toast.success("Link copied to clipboard");
                        }}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create New Link Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Create New Scheduling Link
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Usage Limit (optional)
                </label>
                <input
                  type="number"
                  min="1"
                  {...register("usageLimit", { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900 border px-3 py-2"
                  placeholder="Number of times this link can be used"
                />
                {errors.usageLimit && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.usageLimit.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Expiration Date (optional)
                </label>
                <input
                  type="datetime-local"
                  {...register("expiresAt")}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900 border px-3 py-2"
                />
                {errors.expiresAt && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.expiresAt.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Meeting Length
                </label>
                <select
                  {...register("meetingLength", { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900 border px-3 py-2"
                >
                  {meetingLengthOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors.meetingLength && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.meetingLength.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Max Advance Days
                </label>
                <input
                  type="number"
                  min="1"
                  max="365"
                  {...register("maxAdvanceDays", { valueAsNumber: true })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900 border px-3 py-2"
                />
                {errors.maxAdvanceDays && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.maxAdvanceDays.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Questions
              </label>
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4">
                    <div className="flex-1">
                      <input
                        type="text"
                        {...register(`customQuestions.${index}.question`)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900 border px-3 py-2"
                        placeholder="Enter your question"
                      />
                      {errors.customQuestions?.[index]?.question && (
                        <p className="mt-1 text-sm text-red-600">
                          {errors.customQuestions[index]?.question?.message}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          {...register(`customQuestions.${index}.required`)}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Required</span>
                      </label>
                    </div>
                    {fields.length > 1 && (
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {errors.customQuestions && !Array.isArray(errors.customQuestions) && (
                <p className="mt-1 text-sm text-red-600">
                  {errors.customQuestions.message}
                </p>
              )}
              <button
                type="button"
                onClick={() => append({ question: "", required: false })}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Add Question
              </button>
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="flex items-center">
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Creating...
                    </>
                  ) : (
                    "Create Link"
                  )}
                </span>
              </button>
            </div>
          </form>

          {generatedLink && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-900 mb-2">
                Your Scheduling Link
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white text-gray-900 border px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generatedLink);
                    toast.success("Link copied to clipboard");
                  }}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Copy
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 