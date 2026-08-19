import { NextResponse } from 'next/server';

export const revalidate = 0; // Live sync on page load

const FOLDER_ID = '1AvSHNysv8fda_6b4M6FliRi0aU4aSNLg';

export async function GET() {
  try {
    const folderUrl = `https://drive.google.com/drive/folders/${FOLDER_ID}`;
    const res = await fetch(folderUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch Google Drive folder: ${res.statusText}`);
    }

    const html = await res.text();

    // Match 33-character Google Drive file IDs starting with '1'
    const matches = Array.from(html.matchAll(/"(1[a-zA-Z0-9_-]{32})"/g)).map((m) => m[1]);
    const fileIds = Array.from(new Set(matches)).filter((id) => id !== FOLDER_ID);

    const images = fileIds.map((id, index) => ({
      id,
      title: `ChessHub Academy Moment #${index + 1}`,
      url: `https://lh3.googleusercontent.com/d/${id}=w1600`,
      thumbnailUrl: `https://lh3.googleusercontent.com/d/${id}=w800`,
      downloadBlockUrl: `https://lh3.googleusercontent.com/d/${id}=w1200`,
    }));

    return NextResponse.json({
      success: true,
      folderId: FOLDER_ID,
      count: images.length,
      images,
    });
  } catch (error: any) {
    console.error('Error fetching Google Drive gallery:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch gallery images',
        folderId: FOLDER_ID,
        images: [],
      },
      { status: 500 }
    );
  }
}
