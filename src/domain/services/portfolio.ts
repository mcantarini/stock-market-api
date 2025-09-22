import { PositionDAO } from '../../db/dao/position';
import { InstrumentDAO } from '../../db/dao/instrument';
import { MarketDataDAO } from '../../db/dao/marketData';
import { db } from '../../db/drizzle/client';
import { stockPositions } from '../../db/drizzle/schema/schema';
import { eq } from 'drizzle-orm';
import { PortfolioDTO, StockInstrumentPositionDTO } from '../types/portfolio';
import { DEFAULT_CURRENCY } from '../../shared/constants/currency';

export class PortfolioService {
  private position: PositionDAO;
  private instrument: InstrumentDAO;
  private marketData: MarketDataDAO;

  constructor() {
    this.position = new PositionDAO();
    this.instrument = new InstrumentDAO();
    this.marketData = new MarketDataDAO();
  }

  async getUserPortfolio(userId: number): Promise<PortfolioDTO> {
    // Get user positions
    const positions = await db
      .select({
        instrumentid: stockPositions.instrumentid,
        quantity: stockPositions.quantity,
        costbasis: stockPositions.costbasis,
      })
      .from(stockPositions)
      .where(eq(stockPositions.userid, userId));

    // Hydrate user positions
    const stockDetails: StockInstrumentPositionDTO[] = await Promise.all(
      positions.map(async (position) => {
        const [instrument, closePriceData] = await Promise.all([
          this.instrument.findById(position.instrumentid!),
          this.marketData.findLastClosePriceForInstrumentId(position.instrumentid!)
        ]);

        const costBasis = parseFloat(position.costbasis || '0');
        const quantity = position.quantity || 0;
        const lastPrice = closePriceData?.close ? parseFloat(closePriceData.close) : 0;
        const currentMarketValue = quantity * lastPrice;

        // Calculate total return percentage: ((quantity * last_price) - costBasis) / costBasis * 100
        const totalReturnPct = costBasis > 0
          ? ((currentMarketValue - costBasis) / costBasis) * 100
          : 0;

        return {
          id: position.instrumentid!,
          ticker: instrument?.ticker || '',
          name: instrument?.name || '',
          quantity: quantity,
          totalPosition: {
            amount: currentMarketValue,
            currency: DEFAULT_CURRENCY
          },
          totalReturnPct: totalReturnPct
        };
      })
    );

    // Get cash position
    const cashBalance = await this.position.getCashPosition(userId);

    return {
      userId,
      instruments: stockDetails,
      cash: {
        amount: cashBalance,
        currency: DEFAULT_CURRENCY
      }
    };
  }
}