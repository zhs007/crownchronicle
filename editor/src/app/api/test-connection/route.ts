import { NextResponse } from 'next/server';
import { testGeminiConnection } from '@/lib/connectionTest';

export async function GET() {
  try {
    const result = await testGeminiConnection();
    return NextResponse.json(result);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Connection test failed', details: errorMessage },
      { status: 500 }
    );
  }
}
