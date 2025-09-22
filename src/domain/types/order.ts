export type Side = 'BUY' | 'SELL' | 'CASH_IN' | 'CASH_OUT';
export type OrderType = 'MARKET' | 'LIMIT';

export type MarketBySize = {
  type: 'MARKET';
  instrumentId: number;
  userId: number;
  side: 'BUY' | 'SELL';
  size: number;            // units
  amount?: never;
};

export type MarketByAmount = {
  type: 'MARKET';
  instrumentId: number;
  userId: number;
  side: Side;              // BUY/SELL/CASH_IN/CASH_OUT
  amount: number;          // total money
  size?: never;
};

export type LimitOrder = {
  type: 'LIMIT';
  instrumentId: number;
  userId: number;
  side: 'BUY' | 'SELL';
  size: number;
  limitPrice: number;      // unit limit price
};

export type CreateOrderDTO = MarketBySize | MarketByAmount | LimitOrder;