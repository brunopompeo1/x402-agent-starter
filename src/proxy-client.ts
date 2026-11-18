import 'dotenv/config';

export class X402ProxyClient {
  private proxyUrl: string;

  constructor(proxyUrl = 'https://x402-card-proxy.architect-x402.workers.dev') {
    this.proxyUrl = proxyUrl;
  }

  async createSession(apiId: string, paymentMethod: 'card' | 'pix', payload?: Record<string, unknown>, queryParams?: Record<string, string>) {
    const res = await fetch(`${this.proxyUrl}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiId, paymentMethod, payload, queryParams }),
    });

    if (!res.ok) {
      throw new Error(`Proxy error ${res.status}: ${await res.text()}`);
    }

    return await res.json() as {
      sessionId: string;
      api: string;
      amountUsdc: number;
      payment: {
        checkoutUrl?: string; // Stripe URL (for card)
        qrCode?: string;      // PIX string
        qrCodeBase64?: string;
        provider: string;
      };
      pollUrl: string;
    };
  }

  async pollUntilCompleted(sessionId: string, maxWaitSeconds = 120, intervalMs = 3000) {
    const startTime = Date.now();
    while (Date.now() - startTime < maxWaitSeconds * 1000) {
      const res = await fetch(`${this.proxyUrl}/session/${sessionId}/status`);
      if (res.ok) {
        const data = await res.json() as any;
        if (data.status === 'completed') {
          return data.result;
        }
        if (data.status === 'failed') {
          throw new Error(`Payment processing failed: ${data.error}`);
        }
      }
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    throw new Error('Timeout waiting for payment confirmation');
  }
}

// Standalone test
if (process.argv[1]?.includes('proxy-client')) {
  const client = new X402ProxyClient();
  client.createSession('web-enrichment-x402', 'card', undefined, { url: 'https://example.com' }).then((sess) => {
    console.log('--- Created Proxy Session ---');
    console.log(`Session ID: ${sess.sessionId}`);
    console.log(`Card Checkout URL: ${sess.payment.checkoutUrl}`);
    console.log(`Polling URL: ${sess.pollUrl}`);
  });
}
