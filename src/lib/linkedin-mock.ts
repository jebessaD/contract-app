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
  skills: string[];
  education: Array<{
    school: string;
    degree_name?: string;
    field_of_study?: string;
    duration?: string;
  }>;
}

export const linkedInService = {
  async getEmployeeProfile() {
    return {
      full_name: "John Doe",
      headline: "Software Engineer",
      summary: "Experienced software engineer with a passion for building great products.",
      experiences: [
        {
          title: "Software Engineer",
          company: "Tech Corp",
          starts_at: { year: 2020 },
          ends_at: null,
          description: "Building amazing software"
        }
      ],
      skills: [
        { name: "JavaScript" },
        { name: "TypeScript" },
        { name: "React" }
      ],
      education: [
        {
          school: "University of Technology",
          degree_name: "Bachelor of Science",
          field_of_study: "Computer Science",
          starts_at: { year: 2016 },
          ends_at: { year: 2020 }
        }
      ]
    };
  }
};

export async function mockLinkedInScrape(): Promise<LinkedInProfile> {
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
    skills: [
      "JavaScript",
      "TypeScript",
      "React",
      "Node.js",
      "AWS",
      "Docker",
      "Kubernetes"
    ],
    education: [
      {
        school: "University of Technology",
        degree_name: "Bachelor of Science",
        field_of_study: "Computer Science",
        duration: "2014 - 2018"
      }
    ]
  };
} 