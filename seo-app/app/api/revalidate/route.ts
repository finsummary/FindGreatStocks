import { revalidatePath } from 'next/cache';
import { NextRequest } from 'next/server';

/**
 * On-demand revalidation for SEO pages.
 * Call POST /api/revalidate?path=/stocks/aapl (with optional secret).
 */
export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret') ?? request.headers.get('x-revalidate-secret');
  const expected = process.env.REVALIDATE_SECRET;
  if (expected && secret !== expected) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const path = request.nextUrl.searchParams.get('path');
  if (!path) {
    return Response.json({ error: 'path required' }, { status: 400 });
  }
  try {
    revalidatePath(path);
    return Response.json({ revalidated: true, path });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
}
