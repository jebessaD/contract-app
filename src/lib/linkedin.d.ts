export interface LinkedInCompanyProfile {
  name: string;
  tagline: string | null;
  description: string | null;
  website: string | null;
  industry: string | null;
  company_size: string | null;
  company_type: string | null;
  founded_year: number | null;
  specialties: string[] | null;
  locations: CompanyLocation[] | null;
  follower_count: number | null;
  employee_count: number | null;
  linkedin_url?: string;
  founded?: number;
  headquarters?: string;
}

interface CompanyLocation {
  country: string | null;
  city: string | null;
  postal_code: string | null;
  line1: string | null;
  is_headquarters: boolean;
}

export interface LinkedInEmployeeProfile {
  full_name: string;
  headline?: string;
  summary?: string;
  location?: string;
  city?: string;
  country?: string;
  experiences?: Array<{
    title: string;
    company: string;
    description?: string;
    starts_at?: {
      year?: number;
      month?: number;
    };
    ends_at?: {
      year?: number;
      month?: number;
    };
  }>;
  skills?: Array<{
    name: string;
  }>;
  education?: Array<{
    school: string;
    degree_name?: string;
    field_of_study?: string;
    starts_at?: {
      year?: number;
    };
    ends_at?: {
      year?: number;
    };
  }>;
}

interface WorkExperience {
  title: string;
  company: string;
  description: string | null;
  location: string | null;
  starts_at: {
    month: number;
    year: number;
  } | null;
  ends_at: {
    month: number;
    year: number;
  } | null;
  company_linkedin_profile_url: string | null;
}

interface Education {
  school: string;
  degree_name: string | null;
  field_of_study: string | null;
  starts_at: {
    year: number;
  } | null;
  ends_at: {
    year: number;
  } | null;
}

export interface LinkedInData {
  name: string;
  title: string;
  company: string;
  location: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description?: string;
  }>;
  skills: string[];
  education: Array<{
    school: string;
    degree_name?: string;
    field_of_study?: string;
    duration?: string;
  }>;
} 