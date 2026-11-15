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

// Position, zoom and tint for one background photo, for a given prefix
// ('background' for the Event page, 'rsvp_background' for the RSVP).
// Desktop uses its own saved values and falls back to the mobile ones.
export function bgFraming(event, prefix, isWide) {
  const pick = (name) => {
    const desktop = event?.[`${prefix}_${name}_desktop`]
    const mobile = event?.[`${prefix}_${name}`]
    return isWide ? (desktop ?? mobile) : mobile
  }
  return {
    position: pick('position') || '50% 50%',
    zoom: pick('zoom') ?? 100,
    tint: pick('tint') ?? 55,
  }
}
