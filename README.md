# 🤖 x402 Autonomous AI Agent Starter Kit (Brazil AI Suite)

> Build and deploy autonomous AI agents that can seamlessly pay for and consume professional APIs on the edge via **x402 protocol** (USDC on Base Mainnet) or via **Card/PIX Gateway**.

---

## 🚀 Overview

This starter kit provides production-ready code to empower any AI Agent (Coinbase AgentKit, LangChain, Vercel AI SDK, AutoGPT, Claude MCP) to invoke the **Brazil AI & x402 Suite**:

1. **Web Enrichment v2** (`$0.002 USDC`): Scrapes and cleans web context with token compression.
2. **BCB Financial Calculators** (`$0.005 USDC`): Official BCB SGS inflation (IPCA/SELIC/CDI), PTAX exchange rates, and Price/SAC.
3. **BR Docs Parser** (`$0.008 USDC`): FEBRABAN Mod-10/11 barcode/line reader (post-2025 maturity factor) + DARF/FGTS.
4. **Tax & Payroll Engine** (`$0.008 USDC`): Simples Nacional Annexes I-V, Fator R 28%, INSS/IRRF, B2B withholdings.
5. **NF-e XML Auditor** (`$0.010 USDC`): SEFAZ 4.00 XML invoice integrity, tax balance, and metadata extraction.
6. **Business Intel & PIX** (`$0.010 USDC`): CNPJ registry enrichment and EMV-standard PIX QR Code generation.
7. **Agent Guard** (`$0.008 USDC`): Real-time prompt injection defense and security guardrail.

---

## 🛠️ Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/brunopompeo1/x402-agent-starter.git
cd x402-agent-starter
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Set your EVM private key (funded with a few cents of USDC on Base Mainnet) or configure Coinbase Developer Platform (CDP) API keys.

```env
WALLET_PRIVATE_KEY=0x...
RPC_URL=https://base-rpc.publicnode.com
```

### 3. Run Direct Payment Client (Crypto/USDC)

```bash
npm run test:direct
```

The client will:
- Check your Base USDC balance
- Call the target API endpoint
- Intercept the `HTTP 402 Payment Required` header
- Sign and broadcast the on-chain transfer
- Re-send request with payment proof headers (`X-PAYMENT`)
- Print the fulfilled JSON response in milliseconds

### 4. Run Proxy Client (Credit Card / PIX - No Crypto Needed)

If your users or agents don't have crypto wallets yet, use our pre-configured serverless payment proxy:

```bash
npm run test:proxy
```

It creates an instant Stripe checkout link or Mercado Pago PIX QR Code, polls the status, and returns the result upon payment confirmation.

---

## 🧩 Using with LangChain / Agent Frameworks

```typescript
import { ChatOpenAI } from '@langchain/openai';
import { createBrazilAiTools } from './src/agent.js';
import { X402DirectClient } from './src/direct-client.js';

const client = new X402DirectClient(process.env.WALLET_PRIVATE_KEY as `0x${string}`);
const tools = createBrazilAiTools(client);

// Give the tools to your LLM Agent:
const model = new ChatOpenAI({ model: 'gpt-4o' }).bindTools(tools);
```

---

## 📜 License

MIT License. Developed by Bruno Pompeo (Architect x402).
