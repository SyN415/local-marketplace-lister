import { supabase, setSupabaseSession } from '../lib/supabase';
import { getAuthToken } from '../utils/auth';

/**
 * Uploads a set of image files to Supabase storage
 * @param files Array of File objects to upload
 * @returns Promise resolving to an array of public URLs
 */
export const uploadListingImages = async (files: File[]): Promise<string[]> => {
  const uploadedUrls: string[] = [];
  const BUCKET_NAME = 'listings';

  // Attempt to get a fresh session from Supabase to ensure token validity
  // This handles token refreshing if the current access token is expired
  let { data: { session }, error: sessionError } = await supabase.auth.getSession();

  // If no session, try to restore from localStorage refresh token
  if (!session) {
    const refreshToken = localStorage.getItem('supabase_refresh_token');
    const accessToken = localStorage.getItem('supabase_access_token');
    
    if (refreshToken && accessToken) {
      console.log('Upload service - attempting to restore session from storage');
      await setSupabaseSession(accessToken, refreshToken);
      // Get session again after setting it
      const result = await supabase.auth.getSession();
      session = result.data.session;
    }
  }
  
  // Use the fresh session token if available
  let token: string | null | undefined = session?.access_token;
  
  if (!token) {
    // Fallback to stored access token (likely expired but worth a try if session failed)
    const supabaseToken = localStorage.getItem('supabase_access_token');
    token = supabaseToken;
    
    if (!token) {
        console.error('Upload service - No auth token found', { sessionError });
        throw new Error('User must be authenticated to upload images.');
    }
  }
  
  if (!token) {
    console.error('Upload service - No auth token found', { sessionError });
    throw new Error('User must be authenticated to upload images.');
  }

  for (const file of files) {
    try {
      // Generate a unique file path: userId/listingId/filename or just a random path
      // Since we might not have listingId yet, we'll just use a random folder or flat structure with unique names
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      // Set the Authorization header with the token
      // This allows Supabase Storage to verify the user even if supabase.auth.session() is empty
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

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
        // IMPORTANT: The publicUrl returned by getPublicUrl might be incorrect in local dev if Supabase URL isn't set perfectly.
        // If using local Supabase, it might be returning http://kong:8000/... which isn't reachable from browser.
        // We need to ensure it uses the configured Supabase URL from env.
        
        const publicUrl = data.publicUrl;
        
        // Fix for local development if needed - ensure it starts with the configured Supabase URL
        // const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        // if (supabaseUrl && !publicUrl.startsWith(supabaseUrl)) {
        //   const path = publicUrl.split('/storage/v1/object/public/')[1];
        //   uploadedUrls.push(`${supabaseUrl}/storage/v1/object/public/${BUCKET_NAME}/${path}`);
        // } else {
          uploadedUrls.push(publicUrl);
        // }
      }
    } catch (error) {
      console.error('Upload service error:', error);
      throw error;
    }
  }

  return uploadedUrls;
};