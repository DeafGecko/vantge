import { supabase } from './supabase'

/**
 * Uploads a photo blob to Supabase Storage and creates a media_queue row.
 *
 * @param {Object} params
 * @param {Blob} params.blob - The JPEG blob from canvas.toBlob()
 * @param {string} params.eventId - UUID of the event (from events.id)
 * @param {string} params.guestName - Optional name the guest entered (or '')
 * @returns {Promise<Object>} - Success: { success: true, mediaId, storagePath }
 *                              Failure: { success: false, error }
 */
export async function uploadPhoto({ blob, eventId, guestName = '' }) {
      try {
            // Step 1: generate a unique file path
            // Format: {eventId}/{timestamp}-{random}.jpg
            // Using timestamp + random to avoid collisions even with very fast uploads
            const timestamp = Date.now()
            const random = Math.random().toString(36).substring(2, 8)
            const storagePath = `${eventId}/${timestamp}-${random}.jpg`

            // Step 2: upload the blob to Supabase Storage
            const { data: uploadData, error: uploadError } = await supabase.storage
                  .from('event-media')
                  .upload(storagePath, blob, {
                        contentType: 'image/jpeg',
                        cacheControl: '3600',
                        upsert: false,
                  })

            if (uploadError) {
                  console.error('Storage upload failed:', uploadError)
                  return { success: false, error: uploadError.message }
            }

            // Step 3: get the public URL for the uploaded file
            const { data: urlData } = supabase.storage
                  .from('event-media')
                  .getPublicUrl(storagePath)

            const originalUrl = urlData.publicUrl

            // Step 4: insert a row in media_queue so the host sees this upload
            const { error: insertError } = await supabase
                  .from('media_queue')
                  .insert({
                        event_id: eventId,
                        storage_path: storagePath,
                        original_url: originalUrl,
                        guest_name: guestName.trim() || null,
                        status: 0,
                        is_video: false,
                  })

            if (insertError) {
                  // If the DB insert failed, try to clean up the orphaned file
                  console.error('Database insert failed:', insertError)
                  await supabase.storage.from('event-media').remove([storagePath])
                  return { success: false, error: insertError.message }
            }

            return {
                  success: true,
                  storagePath,
                  originalUrl,
            }
            
      } catch (err) {
            console.error('Unexpected upload error:', err)
            return { success: false, error: err.message || 'Upload failed' }
      }
}