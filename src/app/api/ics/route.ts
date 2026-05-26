import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { listIcs, createIc } from '@/db/ics';

export async function GET() {
  const ics = listIcs();
  return NextResponse.json(ics);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.id || !body.name || !body.data) {
    return NextResponse.json(
      { error: 'Missing required fields: id, name, data' },
      { status: 400 }
    );
  }

  try {
    const ic = createIc({
      id: body.id,
      name: body.name,
      manufacturer: body.manufacturer,
      data: body.data,
    });
    return NextResponse.json(ic, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: `IC with id '${body.id}' already exists` }, { status: 409 });
    }
    throw e;
  }
}
