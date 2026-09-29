import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const cases = defineCollection({
  loader: glob({ base: './src/content/cases', pattern: '*.md' }),
  schema: z.object({
    title: z.string(),
    status: z.string(),
    order: z.number(),
    before: z.string(),
    after: z.string(),
    result: z.string(),
  }),
});

export const collections = { cases };
