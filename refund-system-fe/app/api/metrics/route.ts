import { NextResponse } from 'next/server';
import client from 'prom-client';

export const dynamic = 'force-dynamic';

const globalForPrometheus = globalThis as unknown as {
  prometheusRegistered?: boolean;
};

if (!globalForPrometheus.prometheusRegistered) {
  client.collectDefaultMetrics();
  globalForPrometheus.prometheusRegistered = true;
}

export async function GET() {
  try {
    const metrics = await client.register.metrics();
    return new NextResponse(metrics, {
      headers: {
        'Content-Type': client.register.contentType,
      },
    });
  } catch (error) {
    return new NextResponse('Error generating metrics', { status: 500 });
  }
}
