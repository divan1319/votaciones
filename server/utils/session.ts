import { H3Event } from 'h3';
import { auth } from './auth';

export async function getUserSession(event: H3Event) {
  return await auth.api.getSession({
    headers: event.headers,
  });
}

export async function requireAuth(event: H3Event) {
  const session = await getUserSession(event);
  if (!session?.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'No autenticado. Por favor inicia sesión.',
    });
  }
  return session;
}

export async function requireAdmin(event: H3Event) {
  const session = await requireAuth(event);
  if (session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Acceso denegado. Se requiere rol de Administrador.',
    });
  }
  return session;
}

export async function requireJudge(event: H3Event) {
  const session = await requireAuth(event);
  if (session.user.role !== 'judge' && session.user.role !== 'admin') {
    throw createError({
      statusCode: 403,
      statusMessage: 'Acceso denegado. Se requiere rol de Juez o Administrador.',
    });
  }
  return session;
}
