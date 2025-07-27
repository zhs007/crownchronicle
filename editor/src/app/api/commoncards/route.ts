import { getAllCommonCards } from '@/lib/dataManager';

export async function GET() {
  const cards = await getAllCommonCards();
  return Response.json(cards);
}
