import { NextRequest, NextResponse } from 'next/server';
import { EditorDataManager } from '@/lib/dataManager';

const dataManager = new EditorDataManager();

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await context.params;
    const events = await dataManager.getCharacterEvents(characterId);
    return NextResponse.json(events);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch events';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ characterId: string }> }
) {
  try {
    const { characterId } = await context.params;
    const eventData = await request.json();
    await dataManager.saveEvent(characterId, eventData.id, eventData);
    
    return NextResponse.json(
      { message: 'Event saved successfully', id: eventData.id },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save event';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
