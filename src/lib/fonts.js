/**
 * VANTGE font system.
 * 10 curated Google Fonts organized into 3 style categories for any event type.
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
            name: 'Monte Carlo',
            googleFontName: 'MonteCarlo',
            cssFamily: "'MonteCarlo', cursive",
            category: 'elegant',
            vibe: 'Elegant formal script',
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

      // DISPLAY & TECH — unique, memorable, playful, futuristic
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
      return `https://fonts.googleapis.com/css2?family=${name}:wght@${font.weight}&display=swap`
}

/**
 * Resolve a font ID to its CSS font-family string.
 * Use in inline styles: style={{ fontFamily: resolveFontFamily(event.font) }}
 */
export function resolveFontFamily(fontId) {
      return getFont(fontId).cssFamily
}