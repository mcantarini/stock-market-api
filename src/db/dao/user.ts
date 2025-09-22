import { db } from '../drizzle/client';
import { users } from '../drizzle/schema/schema';
import { eq} from 'drizzle-orm';
import { User } from '../../domain/entities/user';

export class UserDAO {
  async findUserById(id?: number): Promise<User[]> {
    if (!id) {
      throw new Error('Provide a valid User ID');
    }

    return await db
      .select()
      .from(users)
      .where(eq(users.id, id));
  }
}