// src/app/components/quotes/quotes.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { interval, Subscription } from 'rxjs';
import { QuoteService } from '../services/quoteService';
import { CnbcQuote } from '../models/cnbcQuote';
import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectorRef } from '@angular/core';

interface StockHolding {
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;
}

interface WatchlistRow {
  symbol: string;
  name: string;
  shares: number;
  costBasis: number;
  quote: CnbcQuote;
  marketValue: number;
  dayPnl: number;
  dayPnlPct: number;
  totalPnl: number;
  totalPnlPct: number;
}

interface PortfolioSummary {
  totalCost: number;
  totalMarketValue: number;
  totalDayPnl: number;
  totalPnl: number;
  totalPnlPct: number;
}

@Component({
  selector: 'app-quotes',
  imports: [DecimalPipe, DatePipe, CurrencyPipe],
  templateUrl: './quotes.html',
  styleUrls: ['./quotes.css'],
})
export class QuotesComponent implements OnInit, OnDestroy {
  symbols = ['SPCX', 'NVDA'];
  quotes: CnbcQuote[] = [];
  rows: WatchlistRow[] = [];
  loading = false;
  error: string | null = null;
  refreshSub?: Subscription;
  currentDate = new Date();

  readonly stocks: StockHolding[] = [
    { symbol: 'SPCX', name: 'SpaceX Exploration Technologies Corp', shares: 6, costBasis: 159.89 },
    { symbol: 'NVDA', name: 'NVIDIA Corporation', shares: 5, costBasis: 181.77 },
    { symbol: 'MSFT', name: 'Microsoft Corporation', shares: 2, costBasis: 462.64 },
  ];

  readonly summary: PortfolioSummary = {
    totalCost: 0,
    totalMarketValue: 0,
    totalDayPnl: 0,
    totalPnl: 0,
    totalPnlPct: 0,
  };

  constructor(private quoteService: QuoteService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.symbols = this.stocks.map((stock) => stock.symbol);
    this.loadQuotes();

    this.refreshSub = interval(10000).subscribe(() => this.loadQuotes());
  }

  ngOnDestroy(): void {
    this.refreshSub?.unsubscribe();
  }

  async loadQuotes(): Promise<void> {
    if (this.loading) return;

    this.loading = true;
    this.error = null;

    try {
      const data = await this.quoteService.getQuotes(this.symbols);
      this.quotes = data;
      this.buildRowsAndSummary(data);
      this.currentDate = new Date();
    } catch (err) {
      console.error('Error loading quotes:', err);
      this.error = 'Failed to load quotes.';
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private buildRowsAndSummary(quotes: CnbcQuote[]): void {
    const quoteBySymbol = new Map(quotes.map((quote) => [quote.symbol, quote]));

    this.rows = this.stocks
    .map((stock) => {
      const quote = quoteBySymbol.get(stock.symbol);
      if (!quote) {
        return null;
      }

      const totalCost = stock.shares * stock.costBasis;
      const marketValue = stock.shares * quote.last;
      const dayPnl = stock.shares * quote.change;
      const previousValue = marketValue - dayPnl;
      const totalPnl = marketValue - totalCost;

      return {
        symbol: stock.symbol,
        name: stock.name,
        shares: stock.shares,
        costBasis: stock.costBasis,
        quote,
        marketValue,
        dayPnl,
        dayPnlPct: previousValue > 0 ? (dayPnl / previousValue) * 100 : 0,
        totalPnl,
        totalPnlPct: totalCost > 0 ? (totalPnl / totalCost) * 100 : 0,
      };
    })
    .filter((row): row is WatchlistRow => row !== null);

    const totals = this.rows.reduce(
      (acc, row) => {
        const totalCost = row.shares * row.costBasis;
        acc.totalCost += totalCost;
        acc.totalMarketValue += row.marketValue;
        acc.totalDayPnl += row.dayPnl;
        acc.totalPnl += row.totalPnl;
        return acc;
      },
      {
        totalCost: 0,
        totalMarketValue: 0,
        totalDayPnl: 0,
        totalPnl: 0,
      }
    );

    this.summary.totalCost = totals.totalCost;
    this.summary.totalMarketValue = totals.totalMarketValue;
    this.summary.totalDayPnl = totals.totalDayPnl;
    this.summary.totalPnl = totals.totalPnl;
    this.summary.totalPnlPct =
      totals.totalCost > 0 ? (totals.totalPnl / totals.totalCost) * 100 : 0;
  }

  trackBySymbol(_: number, row: WatchlistRow): string {
    return row.symbol;
  }

  isUp(valueOrRow: number | WatchlistRow): boolean {
    const value = typeof valueOrRow === 'number' ? valueOrRow : valueOrRow.quote.change;
    return value > 0;
  }

  isDown(valueOrRow: number | WatchlistRow): boolean {
    const value = typeof valueOrRow === 'number' ? valueOrRow : valueOrRow.quote.change;
    return value < 0;
  }
}
