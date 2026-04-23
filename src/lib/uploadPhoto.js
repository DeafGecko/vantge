import { supabase } from './supabase'

/**
 * Uploads a photo to Supabase Storage and creates a media_queue row.
 * Also captures device/browser info for beta testing analytics.
 *
 * @param {Object} params
 * @param {Blob|File} params.blob - The image blob or File object
 * @param {string} params.eventId - UUID of the event
 * @param {string} params.guestName - Optional guest name
 * @returns {Promise<Object>} - { success, storagePath?, originalUrl?, error? }
 */
export async function uploadPhoto({ blob, eventId, guestName = '' }) {
      try {
            const mimeType = blob.type || 'image/jpeg'
            const extension = getExtensionFromMime(mimeType)

            const timestamp = Date.now()
            const random = Math.random().toString(36).substring(2, 8)
            const storagePath = `${eventId}/${timestamp}-${random}.${extension}`

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

            const { data: urlData } = supabase.storage
                  .from('event-media')
                  .getPublicUrl(storagePath)

            const originalUrl = urlData.publicUrl

            // Capture device info for beta testing analytics
            const deviceInfo = getDeviceInfo()

            const { error: insertError } = await supabase
                  .from('media_queue')
                  .insert({
                        event_id: eventId,
                        storage_path: storagePath,
                        original_url: originalUrl,
                        guest_name: guestName.trim() || null,
                        status: 0,
                        is_video: false,
                        user_agent: deviceInfo.user_agent,
                        device_type: deviceInfo.device_type,
                        viewport: deviceInfo.viewport,
                        file_size_bytes: blob.size || null,
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

function getDeviceInfo() {
      try {
            const ua = navigator.userAgent
            const viewport = `${window.innerWidth}×${window.innerHeight}`

            let deviceType = 'Unknown'
            if (/iPhone/i.test(ua)) deviceType = 'iPhone'
            else if (/iPad/i.test(ua)) deviceType = 'iPad'
            else if (/Android/i.test(ua)) deviceType = 'Android'
            else if (/Macintosh/i.test(ua)) deviceType = 'Mac'
            else if (/Windows/i.test(ua)) deviceType = 'Windows'
            else if (/Linux/i.test(ua)) deviceType = 'Linux'

            return {
                  user_agent: ua,
                  device_type: deviceType,
                  viewport: viewport,
            }
      } catch (err) {
            return {
                  user_agent: null,
                  device_type: null,
                  viewport: null,
            }
      }
}