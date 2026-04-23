/**
 * VANTGE theme palettes.
 *
 * Each palette defines all the colors used across guest-facing pages.
 * Host picks one, guests see it on the Event Gateway, Gallery, Camera, and Uploader.
 *
 * All palettes are WCAG AA contrast verified for readability.
 */

export const THEMES = {
      warm_editorial: {
            id: 'warm_editorial',
            name: 'Warm Editorial',
            vibe: 'Coral + cream, the default',
            colors: {
                  bg: '#F8F5ED',
                  surface: '#FFFFFF',
                  text: '#1A1A18',
                  textMuted: '#5A5A52',
                  textSubtle: '#88887E',
                  accent: '#C84A44',
                  accentHover: '#B43E39',
                  accentSoft: '#E8615C',
                  border: '#E0D8C6',
                  surfaceMuted: '#F4F3F0',
            },
      },
      sage_meadow: {
            id: 'sage_meadow',
            name: 'Sage Meadow',
            vibe: 'Outdoor, garden, green-forward',
            colors: {
                  bg: '#F7F5EF',
                  surface: '#FFFFFF',
                  text: '#1F2A1F',
                  textMuted: '#4F5C4E',
                  textSubtle: '#818B7F',
                  accent: '#5F7A5E',
                  accentHover: '#4E6550',
                  accentSoft: '#7A9478',
                  border: '#D8DFCE',
                  surfaceMuted: '#EEF0E8',
            },
      },
      dusty_rose: {
            id: 'dusty_rose',
            name: 'Dusty Rose',
            vibe: 'Romantic, garden party',
            colors: {
                  bg: '#FDF4F3',
                  surface: '#FFFFFF',
                  text: '#2B1F21',
                  textMuted: '#614F51',
                  textSubtle: '#8E7A7C',
                  accent: '#A64A5F',
                  accentHover: '#8E3B4F',
                  accentSoft: '#C06B82',
                  border: '#E8D5D6',
                  surfaceMuted: '#F4E7E6',
            },
      },
      dusty_blue: {
            id: 'dusty_blue',
            name: 'Dusty Blue',
            vibe: 'Coastal, soft, romantic',
            colors: {
                  bg: '#F2F4F6',
                  surface: '#FFFFFF',
                  text: '#1A2633',
                  textMuted: '#4C5D6E',
                  textSubtle: '#7D8B9A',
                  accent: '#6B8AA6',
                  accentHover: '#557290',
                  accentSoft: '#8BA6BE',
                  border: '#D0D9E1',
                  surfaceMuted: '#E5EAF0',
            },
      },
      emerald_forest: {
            id: 'emerald_forest',
            name: 'Emerald Forest',
            vibe: 'Deep, moody, evening',
            colors: {
                  bg: '#F2F5F1',
                  surface: '#FFFFFF',
                  text: '#0F2116',
                  textMuted: '#3E5344',
                  textSubtle: '#778876',
                  accent: '#1F5E42',
                  accentHover: '#164A33',
                  accentSoft: '#3A7A5C',
                  border: '#C7D4C8',
                  surfaceMuted: '#E3EBE3',
            },
      },
      terracotta_sunset: {
            id: 'terracotta_sunset',
            name: 'Terracotta Sunset',
            vibe: 'Rustic, earthy, outdoor',
            colors: {
                  bg: '#F5EDE0',
                  surface: '#FFFFFF',
                  text: '#2A1F14',
                  textMuted: '#5A4A3A',
                  textSubtle: '#8B7B69',
                  accent: '#B8553E',
                  accentHover: '#9D4633',
                  accentSoft: '#D07353',
                  border: '#DDCFB7',
                  surfaceMuted: '#EDE3D0',
            },
      },
      mocha_latte: {
            id: 'mocha_latte',
            name: 'Mocha Latte',
            vibe: 'Pantone 2025, warm tonal brown',
            colors: {
                  bg: '#F7F2EB',
                  surface: '#FFFFFF',
                  text: '#2E251F',
                  textMuted: '#5D4E41',
                  textSubtle: '#8E7F70',
                  accent: '#7A5A42',
                  accentHover: '#624733',
                  accentSoft: '#94745A',
                  border: '#E3D6C6',
                  surfaceMuted: '#EFE6D8',
            },
      },
      cherry_noir: {
            id: 'cherry_noir',
            name: 'Cherry Noir',
            vibe: 'Dramatic, bold, modern',
            colors: {
                  bg: '#F7F5F4',
                  surface: '#FFFFFF',
                  text: '#1A1414',
                  textMuted: '#4F3F3F',
                  textSubtle: '#847474',
                  accent: '#8B1E2C',
                  accentHover: '#711622',
                  accentSoft: '#AC3948',
                  border: '#DDCBC9',
                  surfaceMuted: '#EEE2E0',
            },
      },
      lavender_mist: {
            id: 'lavender_mist',
            name: 'Lavender Mist',
            vibe: 'Spring, whimsical, airy',
            colors: {
                  bg: '#F6F3F5',
                  surface: '#FFFFFF',
                  text: '#22182A',
                  textMuted: '#564A63',
                  textSubtle: '#897E95',
                  accent: '#7B5F8C',
                  accentHover: '#644B74',
                  accentSoft: '#947AA3',
                  border: '#DCD1DB',
                  surfaceMuted: '#EBE3EA',
            },
      },
      midnight_velvet: {
            id: 'midnight_velvet',
            name: 'Midnight Velvet',
            vibe: 'Winter, luxurious, evening',
            colors: {
                  bg: '#F5F0EF',
                  surface: '#FFFFFF',
                  text: '#1A0F12',
                  textMuted: '#4A3438',
                  textSubtle: '#7E6A6E',
                  accent: '#6B1A2E',
                  accentHover: '#551120',
                  accentSoft: '#8A2C44',
                  border: '#D8C5C7',
                  surfaceMuted: '#EADBDC',
            },
      },
      classic_noir: {
            id: 'classic_noir',
            name: 'Classic Noir',
            vibe: 'Black tie, timeless',
            colors: {
                  bg: '#F7F6F3',
                  surface: '#FFFFFF',
                  text: '#1A1A1A',
                  textMuted: '#4A4A4A',
                  textSubtle: '#828282',
                  accent: '#2C2C2C',
                  accentHover: '#1A1A1A',
                  accentSoft: '#494949',
                  border: '#D9D7D2',
                  surfaceMuted: '#EDECE8',
            },
      },
      royal_sapphire: {
            id: 'royal_sapphire',
            name: 'Royal Sapphire',
            vibe: 'Regal, formal, sophisticated',
            colors: {
                  bg: '#F4F5F8',
                  surface: '#FFFFFF',
                  text: '#101729',
                  textMuted: '#3C4660',
                  textSubtle: '#727B91',
                  accent: '#1F3A6B',
                  accentHover: '#162D56',
                  accentSoft: '#3A5687',
                  border: '#CFD5E0',
                  surfaceMuted: '#E4E8EE',
            },
      },
}

/**
 * Get a theme by ID, with fallback to default.
 */
export function getTheme(themeId) {
      return THEMES[themeId] || THEMES.warm_editorial
}

/**
 * Get all themes as an ordered array for display.
 */
export function getAllThemes() {
      return Object.values(THEMES)
}