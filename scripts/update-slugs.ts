import { PrismaClient } from '@prisma/client';
import { nanoid } from 'nanoid';

const prisma = new PrismaClient();

async function updateSlugs() {
  try {
    // Get all scheduling links without slugs
    const links = await prisma.schedulingLink.findMany({
      where: {
        slug: null,
      },
    });

    console.log(`Found ${links.length} links to update`);

    // Update each link with a unique slug
    for (const link of links) {
      let slug;
      let isUnique = false;
      let attempts = 0;
      const maxAttempts = 5;

      while (!isUnique && attempts < maxAttempts) {
        slug = nanoid(10);
        const existing = await prisma.schedulingLink.findUnique({
          where: { slug },
        });
        if (!existing) {
          isUnique = true;
        }
        attempts++;
      }

      if (!isUnique) {
        console.error(`Failed to generate unique slug for link ${link.id}`);
        continue;
      }

      await prisma.schedulingLink.update({
        where: { id: link.id },
        data: { slug },
      });

      console.log(`Updated link ${link.id} with slug ${slug}`);
    }

    console.log('Finished updating slugs');
  } catch (error) {
    console.error('Error updating slugs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSlugs(); 