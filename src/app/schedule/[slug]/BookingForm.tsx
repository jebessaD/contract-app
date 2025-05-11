"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

const bookingSchema = z.object({
  email: z.string().email("Invalid email address"),
  linkedinUrl: z.string().url("Invalid LinkedIn URL").refine(
    (url) => url.includes("linkedin.com"),
    "Must be a LinkedIn URL"
  ),
  answers: z.array(
    z.object({
      question: z.string(),
      answer: z.string().min(1, "This field is required"),
      required: z.boolean(),
    })
  ),
  selectedTime: z.string().min(1, "Please select a time slot"),
});

type BookingForm = z.infer<typeof bookingSchema>;

interface BookingFormProps {
  link: {
    id: string;
    meetingLength: number;
    maxAdvanceDays: number;
    customQuestions: Array<{ question: string; required: boolean }>;
  };
  advisor: {
    name: string;
    email: string;
    schedulingWindows: Array<{
      startTime: string;
      endTime: string;
      weekdays: string[];
    }>;
  };
}

const weekdayMap = {
  "Monday": "MONDAY",
  "Tuesday": "TUESDAY",
  "Wednesday": "WEDNESDAY",
  "Thursday": "THURSDAY",
  "Friday": "FRIDAY",
  "Saturday": "SATURDAY",
  "Sunday": "SUNDAY"
};

// const shortWeekdayMap = {
//   "Monday": "Mon",
//   "Tuesday": "Tue",
//   "Wednesday": "Wed",
//   "Thursday": "Thu",
//   "Friday": "Fri",
//   "Saturday": "Sat",
//   "Sunday": "Sun"
// };

interface TimeSlot {
  date: string;
  time: string;
  fullDate: string;
  isBooked?: boolean;
}

export default function BookingForm({ link, advisor }: BookingFormProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [bookingStatus, setBookingStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [usageLimitInfo, setUsageLimitInfo] = useState<{
    currentUsage: number;
    usageLimit: number | null;
    isLimitReached: boolean;
  }>({ currentUsage: 0, usageLimit: null, isLimitReached: false });
  const totalSteps = 3;

  // Add debug logging
  console.log("BookingForm props:", { link, advisor });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    trigger,
  } = useForm<BookingForm>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      answers: link.customQuestions.map((q) => ({
        question: q.question,
        answer: "",
        required: q.required,
      })),
      selectedTime: "",
    },
  });

  // Fetch booked slots and usage limit info
  useEffect(() => {
    const fetchBookedSlots = async () => {
      try {
        const response = await fetch(`/api/bookings/available?linkId=${link.id}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch booked slots');
        }

        // Update usage limit info
        setUsageLimitInfo({
          currentUsage: data.currentUsage,
          usageLimit: data.usageLimit,
          isLimitReached: data.isUsageLimitReached
        });

        // If usage limit is reached, show error and return
        if (data.isUsageLimitReached) {
          setBookingStatus({
            type: 'error',
            message: `This scheduling link has reached its limit of ${data.usageLimit} bookings.`
          });
          return;
        }

        // Update slots with booked status
        setAvailableTimeSlots(prevSlots => 
          prevSlots.map(slot => {
            const slotDate = new Date(slot.fullDate);
            const isBooked = data.bookedSlots.some((bookedTime: string) => {
              const bookedDate = new Date(bookedTime);
              return (
                bookedDate.getFullYear() === slotDate.getFullYear() &&
                bookedDate.getMonth() === slotDate.getMonth() &&
                bookedDate.getDate() === slotDate.getDate() &&
                bookedDate.getHours() === slotDate.getHours() &&
                bookedDate.getMinutes() === slotDate.getMinutes()
              );
            });
            return { ...slot, isBooked };
          })
        );
      } catch (error) {
        console.error('Error fetching booked slots:', error);
        toast.error('Failed to load available time slots');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBookedSlots();
  }, [link.id]);

  // Generate available time slots based on scheduling windows
  useEffect(() => {
    const generateTimeSlots = async () => {
      try {
        const response = await fetch(`/api/bookings/available?linkId=${link.id}`);
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch available slots');
        }

        // Update usage limit info
        setUsageLimitInfo({
          currentUsage: data.currentUsage,
          usageLimit: data.usageLimit,
          isLimitReached: data.isUsageLimitReached
        });

        // If usage limit is reached, show error and return
        if (data.isUsageLimitReached) {
          setBookingStatus({
            type: 'error',
            message: `This scheduling link has reached its limit of ${data.usageLimit} bookings.`
          });
          return;
        }

        const slots: TimeSlot[] = [];
        const today = new Date();
        const maxDate = new Date(today);
        maxDate.setDate(today.getDate() + link.maxAdvanceDays);

        // Generate slots for each day up to maxAdvanceDays
        for (let d = 0; d < link.maxAdvanceDays; d++) {
          const currentDate = new Date(today);
          currentDate.setDate(today.getDate() + d);
          const weekday = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
          const weekdayUpper = weekdayMap[weekday as keyof typeof weekdayMap];

          // Find all matching scheduling windows for this weekday
          const matchingWindows = advisor.schedulingWindows.filter(w => 
            w.weekdays.includes(weekdayUpper)
          );

          // Generate slots for each matching window
          matchingWindows.forEach(window => {
            const [startHour, startMinute] = window.startTime.split(':').map(Number);
            const [endHour, endMinute] = window.endTime.split(':').map(Number);

            console.log("startMinute", startMinute, endMinute);
            
            // Generate slots for this window
            for (let hour = startHour; hour < endHour; hour++) {
              for (let minute = 0; minute < 60; minute += link.meetingLength) {
                const slotTime = new Date(currentDate);
                slotTime.setHours(hour, minute, 0, 0);
                
                // Skip if the slot is in the past
                if (slotTime < today) continue;
                
                const dateStr = slotTime.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                });
                const timeStr = slotTime.toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                });
                
                const fullDate = slotTime.toISOString();
                const isBooked = data.bookedSlots.some((bookedTime: string) => {
                  const bookedDate = new Date(bookedTime);
                  return (
                    bookedDate.getFullYear() === slotTime.getFullYear() &&
                    bookedDate.getMonth() === slotTime.getMonth() &&
                    bookedDate.getDate() === slotTime.getDate() &&
                    bookedDate.getHours() === slotTime.getHours() &&
                    bookedDate.getMinutes() === slotTime.getMinutes()
                  );
                });

                slots.push({
                  date: dateStr,
                  time: timeStr,
                  fullDate,
                  isBooked
                });
              }
            }
          });
        }

        // Sort slots by date
        slots.sort((a, b) => new Date(a.fullDate).getTime() - new Date(b.fullDate).getTime());
        setAvailableTimeSlots(slots);
      } catch (error) {
        console.error('Error generating time slots:', error);
        toast.error('Failed to generate available time slots');
      } finally {
        setIsLoading(false);
      }
    };

    generateTimeSlots();
  }, [advisor.schedulingWindows, link.meetingLength, link.maxAdvanceDays, link.id]);

  // Update form when time is selected
  useEffect(() => {
    if (selectedTime) {
      setValue("selectedTime", selectedTime);
    }
  }, [selectedTime, setValue]);

  const onSubmit = async (data: BookingForm) => {
    if (!selectedTime) {
      toast.error("Please select a time slot");
      return;
    }

    // Check usage limit is reached
    if (usageLimitInfo.isLimitReached) {
      toast.error(`This scheduling link has reached its limit of ${usageLimitInfo.usageLimit} bookings.`);
      return;
    }

    // Check if the selected slot is still available
    const selectedSlot = availableTimeSlots.find(slot => slot.fullDate === selectedTime);
    if (!selectedSlot || selectedSlot.isBooked) {
      toast.error("This time slot is no longer available. Please select another slot.");
      return;
    }

    setIsSubmitting(true);
    setBookingStatus({ type: null, message: '' });

    try {
      // Create the booking
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...data,
          selectedTime,
          schedulingLinkId: link.id,
          advisorEmail: advisor.email,
        }),
      });

      const bookingResult = await bookingResponse.json();

      if (!bookingResponse.ok) {
        throw new Error(bookingResult.error || "Failed to book meeting");
      }

      // Call the booking confirmation endpoint
      const confirmResponse = await fetch("/api/booking-confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          linkedinUrl: data.linkedinUrl,
          answers: data.answers,
          bookingId: bookingResult.booking.id,
          scheduledTime: selectedTime,
          advisorEmail: advisor.email
        }),
      });

      if (!confirmResponse.ok) {
        console.error("Failed to confirm booking:", await confirmResponse.json());
        // Don't throw here, as the booking was created successfully
      }

      // Update the slot as booked
      setAvailableTimeSlots(prevSlots => 
        prevSlots.map(slot => 
          slot.fullDate === selectedTime 
            ? { ...slot, isBooked: true }
            : slot
        )
      );

      // Update usage count
      setUsageLimitInfo(prev => ({
        ...prev,
        currentUsage: prev.currentUsage + 1,
        isLimitReached: prev.usageLimit ? prev.currentUsage + 1 >= prev.usageLimit : false
      }));

      setBookingStatus({
        type: 'success',
        message: 'Meeting booked successfully!'
      });
      setCurrentStep(totalSteps);
    } catch (error) {
      console.error('Error booking meeting:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to book meeting';
      setBookingStatus({
        type: 'error',
        message: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = async () => {
    if (currentStep === 1 && !selectedTime) {
      toast.error("Please select a time slot");
      return;
    }

    // Validate current step before proceeding
    let isValid = true;
    if (currentStep === 2) {
      isValid = await trigger(["email", "linkedinUrl"]);
    } else if (currentStep === 3) {
      isValid = await trigger(["answers"]);
    }

    if (!isValid) {
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Group time slots by date
  const groupedSlots = availableTimeSlots.reduce((groups, slot) => {
    const date = slot.date;
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(slot);
    return groups;
  }, {} as Record<string, TimeSlot[]>);

  return (
    <div className="bg-white">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <div
              key={index}
              className={`flex-1 h-2 mx-1 rounded-full ${
                index + 1 <= currentStep ? "bg-blue-600" : "bg-gray-200"
              }`}
            />
          ))}
        </div>
        <div className="flex justify-between text-sm text-gray-600">
          <span>Select Time</span>
          <span>Contact Info</span>
          <span>Questions</span>
        </div>
      </div>

      {/* Status Message */}
      {bookingStatus.type && (
        <div className={`mb-4 p-4 rounded-md ${
          bookingStatus.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {bookingStatus.message}
        </div>
      )}

      {/* Usage Limit Info */}
      {usageLimitInfo.usageLimit && (
        <div className="mb-4 p-4 rounded-md bg-gray-50 border border-gray-200">
          <p className="text-sm text-gray-600">
            Bookings: {usageLimitInfo.currentUsage} / {usageLimitInfo.usageLimit}
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Step 1: Time Selection */}
        {currentStep === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Select a Time</h2>
            {isLoading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : usageLimitInfo.isLimitReached ? (
              <div className="text-center py-8 text-gray-600">
                This scheduling link has reached its booking limit.
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedSlots).map(([date, slots]) => (
                  <div key={date} className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-700">{date}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                      {slots.map((slot) => (
                        <button
                          key={slot.fullDate}
                          type="button"
                          onClick={() => {
                            if (!slot.isBooked && !usageLimitInfo.isLimitReached) {
                              setSelectedTime(slot.fullDate);
                            }
                          }}
                          disabled={slot.isBooked || usageLimitInfo.isLimitReached}
                          className={`p-3 border rounded-md text-gray-900 ${
                            slot.isBooked || usageLimitInfo.isLimitReached
                              ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                              : selectedTime === slot.fullDate
                              ? 'bg-blue-100 border-blue-500'
                              : 'bg-white hover:bg-gray-50 border-gray-300'
                          }`}
                        >
                          <div className="flex flex-col items-center">
                            <span>{slot.time}</span>
                            {slot.isBooked && (
                              <span className="text-xs text-red-600 mt-1">Booked</span>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {errors.selectedTime && (
              <p className="text-sm text-red-600">{errors.selectedTime.message}</p>
            )}
          </div>
        )}

        {/* Step 2: Contact Information */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Contact Information</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                {...register("email")}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 px-3 bg-white text-gray-900 placeholder:text-gray-400"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                LinkedIn URL
              </label>
              <input
                type="url"
                {...register("linkedinUrl")}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm h-10 px-3 bg-white text-gray-900 placeholder:text-gray-400"
                placeholder="https://linkedin.com/in/your-profile"
              />
              {errors.linkedinUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.linkedinUrl.message}</p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Custom Questions */}
        {currentStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-medium text-gray-900">Additional Information</h2>
            {link.customQuestions.map((question, index) => (
              <div key={index}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {question.question}
                  {question.required && <span className="text-red-500">*</span>}
                </label>
                <textarea
                  {...register(`answers.${index}.answer`)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm min-h-[100px] px-3 py-2 bg-white text-gray-900 placeholder:text-gray-400"
                  placeholder="Enter your answer"
                />
                {errors.answers?.[index]?.answer && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.answers[index]?.answer?.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between pt-6">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={prevStep}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Back
            </button>
          )}
          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={nextStep}
              disabled={usageLimitInfo.isLimitReached}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Next
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting || usageLimitInfo.isLimitReached}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Booking...
                </span>
              ) : (
                "Book Meeting"
              )}
            </button>
          )}
        </div>
      </form>
    </div>
  );
} 