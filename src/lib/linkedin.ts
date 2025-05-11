import { LinkedInCompanyProfile, LinkedInEmployeeProfile } from './linkedin.d';

class LinkedInService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://nubela.co/proxycurl/api/v2';

  constructor() {
    const apiKey = process.env.PROXYCURL_API_KEY;
    if (!apiKey) {
      console.error('PROXYCURL_API_KEY is not set in environment variables');
      throw new Error('PROXYCURL_API_KEY environment variable is not set');
    }
    this.apiKey = apiKey;
    console.log('LinkedInService initialized with API key:', apiKey.substring(0, 5) + '...');
  }

  private async fetchApi<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    const queryString = new URLSearchParams(params).toString();
    const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`;

    console.log('Making Proxycurl API call to:', endpoint);
    console.log('Full URL:', url);
    console.log('With parameters:', params);
    console.log('Using API key:', this.apiKey.substring(0, 5) + '...');

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('Proxycurl API response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Proxycurl API error:', {
          status: response.status,
          statusText: response.statusText,
          error: errorText,
          url: url
        });
        throw new Error(`LinkedIn API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log('Proxycurl API response data:', JSON.stringify(data, null, 2));
      return data;
    } catch (error: unknown) {
      console.error('Error in Proxycurl API call:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        url: url
      });
      throw error;
    }
  }

  /**
   * Fetch company profile from LinkedIn
   * @param linkedinUrl Company's LinkedIn profile URL
   * @returns Company profile data
   */
  async getCompanyProfile(linkedinUrl: string): Promise<LinkedInCompanyProfile> {
    return this.fetchApi<LinkedInCompanyProfile>('/company', {
      url: linkedinUrl,
      use_cache: 'if-present',
      categories: 'include',
      funding_data: 'include',
      exit_data: 'include',
      acquisitions: 'include',
      extra: 'include'
    });
  }

  /**
   * Search for a company by domain
   * @param domain Company's website domain
   * @returns Company profile data
   */
  async findCompanyByDomain(domain: string): Promise<LinkedInCompanyProfile> {
    console.log('Finding company by domain:', domain);
    try {
      if (!domain) {
        throw new Error('Domain is required');
      }

      const company = await this.fetchApi<LinkedInCompanyProfile>('/company/resolve', {
        domain: domain
      });

      console.log('Successfully found company:', {
        name: company.name,
        website: company.website,
        industry: company.industry,
        linkedin_url: company.linkedin_url
      });

      return company;
    } catch (error: unknown) {
      console.error('Failed to find company by domain:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        domain: domain
      });
      throw error;
    }
  }

  /**
   * Get employee profile from LinkedIn
   * @param linkedinUrl Employee's LinkedIn profile URL
   * @returns Employee profile data
   */
  async getEmployeeProfile(linkedinUrl: string): Promise<LinkedInEmployeeProfile> {
    console.log('Fetching employee profile for URL:', linkedinUrl);
    try {
      if (!linkedinUrl) {
        throw new Error('LinkedIn URL is required');
      }

      if (!linkedinUrl.includes('linkedin.com')) {
        throw new Error('Invalid LinkedIn URL format');
      }

      const profile = await this.fetchApi<LinkedInEmployeeProfile>('/linkedin', {
        url: linkedinUrl,
        use_cache: 'if-present',
        skills: 'include',
        education: 'include',
        languages: 'include',
        certifications: 'include',
        extra: 'include'
      });

      console.log('Successfully fetched employee profile:', {
        name: profile.full_name,
        title: profile.headline,
        company: profile.experiences?.[0]?.company,
        skills: profile.skills?.length,
        education: profile.education?.length
      });

      return profile;
    } catch (error: unknown) {
      console.error('Failed to fetch employee profile:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        url: linkedinUrl
      });
      throw error;
    }
  }

  /**
   * Get employee count for a company
   * @param linkedinUrl Company's LinkedIn profile URL
   * @returns Employee count data
   */
  async getCompanyEmployeeCount(linkedinUrl: string): Promise<number> {
    const response = await this.fetchApi<{ employee_count: number }>('/company/employees/count', {
      url: linkedinUrl
    });
    return response.employee_count;
  }

  /**
   * Search for employees by job title within a company
   * @param companyUrl Company's LinkedIn profile URL
   * @param jobTitle Job title to search for
   * @returns Array of employee profiles
   */
  async searchEmployeesByTitle(companyUrl: string, jobTitle: string): Promise<LinkedInEmployeeProfile[]> {
    console.log('Searching employees by title:', { companyUrl, jobTitle });
    try {
      if (!companyUrl || !jobTitle) {
        throw new Error('Company URL and job title are required');
      }

      const employees = await this.fetchApi<LinkedInEmployeeProfile[]>('/company/employees/search', {
        url: companyUrl,
        title: jobTitle
      });

      console.log('Successfully found employees:', {
        count: employees.length,
        names: employees.map(e => e.full_name),
        titles: employees.map(e => e.headline)
      });

      return employees;
    } catch (error: unknown) {
      console.error('Failed to search employees by title:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        companyUrl,
        jobTitle
      });
      throw error;
    }
  }
}

// Export singleton instance
export const linkedInService = new LinkedInService();

// Export class for testing purposes
export { LinkedInService };
