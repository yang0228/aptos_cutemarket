/**
 * Seed script to create test markets on Aptos Testnet.
 *
 * Usage:
 *   npx tsx scripts/seed-markets.ts <private-key>
 *
 * The account must have APT on Testnet. If you don't have one,
 * generate a new account:
 *   npx tsx scripts/seed-markets.ts --generate
 */

import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';

const MODULE_ADDRESS = '0xf28e42120ec3007579f530ac426b2d553f501681431a433f3584bf6d37c94f16';
const MODULE = 'market_core';
const OCTAS_PER_APT = 100_000_000n;

const config = new AptosConfig({ network: Network.TESTNET });
const aptos = new Aptos(config);

interface MarketSeed {
  name: string;
  description: string;
  options: string[];
  endTimestamp: number;
  category: number;
  resolutionType: number;
  initialLiquidity: bigint; // in octas
}

function getSeeds(): MarketSeed[] {
  const now = Math.floor(Date.now() / 1000);
  const oneDay = 86400;
  const oneWeek = 7 * oneDay;

  return [
    {
      name: 'BTC 能在 2026 年底突破 $150,000 吗？',
      description: '比特币价格预测：如果在 2026 年 12 月 31 日前 BTC 价格达到或超过 $150,000，则"是"获胜。',
      options: ['是', '否'],
      endTimestamp: now + 30 * oneDay,
      category: 1, // 加密货币
      resolutionType: 1, // Pyth
      initialLiquidity: 5n * OCTAS_PER_APT,
    },
    {
      name: '2026 FIFA 世界杯冠军',
      description: '预测 2026 年 FIFA 世界杯冠军球队。',
      options: ['巴西', '法国', '阿根廷', '英格兰', '德国'],
      endTimestamp: now + 60 * oneDay,
      category: 0, // 体育
      resolutionType: 0, // Admin
      initialLiquidity: 10n * OCTAS_PER_APT,
    },
    {
      name: 'ETH/BTC 汇率年底会超过 0.08 吗？',
      description: '以太坊对比特币汇率预测：2026 年 12 月 31 日前 ETH/BTC 是否达到 0.08。',
      options: ['是', '否'],
      endTimestamp: now + 45 * oneDay,
      category: 1, // 加密货币
      resolutionType: 1, // Pyth
      initialLiquidity: 3n * OCTAS_PER_APT,
    },
    {
      name: '下一位美国总统是谁？',
      description: '预测 2028 年美国总统大选获胜者。',
      options: ['民主党候选人', '共和党候选人', '其他'],
      endTimestamp: now + 90 * oneDay,
      category: 2, // 政治
      resolutionType: 0, // Admin
      initialLiquidity: 8n * OCTAS_PER_APT,
    },
    {
      name: 'Apple 会在 2026 年发布 AR 眼镜吗？',
      description: '预测 Apple 是否会在 2026 年内正式发布 AR/MR 眼镜产品。',
      options: ['是', '否'],
      endTimestamp: now + 14 * oneDay,
      category: 4, // 科技
      resolutionType: 0, // Admin
      initialLiquidity: 2n * OCTAS_PER_APT,
    },
    {
      name: '下周 APT 价格方向',
      description: '一周后 APT 价格相比现在是涨还是跌？',
      options: ['涨', '跌', '横盘'],
      endTimestamp: now + 7 * oneDay,
      category: 1, // 加密货币
      resolutionType: 0, // Admin
      initialLiquidity: 2n * OCTAS_PER_APT,
    },
  ];
}

async function main() {
  const args = process.argv.slice(2);

  if (args[0] === '--generate') {
    const account = Account.generate();
    console.log('Generated new account:');
    console.log(`  Address: ${account.accountAddress.toString()}`);
    console.log(`  Private Key: ${account.privateKey.toString()}`);
    console.log('\nFund this account at: https://aptoslabs.com/testnet-faucet');
    console.log('Then re-run: npx tsx scripts/seed-markets.ts <private-key>');
    return;
  }

  if (!args[0]) {
    console.error('Usage: npx tsx scripts/seed-markets.ts <private-key>');
    console.error('       npx tsx scripts/seed-markets.ts --generate');
    process.exit(1);
  }

  const privateKey = new Ed25519PrivateKey(args[0]);
  const account = Account.fromPrivateKey({ privateKey });
  console.log(`Using account: ${account.accountAddress.toString()}`);

  // Check balance
  const balance = await aptos.getAccountAPTAmount({ accountAddress: account.accountAddress });
  console.log(`Balance: ${Number(balance) / Number(OCTAS_PER_APT)} APT`);

  if (balance < 30n * OCTAS_PER_APT) {
    console.error('Insufficient balance. Need at least 30 APT for 6 markets.');
    console.error('Fund at: https://aptoslabs.com/testnet-faucet');
    process.exit(1);
  }

  const seeds = getSeeds();

  for (let i = 0; i < seeds.length; i++) {
    const seed = seeds[i];
    console.log(`\n[${ i + 1}/${seeds.length}] Creating: ${seed.name}`);

    try {
      const transaction = await aptos.transaction.build.simple({
        sender: account.accountAddress,
        data: {
          function: `${MODULE_ADDRESS}::${MODULE}::create_market`,
          typeArguments: [],
          functionArguments: [
            seed.name,
            seed.description,
            seed.options,
            seed.endTimestamp,
            seed.category,
            seed.resolutionType,
            [],   // pyth_price_id
            0,    // pyth_threshold
            false, // pyth_above_wins
            seed.initialLiquidity.toString(),
          ],
        },
      });

      const committedTxn = await aptos.signAndSubmitTransaction({ signer: account, transaction });
      await aptos.waitForTransaction({ transactionHash: committedTxn.hash });
      console.log(`  ✓ TX: ${committedTxn.hash}`);
    } catch (err: any) {
      console.error(`  ✗ Failed: ${err.message}`);
    }
  }

  console.log('\nDone! Markets should appear on the home page.');
}

main().catch(console.error);
