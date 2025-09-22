import { db } from '../drizzle/client';
import { marketdata } from '../drizzle/schema/schema';
import { eq, desc} from 'drizzle-orm';

export interface ClosePrice {
  close: string | null;
}

export class MarketDataDAO {
  async findLastClosePriceForInstrumentId(id?: number): Promise<ClosePrice> {
    if (!id) {
      throw new Error('Provide a valid Instrument ID');
    }

    const result = await db
      .select({close: marketdata.close})
      .from(marketdata)
      .where(eq(marketdata.instrumentid, id))
      .orderBy(desc(marketdata.date))
      .limit(1);
    if (!result[0]) {
      throw new Error('Unable to find close price for instrument');
    }

    return result[0];
  }
}