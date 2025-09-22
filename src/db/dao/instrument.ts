import { db } from '../drizzle/client';
import { instruments } from '../drizzle/schema/schema';
import { or, ilike, eq } from 'drizzle-orm';
import { Instrument } from '../../domain/entities/instrument';

export class InstrumentDAO {
  async findById(id: number): Promise<Instrument | null> {
    const result = await db
      .select()
      .from(instruments)
      .where(eq(instruments.id, id))
      .limit(1);

    return result[0] || null;
  }

  async findInstrumentById(id?: number): Promise<Instrument> {
    // avoid querying without id
    if (!id) {
      throw new Error('provide a valid instrument ID');
    }

    const result = await db
      .select()
      .from(instruments)
      .where(eq(instruments.id, id))
      .limit(1);
    if (!result[0]) {
      throw new Error('instrument not found');
    }

    return result[0];
  }
  
  async searchByTerm(searchTerm?: string): Promise<Instrument[]> {
    // avoid querying without search term
    if (!searchTerm) {
      throw new Error('provide a valid search tearm');
    }

    const searchPattern = `%${searchTerm}%`;

    return await db
      .select()
      .from(instruments)
      .where(
        or(
          ilike(instruments.ticker, searchPattern),
          ilike(instruments.name, searchPattern)
        )
      );
  }
}