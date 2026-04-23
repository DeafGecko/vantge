// ─────────────────────────────────────────────
// fonts.js — Single source of truth for VANTGE event fonts
// Import this everywhere instead of duplicating fontMap objects.
// ─────────────────────────────────────────────

/**
 * Each font has:
 *   id       → stored in Supabase (event.font_family)
 *   label    → human-friendly name shown in the picker
 *   family   → CSS font-family string (must match Google Fonts import)
 *   category → used to group fonts into rows in the Host Dashboard
 */

export const eventFonts = [
      // ── ROW 1 · Elegant & Script  (weddings, galas, formal) ──
      { id: 'serif_playfair', label: 'Playfair Display', family: "'Playfair Display', serif", category: 'elegant' },
      { id: 'serif_lora', label: 'Lora', family: "'Lora', serif", category: 'elegant' },
      { id: 'serif_newsreader', label: 'Newsreader', family: "'Newsreader', serif", category: 'elegant' },
      { id: 'script_greatvibes', label: 'Great Vibes', family: "'Great Vibes', cursive", category: 'elegant' },
      { id: 'script_alexbrush', label: 'Alex Brush', family: "'Alex Brush', cursive", category: 'elegant' },
      { id: 'script_imperial', label: 'Imperial Script', family: "'Imperial Script', cursive", category: 'elegant' },
      { id: 'script_style', label: 'Style Script', family: "'Style Script', cursive", category: 'elegant' },

      // ── ROW 2 · Modern & Clean  (birthdays, reunions, corporate) ──
      { id: 'sans_inter', label: 'Inter', family: "'Inter', sans-serif", category: 'modern' },
      { id: 'sans_montserrat', label: 'Montserrat', family: "'Montserrat', sans-serif", category: 'modern' },
      { id: 'sans_outfit', label: 'Outfit', family: "'Outfit', sans-serif", category: 'modern' },
      { id: 'sans_ubuntu', label: 'Ubuntu', family: "'Ubuntu', sans-serif", category: 'modern' },
      { id: 'serif_quattrocento', label: 'Quattrocento', family: "'Quattrocento', serif", category: 'modern' },
      { id: 'display_pacifico', label: 'Pacifico', family: "'Pacifico', cursive", category: 'modern' },

      // ── ROW 3 · Display & Tech  (tech meetups, creative, themed) ──
      { id: 'display_cinzel', label: 'Cinzel Decorative', family: "'Cinzel Decorative', serif", category: 'display' },
      { id: 'display_zendots', label: 'Zen Dots', family: "'Zen Dots', sans-serif", category: 'display' },
      { id: 'pixel_silk', label: 'Silkscreen', family: "'Silkscreen', monospace", category: 'display' },
      { id: 'tech_spacegrotesk', label: 'Space Grotesk', family: "'Space Grotesk', sans-serif", category: 'display' },
]

/** Quick lookup: fontId → CSS font-family string */
export const fontMap = Object.fromEntries(
      eventFonts.map((f) => [f.id, f.family])
)

/** Default font used when event has no font_family set */
export const DEFAULT_FONT_ID = 'serif_playfair'

/** Resolve a font_family id to its CSS family string */
export function resolveFontFamily(fontId) {
      return fontMap[fontId] || fontMap[DEFAULT_FONT_ID]
}

/** Get fonts grouped by category (for the 3-row picker) */
export function getFontsByCategory() {
      return {
            elegant: eventFonts.filter((f) => f.category === 'elegant'),
            modern: eventFonts.filter((f) => f.category === 'modern'),
            display: eventFonts.filter((f) => f.category === 'display'),
      }
}

/**
 * Google Fonts URL — add this to your index.html <head>:
 *
 * <link rel="preconnect" href="https://fonts.googleapis.com" />
 * <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
 * <link href="https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel+Decorative:wght@400;700&family=Great+Vibes&family=Imperial+Script&family=Inter:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Luxurious+Script&family=Montserrat:wght@400;500;600;700;800&family=Monte+Carlo&family=Newsreader:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Pacifico&family=Playfair+Display:wght@400;500;600;700;800&family=Quattrocento:wght@400;700&family=Silkscreen&family=Space+Grotesk:wght@400;500;600;700&family=Style+Script&family=Ubuntu:wght@400;500;700&family=Zen+Dots&display=swap" rel="stylesheet" />
 */
export const GOOGLE_FONTS_URL =
      'https://fonts.googleapis.com/css2?family=Alex+Brush&family=Cinzel+Decorative:wght@400;700&family=Great+Vibes&family=Imperial+Script&family=Inter:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Luxurious+Script&family=Montserrat:wght@400;500;600;700;800&family=Monte+Carlo&family=Newsreader:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&family=Pacifico&family=Playfair+Display:wght@400;500;600;700;800&family=Quattrocento:wght@400;700&family=Silkscreen&family=Space+Grotesk:wght@400;500;600;700&family=Style+Script&family=Ubuntu:wght@400;500;700&family=Zen+Dots&display=swap'