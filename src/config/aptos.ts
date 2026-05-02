import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const config = new AptosConfig({ network: Network.TESTNET });
export const aptos = new Aptos(config);

export const MODULE_ADDRESS = import.meta.env.VITE_MODULE_ADDRESS || '0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16';

// Module names for the new modular contract
export const MODULES = {
  MARKET_CORE: 'market_core',
  AMM: 'amm',
  ORACLE: 'oracle',
  GOVERNANCE: 'governance',
  EVENTS: 'events',
} as const;

export const OCTAS_PER_APT = 100000000;

export function octasToApt(octas: number): number {
  return octas / OCTAS_PER_APT;
}

export function aptToOctas(apt: number): number {
  return Math.floor(apt * OCTAS_PER_APT);
}
