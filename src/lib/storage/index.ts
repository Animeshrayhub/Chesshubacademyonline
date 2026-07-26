import { createSupabaseAdmin } from '../supabase/admin';
import { BaseError, DatabaseError, ValidationError, type Result } from '../errors';

/**
 * Uploads a file (Buffer or Blob) to the specified Supabase Storage bucket.
 */
export async function uploadFile(
  bucket: 'media' | 'workbooks' | 'submissions' | 'certificates',
  filePath: string,
  fileBody: Buffer | Blob | ArrayBuffer | string,
  contentType?: string
): Promise<Result<{ path: string; publicUrl: string }>> {
  try {
    const admin = createSupabaseAdmin();

    const { data, error } = await admin.storage
      .from(bucket)
      .upload(filePath, fileBody, {
        contentType,
        upsert: true,
      });

    if (error) {
      return { success: false, error: new DatabaseError(`Storage upload failed: ${error.message}`, error) };
    }

    // Get public URL (only valid/useful directly if bucket is public, e.g. media)
    const { data: { publicUrl } } = admin.storage.from(bucket).getPublicUrl(filePath);

    return { success: true, data: { path: data.path, publicUrl } };
  } catch (error) {
    return {
      success: false,
      error: new DatabaseError(error instanceof Error ? error.message : 'Unknown storage error'),
    };
  }
}

/**
 * Deletes a file from the specified storage bucket.
 */
export async function deleteFile(
  bucket: 'media' | 'workbooks' | 'submissions' | 'certificates',
  filePath: string
): Promise<Result<{ success: boolean }>> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin.storage.from(bucket).remove([filePath]);

    if (error) {
      return { success: false, error: new DatabaseError(`Storage delete failed: ${error.message}`, error) };
    }

    return { success: true, data: { success: true } };
  } catch (error) {
    return {
      success: false,
      error: new DatabaseError(error instanceof Error ? error.message : 'Unknown storage error'),
    };
  }
}

/**
 * Generates a signed URL for private bucket access (workbooks, submissions, certificates).
 */
export async function getSignedUrl(
  bucket: 'workbooks' | 'submissions' | 'certificates',
  filePath: string,
  expiresInSeconds = 3600
): Promise<Result<string>> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.storage
      .from(bucket)
      .createSignedUrl(filePath, expiresInSeconds);

    if (error || !data?.signedUrl) {
      return { success: false, error: new DatabaseError(`Failed to generate signed URL: ${error?.message}`, error) };
    }

    return { success: true, data: data.signedUrl };
  } catch (error) {
    return {
      success: false,
      error: new DatabaseError(error instanceof Error ? error.message : 'Unknown storage error'),
    };
  }
}
