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
  const body = await request.json();

  if (!body.name && !body.manufacturer && !body.data) {
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
