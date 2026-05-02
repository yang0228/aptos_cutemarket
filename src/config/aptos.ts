import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const config = new AptosConfig({ network: Network.TESTNET });
export const aptos = new Aptos(config);

export const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS || '0x8ebb5f208e99f14584dc352204b107f8c9570a8481cf23e830fee296bd1515cb';

// Module names for the new modular contract
export const MODULES = {
  MARKET_CORE: 'market_core',
  AMM: 'amm',
  ORACLE: 'oracle',
  GOVERNANCE: 'governance',
  EVENTS: 'events',
} as const;

// Legacy module name (for backward compatibility during migration)
export const MODULE_NAME = 'prediction_market';

export const OCTAS_PER_APT = 100000000;

export function octasToApt(octas: number): number {
  return octas / OCTAS_PER_APT;
}

export function aptToOctas(apt: number): number {
  return Math.floor(apt * OCTAS_PER_APT);
}
