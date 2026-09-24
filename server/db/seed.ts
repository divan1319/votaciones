import { eq } from 'drizzle-orm';
import { db } from './index';
import { user } from './schema';
import { auth } from '../utils/auth';

async function seed() {
  console.log('--- Sembrando usuario Administrador inicial ---');

  const [existingAdmin] = await db.select().from(user).where(eq(user.email, 'admin@concursos.com'));

  if (!existingAdmin) {
    const res = await auth.api.createUser({
      body: {
        email: 'admin@concursos.com',
        password: 'Admin1234!',
        name: 'Administrador General',
        role: 'admin',
      },
    });

    console.log('✓ Usuario Administrador creado exitosamente:', res.user.email);
  } else {
    console.log('✓ Usuario Administrador ya existía:', existingAdmin.email);
  }

  process.exit(0);
}

seed().catch((err) => {
  console.error('Error al sembrar base de datos:', err);
  process.exit(1);
});
