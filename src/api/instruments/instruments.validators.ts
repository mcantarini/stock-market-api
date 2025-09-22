import { VALIDATION_MESSAGES as MSG } from '../../shared/constants/error';

type Issue = { path: string; message: string };

export type SearchInstrumentsDTO = {
  search: string;
};

type ParseResult =
  | { ok: true; dto: SearchInstrumentsDTO; issues: Issue[] }
  | { ok: false; dto: undefined; issues: Issue[] };

const isValidSearchTerm = (s: unknown): s is string =>
  typeof s === 'string' && s.trim().length > 0;

export function parseSearchInstrumentsDTO(query: any): ParseResult {
  const issues: Issue[] = [];
  const run = (path: string, ok: boolean, msg: string) => { if (!ok) issues.push({ path, message: msg }); };

  const { search } = query || {};

  run('search', isValidSearchTerm(search), MSG.SEARCH_INVALID);

  if (issues.length) return { ok: false, dto: undefined, issues };

  const dto: SearchInstrumentsDTO = {
    search: search
  };

  return { ok: true, dto, issues: [] };
}