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
  const augmentedAnswersDetails = booking.augmentedAnswersDetails;

  console.log(augmentedAnswersDetails,"augmentedAnswersDetails");

  const getSummaryText = () => {
    if (booking.augmentedAnswersDetails?.augmentedAnswer) {
      try {
        const parsed = JSON.parse(booking.augmentedAnswersDetails.augmentedAnswer);
        if (Array.isArray(parsed) && parsed[0]?.augmentedAnswer) {
          const fullAnswer = parsed[0].augmentedAnswer;
          const match = fullAnswer.match(/Augmented Answer: (.*?)(?:\n|$)/);
          if (match) {
            return match[1].trim();
          }
          return fullAnswer;
        }
      } catch (e) {
        console.error('Failed to parse augmented answer:', e);
      }
    }
    
    if (answers.originalAnswers?.[0]?.answer) {
      return answers.originalAnswers[0].answer;
    }
    if (answers.linkedinData?.title) {
      return answers.linkedinData.title;
    }
    return "Meeting details available - click to expand";
  };

  const getAugmentedContext = () => {
    if (!booking.augmentedAnswersDetails?.augmentedAnswer) return null;
    
    try {
      const parsed = JSON.parse(booking.augmentedAnswersDetails.augmentedAnswer);
      if (Array.isArray(parsed) && parsed[0]?.context) {
        return parsed[0].context;
      }
    } catch (e) {
      console.error('Failed to parse augmented context:', e);
    }
    return null;
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

          {/* Augmented Answer */}
          {augmentedAnswersDetails?.augmentedAnswer && (
            <div className="bg-gray-50 p-2 rounded">
              <p className="font-medium text-gray-700">Augmented Answer</p>
              <p className="text-gray-600">
                {getSummaryText()}
              </p>
              
              {/* LinkedIn Context */}
              {getAugmentedContext()?.linkedin && (
                <div className="mt-2">
                  <p className="font-medium text-gray-700">LinkedIn Context</p>
                  <div className="text-gray-600">
                    {getAugmentedContext()?.linkedin?.skills && (
                      <p>Skills: {getAugmentedContext()?.linkedin?.skills.join(', ')}</p>
                    )}
                    {getAugmentedContext()?.linkedin?.experiences?.[0] && (
                      <p>Current Role: {getAugmentedContext()?.linkedin?.experiences[0].title} at {getAugmentedContext()?.linkedin?.experiences[0].company}</p>
                    )}
                  </div>
                </div>
              )}

              {/* HubSpot Context */}
              {getAugmentedContext()?.hubspot && (
                <div className="mt-2">
                  <p className="font-medium text-gray-700">HubSpot Context</p>
                  <div className="text-gray-600">
                    {getAugmentedContext()?.hubspot?.notes?.map((note: any, index: number) => (
                      <p key={index} className="mt-1">
                        {sanitizeHtml(note.body)}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
} 