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
  augmentedAnswers?: Array<{
    question: string;
    originalAnswer: string;
    augmentedAnswer: string;
  }>;
}

interface Booking {
  id: string;
  email: string;
  linkedinUrl?: string;
  scheduledTime: Date;
  answers: JsonValue;
  augmentedAnswersDetails?: {
    originalAnswer: string;
    augmentedAnswer: string;
    context: any;
  } | null;
}

export function BookingDetails({ booking }: { booking: Booking }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const answers = booking.answers as BookingAnswers;

  const getSummaryText = () => {
    if (booking.augmentedAnswersDetails?.augmentedAnswer) {
      const augmentedAnswer = booking.augmentedAnswersDetails.augmentedAnswer;
      
      // Handle JSON string format
      if (augmentedAnswer.startsWith('[')) {
        try {
          const parsed = JSON.parse(augmentedAnswer);
          if (Array.isArray(parsed) && parsed[0]?.answer) {
            // Extract just the augmented answer part
            const answer = parsed[0].answer;
            const match = answer.match(/Augmented Answer: (.*?)(?:\n|$)/);
            return match ? match[1].trim() : answer.replace(/^Augmented Answer: /, '').trim();
          }
        } catch (e) {
          console.error('Failed to parse augmented answer:', e);
        }
      }
      
      // Handle regular string format
      const match = augmentedAnswer.match(/Augmented Answer: (.*?)(?:\n|$)/);
      if (match) {
        return match[1].trim();
      }
      
      // Fallback: clean up any remaining artifacts
      return augmentedAnswer
        .replace(/^\[|\]$/g, '') // Remove outer brackets
        .replace(/^\{|\}$/g, '') // Remove outer braces
        .replace(/"answer":\s*"/g, '') // Remove "answer": "
        .replace(/"question":\s*"[^"]*",\s*/g, '') // Remove question part
        .replace(/"Augmented Answer: /g, '') // Remove Augmented Answer prefix
        .replace(/"$/g, '') // Remove trailing quote
        .replace(/\\n/g, ' ') // Replace newlines with spaces
        .trim();
    }
    
    if (answers.originalAnswers?.[0]?.answer) {
      return answers.originalAnswers[0].answer;
    }
    if (answers.linkedinData?.title) {
      return answers.linkedinData.title;
    }
    return "Meeting details available - click to expand";
  };

  const sanitizeHtml = (html: string) => {
    return html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  return (
    <div className="mt-2">
      <div className="text-sm text-gray-600 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        {getSummaryText()}
      </div>

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
              <p className="text-gray-600 line-clamp-2">
                {sanitizeHtml(answers.notes[0].body)}
              </p>
            </div>
          )}

          {/* HubSpot Info */}
          {answers.enrichedAnswers && Object.keys(answers.enrichedAnswers).some(key => key.startsWith('HubSpot')) && (
            <div className="bg-gray-50 p-2 rounded">
              <p className="font-medium text-gray-700">HubSpot Info</p>
              <div className="grid grid-cols-1 gap-2 mt-1">
                {Object.entries(answers.enrichedAnswers)
                  .filter(([key]) => key.startsWith('HubSpot'))
                  .map(([key, value]) => (
                    <div key={key} className="text-sm">
                      <span className="text-gray-500">{key.replace('HubSpot ', '')}: </span>
                      <span className="text-gray-600">{sanitizeHtml(String(value))}</span>
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