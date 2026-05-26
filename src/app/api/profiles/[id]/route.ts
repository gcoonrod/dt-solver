import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getProfile, updateProfile, deleteProfile } from '@/db/profiles';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const profile = getProfile(id);
  if (!profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(profile);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (body.name === undefined && body.description === undefined && body.data === undefined) {
    return NextResponse.json(
      { error: 'At least one field required: name, description, data' },
      { status: 400 }
    );
  }

  const profile = updateProfile(id, {
    name: body.name as string | undefined,
    description: body.description as string | null | undefined,
    data: body.data as object | undefined,
  });

  if (!profile) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(profile);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteProfile(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
