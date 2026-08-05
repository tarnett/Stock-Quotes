// src/app/models/quote.model.ts
export interface CnbcQuote {
  symbol: string;
  last: number;
  change: number;
  change_pct: number;
  volume: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  responseTime: string;
}
