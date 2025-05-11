"use client";

import { useState } from "react";
import { JsonValue } from "@prisma/client/runtime/library";

interface LinkedInData {
  title?: string;
  summary?: string;
}

interface Note {
  body: string;
}

interface OriginalAnswer {
  question: string;
  answer: string;
}

interface BookingAnswers {
  originalAnswers?: OriginalAnswer[];
  linkedinData?: LinkedInData;
  notes?: Note[];
  enrichedAnswers?: Record<string, string | number | boolean>;
}

interface Booking {
  id: string;
  email: string;
  linkedinUrl?: string;
  scheduledTime: Date;
  answers: JsonValue;
}

export function BookingDetails({ booking }: { booking: Booking }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const answers = booking.answers as BookingAnswers;

  const getSummaryText = () => {
    if (answers.originalAnswers?.[0]?.answer) {
      return answers.originalAnswers[0].answer;
    }
    if (answers.linkedinData?.title) {
      return answers.linkedinData.title;
    }
    return "No summary available";
  };

  return (
    <div className="mt-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left text-sm text-gray-600 hover:text-gray-900 flex items-center justify-between"
      >
        <span className="truncate">{getSummaryText()}</span>
        <svg
          className={`h-4 w-4 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-2 space-y-3 text-sm">
          {/* Form Answers */}
          {answers.originalAnswers?.[0] && (
            <div className="bg-gray-50 p-2 rounded">
              <p className="font-medium text-gray-700">{answers.originalAnswers[0].question}</p>
              <p className="text-gray-600">{answers.originalAnswers[0].answer}</p>
            </div>
          )}

          {/* LinkedIn Summary */}
          {answers.linkedinData?.summary && (
            <div className="bg-gray-50 p-2 rounded">
              <p className="font-medium text-gray-700">LinkedIn Summary</p>
              <p className="text-gray-600 line-clamp-2">{answers.linkedinData.summary}</p>
            </div>
          )}

          {/* Notes */}
          {answers.notes && answers.notes.length > 0 && (
            <div className="bg-gray-50 p-2 rounded">
              <p className="font-medium text-gray-700">Latest Note</p>
              <div 
                className="text-gray-600 line-clamp-2"
                dangerouslySetInnerHTML={{ __html: answers.notes[0].body }}
              />
            </div>
          )}

          {/* HubSpot Info */}
          {answers.enrichedAnswers && Object.keys(answers.enrichedAnswers).some(key => key.startsWith('HubSpot')) && (
            <div className="bg-gray-50 p-2 rounded">
              <p className="font-medium text-gray-700">HubSpot Info</p>
              <div className="grid grid-cols-2 gap-2 mt-1">
                {Object.entries(answers.enrichedAnswers)
                  .filter(([key]) => key.startsWith('HubSpot'))
                  .slice(0, 2)
                  .map(([key, value]) => (
                    <div key={key}>
                      <span className="text-gray-500 text-xs">{key.replace('HubSpot ', '')}: </span>
                      <span className="text-gray-600">{String(value)}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
} 