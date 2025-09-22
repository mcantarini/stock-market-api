export const INSTRUMENT_TYPE = {
  ACCIONES: 'ACCIONES',
  MONEDA: 'MONEDA'
} as const;

export type InstrumentType = typeof INSTRUMENT_TYPE[keyof typeof INSTRUMENT_TYPE];