import { Aptos, AptosConfig, Network } from '@aptos-labs/ts-sdk';

const aptos = new Aptos(new AptosConfig({ network: Network.TESTNET }));
const addr = process.argv[2] || '0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16';

async function main() {
  console.log(`Funding ${addr}...`);
  await aptos.fundAccount({ accountAddress: addr, amount: 100_000_000_000 }); // 1000 APT
  const bal = await aptos.getAccountAPTAmount({ accountAddress: addr });
  console.log(`Balance: ${Number(bal) / 100_000_000} APT`);
}

main().catch(console.error);
