import { NextResponse } from 'next/server';
import { saveBlogPost, getAdminBlogPosts, deleteBlogPost } from '@/lib/blog/service';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') as 'published' | 'draft' | undefined;
  const posts = await getAdminBlogPosts(status || undefined);
  return NextResponse.json({ success: true, posts });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, category, readingTimeMinutes, excerpt, content, imageUrl, status, id } = body;

    if (!title || !content) {
      return NextResponse.json({ success: false, error: 'Title and content are required' }, { status: 400 });
    }

    const result = await saveBlogPost(
      {
        title,
        category: category || 'Parent Guide',
        readingTimeMinutes: Number(readingTimeMinutes) || 5,
        excerpt: excerpt || '',
        content,
        imageUrl,
        status: status === 'published' ? 'published' : 'draft',
      },
      id
    );

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true, post: result.data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ success: false, error: 'ID required' }, { status: 400 });

    const result = await deleteBlogPost(id);
    if (!result.success) return NextResponse.json({ success: false, error: result.error }, { status: 500 });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
