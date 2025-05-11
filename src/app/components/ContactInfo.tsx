'use client';

import { useState, useEffect } from 'react';
import { LinkedInEmployeeProfile } from '@/lib/linkedin.d';

interface ContactInfoProps {
  email: string;
  onContactFound?: (contact: any) => void;
}

interface ContactResponse {
  source: 'hubspot' | 'linkedin';
  contact: any;
  error?: string;
}

export default function ContactInfo({ email, onContactFound }: ContactInfoProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contactData, setContactData] = useState<ContactResponse | null>(null);

  useEffect(() => {
    const fetchContactInfo = async () => {
      if (!email) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const response = await fetch('/api/linkedin', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to fetch contact information');
        }

        setContactData(data);
        if (onContactFound) {
          onContactFound(data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchContactInfo();
  }, [email, onContactFound]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-red-500 p-4">
        {error}
      </div>
    );
  }

  if (!contactData) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold">
          Contact Information
          <span className="ml-2 text-sm text-gray-500">
            (via {contactData.source})
          </span>
        </h2>
      </div>

      {contactData.source === 'hubspot' ? (
        // Hubspot Contact Display
        <div className="space-y-4">
          <div>
            <p className="font-medium">{contactData.contact.properties.firstname} {contactData.contact.properties.lastname}</p>
            <p className="text-gray-600">{contactData.contact.properties.email}</p>
            {contactData.contact.properties.company && (
              <p className="text-gray-600">{contactData.contact.properties.company}</p>
            )}
          </div>
          {contactData.contact.properties.notes && (
            <div>
              <h3 className="font-medium">Notes</h3>
              <p className="text-gray-600">{contactData.contact.properties.notes}</p>
            </div>
          )}
        </div>
      ) : (
        // LinkedIn Contact Display
        <div className="space-y-4">
          <div>
            <p className="font-medium">{contactData.contact.firstName} {contactData.contact.lastName}</p>
            <p className="text-gray-600">{contactData.contact.title}</p>
            <p className="text-gray-600">{contactData.contact.company}</p>
            {contactData.contact.location && (
              <p className="text-gray-600">{contactData.contact.location}</p>
            )}
          </div>
          
          {contactData.contact.bio && (
            <div>
              <h3 className="font-medium">About</h3>
              <p className="text-gray-600">{contactData.contact.bio}</p>
            </div>
          )}

          {contactData.contact.skills && contactData.contact.skills.length > 0 && (
            <div>
              <h3 className="font-medium">Skills</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {contactData.contact.skills.map((skill: string, index: number) => (
                  <span
                    key={index}
                    className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {contactData.contact.experience && contactData.contact.experience.length > 0 && (
            <div>
              <h3 className="font-medium">Experience</h3>
              <div className="space-y-2 mt-2">
                {contactData.contact.experience.map((exp: any, index: number) => (
                  <div key={index} className="text-sm">
                    <p className="font-medium">{exp.title}</p>
                    <p className="text-gray-600">{exp.company}</p>
                    {exp.starts_at && (
                      <p className="text-gray-500">
                        {`${exp.starts_at.year}${exp.starts_at.month ? '/' + exp.starts_at.month : ''}`}
                        {exp.ends_at ? ` - ${exp.ends_at.year}${exp.ends_at.month ? '/' + exp.ends_at.month : ''}` : ' - Present'}
                      </p>
                    )}
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