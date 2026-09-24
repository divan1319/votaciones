import { z } from 'zod';
import { db } from '~~/server/db';
import { contests } from '~~/server/db/schema';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  description: z.string().optional(),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  const [newContest] = await db
    .insert(contests)
    .values({
      name: body.name,
      description: body.description || null,
    })
    .returning();

  return newContest;
});
