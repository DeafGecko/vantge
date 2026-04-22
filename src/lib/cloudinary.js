const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME

export function getEnhancedUrl(supabasePublicUrl, options = {}) {
  if (!supabasePublicUrl) return null
  if (!CLOUD_NAME) {
    return supabasePublicUrl
  }

  const { width, height } = options

  const transforms = ['f_auto', 'q_auto', 'e_improve']
  if (width) transforms.push(`w_${width}`)
  if (height) transforms.push(`h_${height}`)
  if (width || height) transforms.push('c_fill')

  const transformString = transforms.join(',')

  return `https://res.cloudinary.com/${CLOUD_NAME}/image/fetch/${transformString}/${supabasePublicUrl}`
}

export function getThumbnailUrl(supabasePublicUrl) {
  return getEnhancedUrl(supabasePublicUrl, { width: 600, height: 750 })
}

export function getFullSizeUrl(supabasePublicUrl) {
  return getEnhancedUrl(supabasePublicUrl, { width: 1600 })
}
