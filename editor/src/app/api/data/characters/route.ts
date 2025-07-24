import { NextRequest, NextResponse } from 'next/server';
import { EditorDataManager } from '@/lib/dataManager';

const dataManager = new EditorDataManager();

export async function GET() {
  try {
    const characters = await dataManager.getAllCharacters();
    return NextResponse.json(characters);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to fetch characters';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const characterData = await request.json();
    await dataManager.saveCharacter(characterData.id, characterData);
    
    return NextResponse.json(
      { message: 'Character saved successfully', id: characterData.id },
      { status: 201 }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to save character';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
