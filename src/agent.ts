import 'dotenv/config';
import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { BRAZIL_AI_APIS } from './config.js';
import { X402DirectClient } from './direct-client.js';

export function createBrazilAiTools(client: X402DirectClient) {
  return [
    new DynamicStructuredTool({
      name: 'web_enrichment',
      description: 'Scrapes and cleans any public webpage, stripping boilerplate into token-compressed markdown context.',
      schema: z.object({ url: z.string().url() }),
      func: async ({ url }) => {
        const res = await client.callApi('webEnrichment', undefined, { url });
        return JSON.stringify(res);
      },
    }),
    new DynamicStructuredTool({
      name: 'bcb_financial_calculators',
      description: 'Calculates Brazilian Central Bank monetary corrections (IPCA, SELIC, CDI), PTAX currency exchange rates, or loan schedules.',
      schema: z.object({
        operation: z.enum(['selic', 'ipca', 'cdi', 'ptax', 'price', 'sac']),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        currency: z.string().optional(),
      }),
      func: async (args) => {
        const res = await client.callApi('bcbCalculators', args);
        return JSON.stringify(res);
      },
    }),
    new DynamicStructuredTool({
      name: 'br_docs_parser',
      description: 'Parses and validates FEBRABAN Boletos (line/barcode with 2025+ maturity rules) and DARF/FGTS tax collection forms.',
      schema: z.object({ text: z.string() }),
      func: async ({ text }) => {
        const res = await client.callApi('docsParser', { text });
        return JSON.stringify(res);
      },
    }),
    new DynamicStructuredTool({
      name: 'tax_and_payroll_calculator',
      description: 'Calculates Simples Nacional tax, Fator R 28% compliance, Progressive INSS/IRRF payroll, and invoice withholdings.',
      schema: z.object({
        rbt12: z.number().describe('Trailing 12-month gross revenue in BRL'),
        revenueMonth: z.number().describe('Monthly gross revenue in BRL'),
        annex: z.enum(['I', 'II', 'III', 'IV', 'V']),
        payroll12: z.number().optional().describe('Trailing 12-month payroll in BRL'),
      }),
      func: async (args) => {
        const res = await client.callApi('taxPayroll', args);
        return JSON.stringify(res);
      },
    }),
    new DynamicStructuredTool({
      name: 'nfe_xml_auditor',
      description: 'Audits Brazilian NF-e SEFAZ 4.00 XML invoices, checking totals, tax reconciliation, and key metadata.',
      schema: z.object({ xml: z.string() }),
      func: async ({ xml }) => {
        const res = await client.callApi('nfeAuditor', { xml });
        return JSON.stringify(res);
      },
    }),
    new DynamicStructuredTool({
      name: 'business_intel_and_pix',
      description: 'Queries Brazilian company data (CNPJ) and generates compliant PIX EMV payment payloads.',
      schema: z.object({
        operation: z.enum(['cnpj', 'pix_payload']),
        cnpj: z.string().optional(),
        pixKey: z.string().optional(),
        amount: z.number().optional(),
        merchantName: z.string().optional(),
      }),
      func: async (args) => {
        const res = await client.callApi('businessIntel', args);
        return JSON.stringify(res);
      },
    }),
    new DynamicStructuredTool({
      name: 'agent_guard_security',
      description: 'Security shield that inspects prompts and tool outputs for injection attacks and malicious instructions.',
      schema: z.object({ input: z.string() }),
      func: async ({ input }) => {
        const res = await client.callApi('agentGuard', { input });
        return JSON.stringify(res);
      },
    }),
  ];
}

console.log('Brazil AI Suite Tools definition ready for LangChain / AgentKit integration.');
