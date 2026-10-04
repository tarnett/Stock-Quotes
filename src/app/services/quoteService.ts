// src/app/services/quote.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';
import { environment } from '../../environments/environment';
import { CnbcQuote } from '../models/cnbcQuote';

interface RawQuote {
  symbol?: string;
  last?: string;
  change?: string;
  change_pct?: string;
  volume?: string;
  high?: string;
  low?: string;
  open?: string;
  previous_day_closing?: string;
  responseTime?: string;
}

@Injectable({
  providedIn: 'root'
})
export class QuoteService {
  constructor(private http: HttpClient) {}

  async getQuotes(symbols: string[]): Promise<CnbcQuote[]> {
    const encodedSymbols = symbols.map((symbol) => symbol.trim()).join('|');
    const url = `${environment.cnbcQuoteUrl}${encodedSymbols}`;

    return firstValueFrom(this.http.get(url, { responseType: 'text' }).pipe(
      map((rawResponse) => {
        const rows = this.parseResponse(rawResponse);
        return rows.map((q) => ({
          symbol: q.symbol ?? '',
          last: Number(q.last ?? 0),
          change: Number(q.change ?? 0),
          change_pct: Number(q.change_pct ?? 0),
          volume: Number(q.volume ?? 0),
          high: Number(q.high ?? 0),
          low: Number(q.low ?? 0),
          open: Number(q.open ?? 0),
          previousClose: Number(q.previous_day_closing ?? 0),
          responseTime: q.responseTime ?? ''
        }));
      })
    ));
  }

  private parseResponse(payload: string): RawQuote[] {
    const trimmed = payload.trim();

    if (trimmed.startsWith('<')) {
      return this.parseXmlPayload(trimmed);
    }

    try {
      const parsed = JSON.parse(trimmed) as {
        QuickQuoteResult?: { QuickQuote?: RawQuote[] | RawQuote };
      };
      const rows = parsed.QuickQuoteResult?.QuickQuote ?? [];
      return Array.isArray(rows) ? rows : [rows];
    } catch {
      const firstBraceIndex = trimmed.indexOf('{');
      const lastBraceIndex = trimmed.lastIndexOf('}');

      if (firstBraceIndex < 0 || lastBraceIndex < 0 || firstBraceIndex >= lastBraceIndex) {
        return this.parseXmlPayload(trimmed);
      }

      const jsonSlice = trimmed.slice(firstBraceIndex, lastBraceIndex + 1);
      const parsed = JSON.parse(jsonSlice) as {
        QuickQuoteResult?: { QuickQuote?: RawQuote[] | RawQuote };
      };

      const rows = parsed.QuickQuoteResult?.QuickQuote ?? [];
      return Array.isArray(rows) ? rows : [rows];
    }
  }

  private parseXmlPayload(xml: string): RawQuote[] {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    const parseError = document.querySelector('parsererror');

    if (parseError) {
      throw new Error('Unable to parse CNBC quote response.');
    }

    const nodes = Array.from(document.querySelectorAll('quickQuote'));
    return nodes.map((node) => {
      const read = (tag: string): string => node.querySelector(tag)?.textContent?.trim() ?? '0';
      // switch (read('symbol')) {
      //   case 'SPCX':

      // }
      return {
        symbol: read('symbol'),
        last: read('last'),
        change: read('change'),
        change_pct: read('change_pct'),
        volume: read('volume'),
        high: read('high'),
        low: read('low'),
        open: read('open'),
        previous_day_closing: read('previous_day_closing'),
        responseTime: read('last_time')
      };
    }).filter((quote) => quote.symbol.length > 0);
  }
}
