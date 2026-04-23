import { supabase } from './supabase'

/**
 * Uploads a photo to Supabase Storage and creates a media_queue row.
 *
 * Works with both Blob (from canvas.toBlob) and File (from <input type="file">) 
 * because File extends Blob.
 *
 * @param {Object} params
 * @param {Blob|File} params.blob - The image blob or File object
 * @param {string} params.eventId - UUID of the event
 * @param {string} params.guestName - Optional guest name (or '')
 * @returns {Promise<Object>} - { success, storagePath?, originalUrl?, error? }
 */
export async function uploadPhoto({ blob, eventId, guestName = '' }) {
      try {
            // Detect file extension from the blob's type (or default to jpg)
            const mimeType = blob.type || 'image/jpeg'
            const extension = getExtensionFromMime(mimeType)

            // Generate unique file path
            const timestamp = Date.now()
            const random = Math.random().toString(36).substring(2, 8)
            const storagePath = `${eventId}/${timestamp}-${random}.${extension}`

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                  .from('event-media')
                  .upload(storagePath, blob, {
                        contentType: mimeType,
                        cacheControl: '3600',
                        upsert: false,
                  })

            if (uploadError) {
                  console.error('Storage upload failed:', uploadError)
                  return { success: false, error: uploadError.message }
            }

            // Get public URL
            const { data: urlData } = supabase.storage
                  .from('event-media')
                  .getPublicUrl(storagePath)

            const originalUrl = urlData.publicUrl

            // Insert media_queue row
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

function getExtensionFromMime(mimeType) {
      const map = {
            'image/jpeg': 'jpg',
            'image/jpg': 'jpg',
            'image/png': 'png',
            'image/webp': 'webp',
            'image/heic': 'heic',
            'image/heif': 'heif',
            'image/gif': 'gif',
      }
      return map[mimeType.toLowerCase()] || 'jpg'
}