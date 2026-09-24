import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '~~/server/db';
import { editions, editionJudges, roundJudges, user, account } from '~~/server/db/schema';
import { auth } from '~~/server/utils/auth';
import { requireAdmin } from '~~/server/utils/session';

const schema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  email: z.string().email('Correo electrónico no válido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional().default('Juez1234!'),
  roundId: z.string().optional().nullable(),
});

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const id = getRouterParam(event, 'id');
  if (!id) throw createError({ statusCode: 400, statusMessage: 'ID requerido' });

  const [edition] = await db.select().from(editions).where(eq(editions.id, id));
  if (!edition) throw createError({ statusCode: 404, statusMessage: 'Edición no encontrada' });

  const body = await readValidatedBody(event, (b) => schema.parse(b));

  // 1. Verificar si el usuario ya existe por email
  let [targetUser] = await db.select().from(user).where(eq(user.email, body.email));

  if (!targetUser) {
    // Crear el usuario con Better Auth
    const created = await auth.api.createUser({
      body: {
        email: body.email,
        password: body.password,
        name: body.name,
        role: 'judge',
      },
    });

    if (!created?.user) {
      throw createError({
        statusCode: 500,
        statusMessage: 'No se pudo crear la cuenta del juez con Better Auth',
      });
    }

    targetUser = created.user as typeof user.$inferSelect;
  }

  // 2. Asignar el juez a la edición o ronda según judgesScope
  if (edition.judgesScope === 'round') {
    if (!body.roundId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'El alcance de jueces es por ronda. Debe proporcionar roundId.',
      });
    }

    await db
      .insert(roundJudges)
      .values({
        roundId: body.roundId,
        userId: targetUser.id,
      })
      .onConflictDoNothing();
  } else {
    await db
      .insert(editionJudges)
      .values({
        editionId: id,
        userId: targetUser.id,
      })
      .onConflictDoNothing();
  }

  return {
    id: targetUser.id,
    name: targetUser.name,
    email: targetUser.email,
    tempPassword: body.password,
  };
});
