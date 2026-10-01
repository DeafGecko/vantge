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
export async function uploadPhoto({ blob, eventId, guestName = '', caption = '', status = 0, is_video = false }) {
      try {
            const mimeType = blob.type || 'image/jpeg'
            const isVideo = is_video || mimeType.startsWith('video/')
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

            // Generate and upload thumbnail for videos
            let thumbnailUrl = null
            if (isVideo) {
                  try {
                        const thumbBlob = await generateVideoThumbnail(blob)
                        if (thumbBlob) {
                              const thumbPath = `${eventId}/${timestamp}-${random}-thumb.jpg`
                              const { error: thumbError } = await supabase.storage
                                    .from('event-media')
                                    .upload(thumbPath, thumbBlob, { contentType: 'image/jpeg', cacheControl: '3600', upsert: false })
                              if (!thumbError) {
                                    const { data: thumbUrlData } = supabase.storage.from('event-media').getPublicUrl(thumbPath)
                                    thumbnailUrl = thumbUrlData.publicUrl
                              }
                        }
                  } catch (thumbErr) {
                        console.warn('Thumbnail generation failed, continuing without it:', thumbErr)
                  }
            }

            // Capture device info for beta testing analytics
            const deviceInfo = getDeviceInfo()

            const { error: insertError } = await supabase
                  .from('media_queue')
                  .insert({
                        event_id: eventId,
                        storage_path: storagePath,
                        original_url: originalUrl,
                        guest_name: guestName.trim() || null,
                        caption: caption.trim() || null,
                        status,
                        is_video: isVideo,
                        thumbnail_url: thumbnailUrl,
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

function generateVideoThumbnail(blob) {
      return new Promise((resolve) => {
            const url = URL.createObjectURL(blob)
            const video = document.createElement('video')
            video.muted = true
            video.playsInline = true
            video.preload = 'auto'
            let settled = false

            function capture() {
                  if (settled) return
                  settled = true
                  try {
                        const w = video.videoWidth || 640
                        const h = video.videoHeight || 360
                        const canvas = document.createElement('canvas')
                        canvas.width = Math.min(w, 640)
                        canvas.height = Math.round(Math.min(w, 640) * (h / w))
                        canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height)
                        URL.revokeObjectURL(url)
                        canvas.toBlob((b) => resolve(b || null), 'image/jpeg', 0.82)
                  } catch {
                        URL.revokeObjectURL(url)
                        resolve(null)
                  }
            }

            // Once we can play, seek to 1s for a good frame (not black opening frame)
            video.oncanplay = () => {
                  const target = video.duration > 1 ? 1 : 0
                  if (video.currentTime !== target) {
                        video.currentTime = target
                  } else {
                        // Already at target — onseeked won't fire, capture now
                        capture()
                  }
            }

            video.onseeked = capture

            video.onerror = () => { URL.revokeObjectURL(url); if (!settled) { settled = true; resolve(null) } }

            // Safety timeout — if nothing fires in 8s, give up
            setTimeout(() => { if (!settled) { settled = true; URL.revokeObjectURL(url); resolve(null) } }, 8000)

            video.src = url
            video.load()
      })
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
            'video/mp4': 'mp4',
            'video/quicktime': 'mov',
            'video/webm': 'webm',
            'video/x-msvideo': 'avi',
            'video/x-matroska': 'mkv',
            'video/3gpp': '3gp',
      }
      return map[mimeType.toLowerCase()] || (mimeType.startsWith('video/') ? 'mp4' : 'jpg')
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