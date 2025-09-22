import { ORDER_SIDE, ORDER_TYPE } from './order';

export const VALIDATION_MESSAGES = {
  // Common validation messages
  TYPE_INVALID: `type must be '${ORDER_TYPE.MARKET}' or '${ORDER_TYPE.LIMIT}'`,
  INSTRUMENT_ID_INVALID: 'instrumentId must be a positive integer',
  USER_ID_INVALID: 'userId must be a positive integer',
  SIDE_INVALID: `side must be one of '${ORDER_SIDE.BUY}','${ORDER_SIDE.SELL}','${ORDER_SIDE.CASH_IN}','${ORDER_SIDE.CASH_OUT}'`,

  // LIMIT order specific
  LIMIT_SIDE_INVALID: `LIMIT side must be '${ORDER_SIDE.BUY}' or '${ORDER_SIDE.SELL}'`,
  LIMIT_PRICE_INVALID: 'limitPrice must be a positive number',

  // MARKET order specific
  SIZE_INVALID: 'size must be a positive number',
  AMOUNT_INVALID: 'amount must be a positive number',
  SIZE_OR_AMOUNT: 'Provide either size or amount (not both)',

  // Instrument search specific
  SEARCH_INVALID: 'Search parameter must be a non-empty string',
} as const;