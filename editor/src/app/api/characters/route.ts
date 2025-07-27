import { _defaultManager } from '@/lib/dataManager';

export async function GET() {
  const characters = await _defaultManager.getAllCharacters();
  return Response.json(characters);
}
