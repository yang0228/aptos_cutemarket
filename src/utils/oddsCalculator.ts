/**
 * 计算赔率和预期收益
 */

export interface OddsInfo {
  odds: number;          // 赔率（如 2.5 表示投 1 赚 2.5）
  probability: number;   // 隐含概率（百分比）
  expectedReturn: number; // 预期收益（APT）
}

/**
 * 计算某个选项的赔率
 * @param optionPool 该选项的投注池
 * @param totalPool 总投注池
 * @param feeRate 平台手续费率（默认 2%）
 * @returns 赔率信息
 */
export function calculateOdds(
  optionPool: number,
  totalPool: number,
  feeRate: number = 0.02
): OddsInfo {
  if (totalPool === 0 || optionPool === 0) {
    return {
      odds: 1,
      probability: 0,
      expectedReturn: 0,
    };
  }

  // 扣除手续费后的奖池
  const prizePool = totalPool * (1 - feeRate);

  // 赔率 = 奖池 / 该选项投注额
  const odds = prizePool / optionPool;

  // 隐含概率 = 该选项投注额 / 总投注额
  const probability = (optionPool / totalPool) * 100;

  return {
    odds: Number(odds.toFixed(2)),
    probability: Number(probability.toFixed(1)),
    expectedReturn: 0, // 稍后计算
  };
}

/**
 * 计算用户下注后的预期收益
 * @param betAmount 用户下注金额
 * @param optionPool 该选项当前投注池
 * @param totalPool 总投注池
 * @param feeRate 平台手续费率
 * @returns 预期收益（如果获胜）
 */
export function calculateExpectedReturn(
  betAmount: number,
  optionPool: number,
  totalPool: number,
  feeRate: number = 0.02
): number {
  if (betAmount === 0) return 0;

  // 加上用户下注后的新池子
  const newOptionPool = optionPool + betAmount;
  const newTotalPool = totalPool + betAmount;
  const newPrizePool = newTotalPool * (1 - feeRate);

  // 用户能获得的奖金 = (用户投注 / 获胜选项总额) * 奖池
  const userPrize = (betAmount / newOptionPool) * newPrizePool;

  return Number(userPrize.toFixed(4));
}

/**
 * 格式化赔率显示
 */
export function formatOdds(odds: number): string {
  if (odds < 1) return '1.00';
  return odds.toFixed(2);
}

/**
 * 格式化概率显示
 */
export function formatProbability(probability: number): string {
  return `${probability.toFixed(1)}%`;
}

/**
 * 计算盈利率
 */
export function calculateProfitRate(betAmount: number, expectedReturn: number): number {
  if (betAmount === 0) return 0;
  return ((expectedReturn - betAmount) / betAmount) * 100;
}


