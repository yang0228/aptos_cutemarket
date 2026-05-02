export interface MarketMeta {
  market_id: number;
  market_address: string;
  creator: string;
  category: number;
  created_at: number;
}

export interface MarketData {
  market_id: number;
  name: string;
  description: string;
  options: string[];
  option_pools: number[];      // in APT
  total_pool: number;           // in APT
  end_timestamp: number;
  is_settled: boolean;
  winning_option: number;
}

export interface UserBetRecord {
  option_index: number;
  shares: number;
  cost: number;                 // in APT
}

export const CATEGORY_LABELS: Record<number, string> = {
  0: '体育',
  1: '加密货币',
  2: '政治',
  3: '娱乐',
  4: '科技',
  5: '其他',
};
