interface LinkedInProfile {
  name: string;
  title: string;
  company: string;
  location: string;
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    duration: string;
    description: string;
  }>;
}

export async function mockLinkedInScrape(linkedinUrl: string): Promise<LinkedInProfile> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Return mock data
  return {
    name: "John Doe",
    title: "Senior Software Engineer",
    company: "Tech Corp",
    location: "San Francisco, CA",
    summary: "Experienced software engineer with a focus on web development and cloud architecture.",
    experience: [
      {
        title: "Senior Software Engineer",
        company: "Tech Corp",
        duration: "2020 - Present",
        description: "Leading development of cloud-native applications using modern technologies.",
      },
      {
        title: "Software Engineer",
        company: "Startup Inc",
        duration: "2018 - 2020",
        description: "Developed and maintained web applications using React and Node.js.",
      },
    ],
  };
} 