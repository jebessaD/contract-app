import { NextResponse } from 'next/server';
import { linkedInService } from '@/lib/linkedin';
import { getHubspotClient, searchHubspotContact } from '@/lib/hubspot';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { linkedinUrl } = data;

    if (!linkedinUrl) {
      return NextResponse.json(
        { error: "LinkedIn URL is required" },
        { status: 400 }
      );
    }

    // First try to find contact in Hubspot
    const { accessToken } = await getHubspotClient(session.user.id);
    const hubspotContact = await searchHubspotContact(linkedinUrl, accessToken);

    if (hubspotContact) {
      return NextResponse.json({
        source: 'hubspot',
        contact: hubspotContact
      });
    }

    // If no Hubspot contact found, try to find LinkedIn profile
    const domain = linkedinUrl.split('@')[1];
    if (!domain) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    // Find the company profile
    const companyProfile = await linkedInService.findCompanyByDomain(domain);
    if (!companyProfile) {
      return NextResponse.json({ 
        error: 'Could not find company profile',
        source: 'linkedin'
      }, { status: 404 });
    }

    // Search for employees at the company
    const employees = await linkedInService.searchEmployeesByTitle(
      companyProfile.website || '',
      '' // Empty string to search all employees
    );

    // Try to find the specific employee by matching email domain
    const matchingEmployee = employees?.find(emp => 
      emp.experiences?.some(exp => 
        exp.company.toLowerCase() === companyProfile.name?.toLowerCase()
      )
    );

    if (matchingEmployee) {
      // Gather context from LinkedIn profile
      const context = [];
      
      // Add summary/bio if available
      if (matchingEmployee.summary) {
        context.push(`Bio: ${matchingEmployee.summary}`);
      }

      // Add current role and company
      const currentExperience = matchingEmployee.experiences?.[0];
      if (currentExperience) {
        context.push(`Current Role: ${currentExperience.title} at ${currentExperience.company}`);
      }

      // Add skills if available
      if (matchingEmployee.skills && matchingEmployee.skills.length > 0) {
        context.push(`Skills: ${matchingEmployee.skills.join(', ')}`);
      }

      // Add education if available
      if (matchingEmployee.education && matchingEmployee.education.length > 0) {
        const education = matchingEmployee.education[0];
        context.push(`Education: ${education.school}${education.degree_name ? ` - ${education.degree_name}` : ''}`);
      }

      return NextResponse.json({
        source: 'linkedin',
        contact: {
          firstName: matchingEmployee.full_name.split(' ')[0],
          lastName: matchingEmployee.full_name.split(' ').slice(1).join(' '),
          company: companyProfile.name,
          title: matchingEmployee.headline,
          location: `${matchingEmployee.city || ''}, ${matchingEmployee.country || ''}`.trim(),
          bio: matchingEmployee.summary,
          skills: matchingEmployee.skills,
          experience: matchingEmployee.experiences,
          context: context.join('\n')
        }
      });
    }

    return NextResponse.json({ 
      error: 'Could not find matching contact',
      source: 'linkedin'
    }, { status: 404 });

  } catch (error) {
    console.error('Error in LinkedIn route:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 