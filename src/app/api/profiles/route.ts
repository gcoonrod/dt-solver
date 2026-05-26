import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { listProfiles, createProfile } from '@/db/profiles';

export async function GET() {
  const profiles = listProfiles();
  return NextResponse.json(profiles);
}

export async function POST(request: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.id || !body.name || !body.data) {
    return NextResponse.json(
      { error: 'Missing required fields: id, name, data' },
      { status: 400 }
    );
  }

  try {
    const profile = createProfile({
      id: body.id as string,
      name: body.name as string,
      description: body.description as string | undefined,
      data: body.data as object,
    });
    return NextResponse.json(profile, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: `Profile with id '${body.id}' already exists` }, { status: 409 });
    }
    throw e;
  }
}
