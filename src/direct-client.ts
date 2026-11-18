import 'dotenv/config';
import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { BRAZIL_AI_APIS, PAY_TO_ADDRESS, USDC_BASE_CONTRACT } from './config.js';

const USDC_ABI = [
  { name: 'transfer', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'to', type: 'address' }, { name: 'value', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
  { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: '', type: 'uint256' }] },
] as const;

export class X402DirectClient {
  private walletClient;
  private publicClient;
  private account;

  constructor(privateKey: `0x${string}`, rpcUrl = 'https://base-rpc.publicnode.com') {
    this.account = privateKeyToAccount(privateKey);
    const transport = http(rpcUrl);
    this.publicClient = createPublicClient({ chain: base, transport });
    this.walletClient = createWalletClient({ account: this.account, chain: base, transport });
  }

  async getUsdcBalance(): Promise<number> {
    const balance = await this.publicClient.readContract({
      address: USDC_BASE_CONTRACT as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'balanceOf',
      args: [this.account.address],
    });
    return Number(formatUnits(balance, 6));
  }

  async callApi(apiId: keyof typeof BRAZIL_AI_APIS, payload?: Record<string, unknown>, queryParams?: Record<string, string>) {
    const api = BRAZIL_AI_APIS[apiId];
    if (!api) throw new Error(`Unknown API: ${String(apiId)}`);

    const url = api.method === 'GET' && queryParams
      ? `${api.url}?${new URLSearchParams(queryParams).toString()}`
      : api.url;

    // 1. Initial invocation (expect 402 challenge or free tier)
    const initialRes = await fetch(url, {
      method: api.method,
      headers: { 'Content-Type': 'application/json' },
      body: api.method === 'POST' ? JSON.stringify(payload || {}) : undefined,
    });

    if (initialRes.status === 200) {
      return await initialRes.json();
    }

    if (initialRes.status !== 402) {
      const errText = await initialRes.text();
      throw new Error(`Unexpected HTTP status ${initialRes.status}: ${errText}`);
    }

    console.log(`[x402] Received 402 Payment Required for ${api.name}. Price: $${api.priceUsdc} USDC`);

    // 2. Check balance
    const balance = await this.getUsdcBalance();
    if (balance < api.priceUsdc) {
      throw new Error(`Insufficient USDC balance. Have $${balance}, need $${api.priceUsdc}`);
    }

    // 3. Settle on Base Mainnet
    console.log(`[x402] Settling micropayment to ${PAY_TO_ADDRESS}...`);
    const txHash = await this.walletClient.writeContract({
      address: USDC_BASE_CONTRACT as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'transfer',
      args: [PAY_TO_ADDRESS as `0x${string}`, parseUnits(api.priceUsdc.toFixed(6), 6)],
    });

    console.log(`[x402] Transaction confirmed on Base: ${txHash}`);

    // 4. Repeat request with x402 payment proof headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-PAYMENT': txHash,
      'X-PAYMENT-CHAIN': 'base',
      'X-PAYMENT-TOKEN': USDC_BASE_CONTRACT,
      'X-PAYMENT-AMOUNT': (api.priceUsdc * 1_000_000).toString(),
      'X-PAYMENT-RECIPIENT': PAY_TO_ADDRESS,
    };

    const paidRes = await fetch(url, {
      method: api.method,
      headers,
      body: api.method === 'POST' ? JSON.stringify(payload || {}) : undefined,
    });

    if (!paidRes.ok) {
      throw new Error(`Paid request failed with status ${paidRes.status}: ${await paidRes.text()}`);
    }

    return await paidRes.json();
  }
}

// Standalone quick run test
if (process.argv[1]?.includes('direct-client')) {
  const pk = process.env.WALLET_PRIVATE_KEY as `0x${string}`;
  if (!pk) {
    console.error('Error: Set WALLET_PRIVATE_KEY in .env before running directly.');
    process.exit(1);
  }
  const client = new X402DirectClient(pk);
  client.getUsdcBalance().then((bal) => {
    console.log(`Connected wallet address: ${client['account'].address}`);
    console.log(`USDC Balance: $${bal.toFixed(4)} USDC`);
  });
}
