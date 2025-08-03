// Simple health check endpoint for Next.js 13+ app directory
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok' });
}
