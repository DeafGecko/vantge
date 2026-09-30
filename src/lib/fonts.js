/**
 * VANTGE font system.
 * 18 curated Google Fonts organized into 3 style categories for any event type.
 */

export const FONTS = {
      // ELEGANT & SCRIPT — weddings, formal events, romantic
      great_vibes: {
            id: 'great_vibes',
            name: 'Great Vibes',
            googleFontName: 'Great Vibes',
            cssFamily: "'Great Vibes', cursive",
            category: 'elegant',
            vibe: 'Flowing wedding classic',
            weight: 400,
      },
      cormorant_garamond: {
            id: 'cormorant_garamond',
            name: 'Cormorant Garamond',
            googleFontName: 'Cormorant Garamond',
            cssFamily: "'Cormorant Garamond', serif",
            category: 'elegant',
            vibe: 'Refined luxury serif',
            weight: 700,
      },
      pinyon_script: {
            id: 'pinyon_script',
            name: 'Pinyon Script',
            googleFontName: 'Pinyon Script',
            cssFamily: "'Pinyon Script', cursive",
            category: 'elegant',
            vibe: 'Formal calligraphy',
            weight: 400,
      },
      imperial_script: {
            id: 'imperial_script',
            name: 'Imperial Script',
            googleFontName: 'Imperial Script',
            cssFamily: "'Imperial Script', cursive",
            category: 'elegant',
            vibe: 'Refined calligraphy',
            weight: 400,
      },
      alex_brush: {
            id: 'alex_brush',
            name: 'Alex Brush',
            googleFontName: 'Alex Brush',
            cssFamily: "'Alex Brush', cursive",
            category: 'elegant',
            vibe: 'Casual romantic',
            weight: 400,
      },
      monte_carlo: {
            id: 'monte_carlo',
            name: 'Charm',
            googleFontName: 'Charm',
            cssFamily: "'Charm', cursive",
            category: 'elegant',
            vibe: 'Elegant formal script',
            weight: 400,
      },
      sacramento: {
            id: 'sacramento',
            name: 'Sacramento',
            googleFontName: 'Sacramento',
            cssFamily: "'Sacramento', cursive",
            category: 'elegant',
            vibe: 'Thin flowing script',
            weight: 400,
      },

      // MODERN & CLEAN — birthdays, reunions, corporate, minimalist
      sans_outfit: {
            id: 'sans_outfit',
            name: 'Outfit',
            googleFontName: 'Outfit',
            cssFamily: "'Outfit', sans-serif",
            category: 'modern',
            vibe: 'Clean & friendly',
            weight: 800,
      },
      montserrat: {
            id: 'montserrat',
            name: 'Montserrat',
            googleFontName: 'Montserrat',
            cssFamily: "'Montserrat', sans-serif",
            category: 'modern',
            vibe: 'Bold geometric',
            weight: 800,
      },
      lora: {
            id: 'lora',
            name: 'Lora',
            googleFontName: 'Lora',
            cssFamily: "'Lora', serif",
            category: 'modern',
            vibe: 'Warm reading serif',
            weight: 700,
      },
      playfair_display: {
            id: 'playfair_display',
            name: 'Playfair Display',
            googleFontName: 'Playfair Display',
            cssFamily: "'Playfair Display', serif",
            category: 'modern',
            vibe: 'Magazine editorial',
            weight: 800,
      },
      dm_serif_display: {
            id: 'dm_serif_display',
            name: 'DM Serif Display',
            googleFontName: 'DM Serif Display',
            cssFamily: "'DM Serif Display', serif",
            category: 'modern',
            vibe: 'Elegant editorial',
            weight: 400,
      },
      josefin_sans: {
            id: 'josefin_sans',
            name: 'Josefin Sans',
            googleFontName: 'Josefin Sans',
            cssFamily: "'Josefin Sans', sans-serif",
            category: 'modern',
            vibe: 'Minimal & geometric',
            weight: 700,
      },

      // DISPLAY & FESTIVE — unique, memorable, playful, celebratory
      cinzel_decorative: {
            id: 'cinzel_decorative',
            name: 'Cinzel Decorative',
            googleFontName: 'Cinzel Decorative',
            cssFamily: "'Cinzel Decorative', serif",
            category: 'display',
            vibe: 'Historic & engraved',
            weight: 700,
      },
      pacifico: {
            id: 'pacifico',
            name: 'Pacifico',
            googleFontName: 'Pacifico',
            cssFamily: "'Pacifico', cursive",
            category: 'display',
            vibe: 'Playful handwritten',
            weight: 400,
      },
      lobster: {
            id: 'lobster',
            name: 'Lobster',
            googleFontName: 'Lobster',
            cssFamily: "'Lobster', cursive",
            category: 'display',
            vibe: 'Retro party script',
            weight: 400,
      },
      bebas_neue: {
            id: 'bebas_neue',
            name: 'Bebas Neue',
            googleFontName: 'Bebas Neue',
            cssFamily: "'Bebas Neue', sans-serif",
            category: 'display',
            vibe: 'Bold all-caps impact',
            weight: 400,
      },
      zen_dots: {
            id: 'zen_dots',
            name: 'Zen Dots',
            googleFontName: 'Zen Dots',
            cssFamily: "'Zen Dots', sans-serif",
            category: 'display',
            vibe: 'Futuristic tech',
            weight: 400,
      },
}

export const DEFAULT_FONT_ID = 'sans_outfit'

export function getFont(fontId) {
      return FONTS[fontId] || FONTS[DEFAULT_FONT_ID]
}

export function getAllFonts() {
      return Object.values(FONTS)
}

export function getFontsByCategory() {
      return {
            elegant: Object.values(FONTS).filter((f) => f.category === 'elegant'),
            modern: Object.values(FONTS).filter((f) => f.category === 'modern'),
            display: Object.values(FONTS).filter((f) => f.category === 'display'),
      }
}

export function getGoogleFontsUrl(fontId) {
      const font = getFont(fontId)
      const name = font.googleFontName.replace(/ /g, '+')
      // Script/cursive fonts like MonteCarlo don't support wght axis — load without weight param
      const isScript = font.cssFamily.includes('cursive')
      const weightParam = isScript ? '' : `:wght@${font.weight}`
      return `https://fonts.googleapis.com/css2?family=${name}${weightParam}&display=swap`
}

/**
 * Resolve a font ID to its CSS font-family string.
 * Use in inline styles: style={{ fontFamily: resolveFontFamily(event.font) }}
 */
export function resolveFontFamily(fontId) {
      return getFont(fontId).cssFamily
}