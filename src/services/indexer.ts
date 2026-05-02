// src/services/indexer.ts
import { aptos, MODULE_ADDRESS, MODULES, octasToApt } from '../config/aptos';

export interface TradeEvent {
  type: 'buy' | 'sell';
  market_id: number;
  user: string;
  option_index: number;
  amount: number;       // APT
  shares: number;
  new_price_bps: number;
  timestamp: number;
}

export interface MarketCreatedEventRaw {
  market_id: number;
  market_address: string;
  creator: string;
  name: string;
  options: string[];
  end_timestamp: number;
  category: number;
}

// Fetch all market creation events by scanning contract transactions
export async function fetchMarketCreatedEvents(): Promise<MarketCreatedEventRaw[]> {
  try {
    const txs = await aptos.getAccountTransactions({
      accountAddress: MODULE_ADDRESS,
      options: { limit: 100 },
    });

    const events: MarketCreatedEventRaw[] = [];

    for (const tx of txs) {
      if (!('events' in tx)) continue;
      for (const evt of tx.events) {
        if (evt.type === `${MODULE_ADDRESS}::${MODULES.EVENTS}::MarketCreatedEvent`) {
          const d = evt.data as any;
          events.push({
            market_id: Number(d.market_id),
            market_address: d.market_address,
            creator: d.creator,
            name: d.name,
            options: d.options,
            end_timestamp: Number(d.end_timestamp),
            category: Number(d.category),
          });
        }
      }
    }

    // Also scan individual market resource accounts for their creation events
    // (events are emitted by market_core which is the contract account)

    return events;
  } catch (err) {
    console.error('fetchMarketCreatedEvents failed:', err);
    return [];
  }
}

// Fetch trade events for a market
export async function fetchTradeEvents(marketId: number): Promise<TradeEvent[]> {
  try {
    const txs = await aptos.getAccountTransactions({
      accountAddress: MODULE_ADDRESS,
      options: { limit: 100 },
    });

    const trades: TradeEvent[] = [];

    for (const tx of txs) {
      if (!('events' in tx)) continue;
      for (const evt of tx.events) {
        const d = evt.data as any;
        if (Number(d.market_id) !== marketId) continue;

        if (evt.type === `${MODULE_ADDRESS}::${MODULES.EVENTS}::SharesPurchasedEvent`) {
          trades.push({
            type: 'buy',
            market_id: marketId,
            user: d.user,
            option_index: Number(d.option_index),
            amount: octasToApt(Number(d.amount)),
            shares: Number(d.shares_received),
            new_price_bps: Number(d.new_price_bps),
            timestamp: Number(d.timestamp),
          });
        } else if (evt.type === `${MODULE_ADDRESS}::${MODULES.EVENTS}::SharesSoldEvent`) {
          trades.push({
            type: 'sell',
            market_id: marketId,
            user: d.user,
            option_index: Number(d.option_index),
            amount: octasToApt(Number(d.amount_received)),
            shares: Number(d.shares),
            new_price_bps: Number(d.new_price_bps),
            timestamp: Number(d.timestamp),
          });
        }
      }
    }

    return trades.sort((a, b) => a.timestamp - b.timestamp);
  } catch (err) {
    console.error('fetchTradeEvents failed:', err);
    return [];
  }
}

// Fetch price history for a market (derived from trade events)
export interface PricePoint {
  timestamp: number;
  prices: number[]; // price per option in BPS (0-10000)
}

export async function fetchPriceHistory(marketId: number): Promise<PricePoint[]> {
  const trades = await fetchTradeEvents(marketId);
  return trades.map((t) => ({
    timestamp: t.timestamp,
    prices: [t.new_price_bps],
  }));
}
