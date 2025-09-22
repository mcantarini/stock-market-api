import { VALIDATION_MESSAGES as MSG } from '../../shared/constants/error';

type Issue = { path: string; message: string };

export type UserPortfolioDTO = {
  id: number;
};

type ParseResult =
  | { ok: true; dto: UserPortfolioDTO; issues: Issue[] }
  | { ok: false; dto: undefined; issues: Issue[] };

const isValidId = (id: unknown): boolean => {
  if (typeof id !== 'string') return false;
  const parsed = Number(id);
  return !isNaN(parsed) && parsed > 0 && Number.isInteger(parsed);
};

export function parseUserPortfolioDTO(params: any): ParseResult {
  const issues: Issue[] = [];
  const run = (path: string, ok: boolean, msg: string) => { if (!ok) issues.push({ path, message: msg }); };

  const { id } = params || {};

  run('id', isValidId(id), MSG.USER_ID_INVALID);

  if (issues.length) return { ok: false, dto: undefined, issues };

  const dto: UserPortfolioDTO = {
    id: Number(id)
  };

  return { ok: true, dto, issues: [] };
}