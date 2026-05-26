import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { listProfiles, createProfile } from '@/db/profiles';

export async function GET() {
  const profiles = listProfiles();
  return NextResponse.json(profiles);
}

export async function POST(request: NextRequest) {
  const body = await request.json();

  if (!body.id || !body.name || !body.data) {
    return NextResponse.json(
      { error: 'Missing required fields: id, name, data' },
      { status: 400 }
    );
  }

  const profile = createProfile({
    id: body.id,
    name: body.name,
    description: body.description,
    data: body.data,
  });

  return NextResponse.json(profile, { status: 201 });
}
