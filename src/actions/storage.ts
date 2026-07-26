'use server';

import * as storageService from '@/lib/storage';

export async function uploadFileAction(formData: FormData) {
  try {
    const file = formData.get('file') as File | null;
    const bucket = formData.get('bucket') as 'media' | 'workbooks' | 'submissions' | 'certificates' | null;
    const path = formData.get('path') as string | null;

    if (!file || !bucket || !path) {
      return { success: false, error: { message: 'Missing file, bucket, or path parameters.' } };
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await storageService.uploadFile(bucket, path, buffer, file.type);
    if (!result.success) {
      return {
        success: false as const,
        error: {
          message: result.error?.message || 'Storage upload failed.',
          code: (result.error as any)?.code || 'STORAGE_ERROR',
        },
      };
    }

    return {
      success: true as const,
      data: {
        path: result.data.path,
        publicUrl: result.data.publicUrl,
      },
    };
  } catch (error: any) {
    return { success: false as const, error: { message: error?.message || 'Unknown server error during file upload.' } };
  }
}

export async function getSignedUrlAction(
  bucket: 'workbooks' | 'submissions' | 'certificates',
  path: string,
  expiresInSeconds?: number
) {
  const result = await storageService.getSignedUrl(bucket, path, expiresInSeconds);
  return JSON.parse(JSON.stringify(result));
}

export async function deleteFileAction(
  bucket: 'media' | 'workbooks' | 'submissions' | 'certificates',
  path: string
) {
  const result = await storageService.deleteFile(bucket, path);
  return JSON.parse(JSON.stringify(result));
}
