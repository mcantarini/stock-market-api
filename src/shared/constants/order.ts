export const ORDER_SIDE = {
  BUY: 'BUY',
  SELL: 'SELL',
  CASH_IN: 'CASH_IN',
  CASH_OUT: 'CASH_OUT'
} as const;

export const ORDER_TYPE = {
  MARKET: 'MARKET',
  LIMIT: 'LIMIT'
} as const;

export const ORDER_STATUS = {
  NEW: 'NEW',
  FILLED: 'FILLED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED'
} as const;

export type OrderSide = typeof ORDER_SIDE[keyof typeof ORDER_SIDE];
export type OrderType = typeof ORDER_TYPE[keyof typeof ORDER_TYPE];
export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];