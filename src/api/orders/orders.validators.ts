import type { CreateOrderDTO, Side } from '../../domain/types/order';
import { ORDER_SIDE, ORDER_TYPE } from '../../shared/constants/order';
import { VALIDATION_MESSAGES as MSG } from '../../shared/constants/error';

type Issue = { path: string; message: string };
type ParseResult =
  | { ok: true; dto: CreateOrderDTO; issues: Issue[] }
  | { ok: false; dto: undefined; issues: Issue[] };

const isSide = (s: unknown): s is Side =>
  s === ORDER_SIDE.BUY || s === ORDER_SIDE.SELL || s === ORDER_SIDE.CASH_IN || s === ORDER_SIDE.CASH_OUT;

const isOrderType = (t: unknown): t is 'MARKET' | 'LIMIT' =>
  t === ORDER_TYPE.MARKET || t === ORDER_TYPE.LIMIT;

const isPositiveInt = (n: unknown): n is number =>
  typeof n === 'number' && Number.isInteger(n) && n > 0;

const isPositiveNumber = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n > 0;

export function parseCreateOrderDTO(body: any): ParseResult {
  const issues: Issue[] = [];
  const run = (path: string, ok: boolean, msg: string) => { if (!ok) issues.push({ path, message: msg }); };

  const commonValidators = () => {
    run('type', isOrderType(body?.type), MSG.TYPE_INVALID);
    run('instrumentId', isPositiveInt(body?.instrumentId), MSG.INSTRUMENT_ID_INVALID);
    run('userId', isPositiveInt(body?.userId), MSG.USER_ID_INVALID);
    run('side', isSide(body?.side), MSG.SIDE_INVALID);
  };

  const limitValidators = () => {
    run('side', body.side === ORDER_SIDE.BUY || body.side === ORDER_SIDE.SELL, MSG.LIMIT_SIDE_INVALID);
    run('size', isPositiveNumber(body.size), MSG.SIZE_INVALID);
    run('limitPrice', isPositiveNumber(body.limitPrice), MSG.LIMIT_PRICE_INVALID);
  };

  const marketWithAmountValidators = () => {
    run('amount', isPositiveNumber(body.amount), MSG.AMOUNT_INVALID);
  };

  const marketWithSizeValidators = () => {
    run('size', isPositiveNumber(body.size), MSG.SIZE_INVALID);
  };

  commonValidators();
  if (issues.length) return { ok: false, dto: undefined, issues };

  if (body.type === ORDER_TYPE.LIMIT) {
    // == LIMIT case == 
    limitValidators();
    if (issues.length) return { ok: false, dto: undefined, issues };

    const dto = {
      type: ORDER_TYPE.LIMIT,
      instrumentId: body.instrumentId,
      userId: body.userId,
      side: body.side,
      size: Number(body.size),
      limitPrice: Number(body.limitPrice),
    };
    return { ok: true, dto, issues: [] };
  }

  // == MARKET cases == 
  const hasSize = body.size !== undefined;
  const hasAmount = body.amount !== undefined;

  // CASH rules are amount-based
  if (body.side === ORDER_SIDE.CASH_IN || body.side === ORDER_SIDE.CASH_OUT) {
    marketWithAmountValidators();

    if (issues.length) return { ok: false, dto: undefined, issues };

    const dto = {
      type: ORDER_TYPE.MARKET,
      instrumentId: body.instrumentId,
      userId: body.userId,
      side: body.side,
      amount: Number(body.amount),
    };
    return { ok: true, dto, issues: [] };
  }

  // BUY/SELL rules
  run('(size|amount)', hasSize !== hasAmount, MSG.SIZE_OR_AMOUNT);
  if (hasSize) marketWithSizeValidators();
  if (hasAmount) marketWithAmountValidators();

  if (issues.length) return { ok: false, dto: undefined, issues };

  if (hasSize) {
    const dto = {
      type: ORDER_TYPE.MARKET,
      instrumentId: body.instrumentId,
      userId: body.userId,
      side: body.side,
      size: Number(body.size),
    };
    return { ok: true, dto, issues: [] };
  } else {
    const dto = {
      type: ORDER_TYPE.MARKET,
      instrumentId: body.instrumentId,
      userId: body.userId,
      side: body.side,
      amount: Number(body.amount),
    };
    return { ok: true, dto, issues: [] };
  }
}