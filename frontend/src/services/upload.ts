import { supabase } from '../lib/supabase';

/**
 * Uploads a set of image files to Supabase storage
 * @param files Array of File objects to upload
 * @returns Promise resolving to an array of public URLs
 */
export const uploadListingImages = async (files: File[]): Promise<string[]> => {
  const uploadedUrls: string[] = [];
  const BUCKET_NAME = 'listings';

  // Debug: Check auth state
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Upload service - Auth Session:', session ? 'Active' : 'None', 'User:', session?.user?.id);

  if (!session) {
    throw new Error('User must be authenticated to upload images.');
  }

  for (const file of files) {
    try {
      // Generate a unique file path: userId/listingId/filename or just a random path
      // Since we might not have listingId yet, we'll just use a random folder or flat structure with unique names
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file);

      if (uploadError) {
        console.error('Error uploading file:', uploadError);
        // If bucket doesn't exist, we might want to handle that specific error 
        // but for now we throw to stop the process or continue? 
        // Let's continue to try other files or fail the whole batch? 
        // Usually better to fail if an image can't be uploaded.
        throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
      }

      const { data } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      if (data) {
        uploadedUrls.push(data.publicUrl);
      }
    } catch (error) {
      console.error('Upload service error:', error);
      throw error;
    }
  }

  return uploadedUrls;
};