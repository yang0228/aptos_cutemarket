// src/services/indexer.ts
import { aptos, MODULE_ADDRESS, MODULES, octasToApt } from '../config/aptos';

type EventTypeId = `${string}::${string}::${string}`;

const EVENTS = {
  MARKET_CREATED: `${MODULE_ADDRESS}::${MODULES.EVENTS}::MarketCreatedEvent` as EventTypeId,
  SHARES_PURCHASED: `${MODULE_ADDRESS}::${MODULES.EVENTS}::SharesPurchasedEvent` as EventTypeId,
  SHARES_SOLD: `${MODULE_ADDRESS}::${MODULES.EVENTS}::SharesSoldEvent` as EventTypeId,
  MARKET_SETTLED: `${MODULE_ADDRESS}::${MODULES.EVENTS}::MarketSettledEvent` as EventTypeId,
  LIQUIDITY_ADDED: `${MODULE_ADDRESS}::${MODULES.EVENTS}::LiquidityAddedEvent` as EventTypeId,
  WINNINGS_CLAIMED: `${MODULE_ADDRESS}::${MODULES.EVENTS}::WinningsClaimedEvent` as EventTypeId,
};

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

// Fetch all market creation events
export async function fetchMarketCreatedEvents(): Promise<MarketCreatedEventRaw[]> {
  try {
    const events = await aptos.getModuleEventsByEventType({
      eventType: EVENTS.MARKET_CREATED,
      options: { orderBy: [{ transaction_version: 'desc' }] },
    });

    return events.map((e: any) => ({
      market_id: Number(e.data.market_id),
      market_address: e.data.market_address,
      creator: e.data.creator,
      name: e.data.name,
      options: e.data.options,
      end_timestamp: Number(e.data.end_timestamp),
      category: Number(e.data.category),
    }));
  } catch {
    return [];
  }
}

// Fetch trade events for a market
export async function fetchTradeEvents(marketId: number): Promise<TradeEvent[]> {
  try {
    const [buyEvents, sellEvents] = await Promise.all([
      aptos.getModuleEventsByEventType({
        eventType: EVENTS.SHARES_PURCHASED,
        options: { orderBy: [{ transaction_version: 'asc' }] },
      }),
      aptos.getModuleEventsByEventType({
        eventType: EVENTS.SHARES_SOLD,
        options: { orderBy: [{ transaction_version: 'asc' }] },
      }),
    ]);

    const trades: TradeEvent[] = [];

    for (const e of buyEvents as any[]) {
      if (Number(e.data.market_id) === marketId) {
        trades.push({
          type: 'buy',
          market_id: marketId,
          user: e.data.user,
          option_index: Number(e.data.option_index),
          amount: octasToApt(Number(e.data.amount)),
          shares: Number(e.data.shares_received),
          new_price_bps: Number(e.data.new_price_bps),
          timestamp: Number(e.data.timestamp),
        });
      }
    }

    for (const e of sellEvents as any[]) {
      if (Number(e.data.market_id) === marketId) {
        trades.push({
          type: 'sell',
          market_id: marketId,
          user: e.data.user,
          option_index: Number(e.data.option_index),
          amount: octasToApt(Number(e.data.amount_received)),
          shares: Number(e.data.shares),
          new_price_bps: Number(e.data.new_price_bps),
          timestamp: Number(e.data.timestamp),
        });
      }
    }

    return trades.sort((a, b) => a.timestamp - b.timestamp);
  } catch {
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
