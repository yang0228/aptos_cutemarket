export interface Project {
  id: number;
  name: string;
  options: string[];
  endDate: string; // YYYY-MM-DD
  description?: string;
  image?: string; // 项目图片路径
}

export enum ProjectStatus {
  Open = 'open',
  Closed = 'closed',
  Settled = 'settled',
}

export interface BetOption {
  index: number;
  name: string;
  totalAmount: number; // 当前为 0，后续从链上读取
}

