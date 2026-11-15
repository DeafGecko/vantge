// Shared photo framing for event backgrounds.
// The editor, the dashboard preview and the guest page all use this, so what
// you see while editing matches what guests see after you save.
export function bgPhotoStyle(position, zoom) {
  const pos = position || '50% 50%'
  return {
    objectFit: 'cover',
    objectPosition: pos,
    transform: `scale(${(Number(zoom) || 100) / 100})`,
    transformOrigin: pos,
  }
}
