import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

// 配置 Aptos 网络（使用测试网）
const config = new AptosConfig({ network: Network.TESTNET });
export const aptos = new Aptos(config);

// 合约地址（支持环境变量或硬编码）
export const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS || '0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb';
export const MODULE_NAME = 'prediction_market';

// Octas 转 APT (1 APT = 100000000 Octas)
export const OCTAS_PER_APT = 100000000;

export function octasToApt(octas: number): number {
  return octas / OCTAS_PER_APT;
}

export function aptToOctas(apt: number): number {
  return Math.floor(apt * OCTAS_PER_APT);
}

