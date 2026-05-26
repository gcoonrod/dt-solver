import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getIc, updateIc, deleteIc } from '@/db/ics';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ic = getIc(id);
  if (!ic) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(ic);
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

  if (body.name === undefined && body.manufacturer === undefined && body.data === undefined) {
    return NextResponse.json(
      { error: 'At least one field required: name, manufacturer, data' },
      { status: 400 }
    );
  }

  const ic = updateIc(id, {
    name: body.name,
    manufacturer: body.manufacturer,
    data: body.data,
  });

  if (!ic) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(ic);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const deleted = deleteIc(id);
  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
