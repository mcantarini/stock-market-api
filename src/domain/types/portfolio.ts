export interface PositionAmount {
  amount: number;
  currency: string;
}

export interface StockInstrumentPositionDTO {
  id: number;
  ticker: string;
  name: string;
  quantity: number;
  totalPosition: PositionAmount;
  totalReturnPct: number;
}

export interface PortfolioDTO {
  userId: number;
  instruments: StockInstrumentPositionDTO[];
  cash: PositionAmount;
}