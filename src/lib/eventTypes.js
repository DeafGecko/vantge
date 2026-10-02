export const EVENT_TYPES = [
      {
            id: 'wedding',
            label: 'Wedding',
            icon: '💍',
            tagline: 'Welcome to the celebration',
            subline: 'Scan. Snap. Share.',
            defaultBg: 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1600&q=85',
      },
      {
            id: 'birthday',
            label: 'Birthday',
            icon: '🎂',
            tagline: 'Join the birthday fun',
            subline: 'Snap a moment. Make a memory.',
            defaultBg: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1600&q=85',
      },
      {
            id: 'anniversary',
            label: 'Anniversary',
            icon: '🥂',
            tagline: 'Celebrating a milestone',
            subline: 'Capture the love. Share the joy.',
            defaultBg: 'https://images.unsplash.com/photo-1470756544705-1ba4b6b3c9d8?w=1600&q=85',
      },
      {
            id: 'party',
            label: 'Party',
            icon: '🎉',
            tagline: 'The party starts here',
            subline: 'Snap. Share. Repeat.',
            defaultBg: 'https://images.unsplash.com/photo-1496843916299-590492c751f4?w=1600&q=85',
      },
      {
            id: 'corporate',
            label: 'Conference',
            icon: '🏢',
            tagline: 'Welcome to the event',
            subline: 'Capture every moment.',
            defaultBg: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1600&q=85',
      },
      {
            id: 'family',
            label: 'Family Reunion',
            icon: '🏡',
            tagline: 'Family comes together',
            subline: 'Snap. Share. Remember.',
            defaultBg: 'https://images.unsplash.com/photo-1511895426328-dc8714191011?w=1600&q=85',
      },
      {
            id: 'graduation',
            label: 'Graduation',
            icon: '🎓',
            tagline: 'Celebrating an achievement',
            subline: 'Capture this moment forever.',
            defaultBg: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1600&q=85',
      },
      {
            id: 'other',
            label: 'Other',
            icon: '✨',
            tagline: 'Welcome',
            subline: 'Scan. Snap. Share.',
            defaultBg: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1600&q=85',
      },
]

export const DEFAULT_EVENT_TYPE_ID = 'wedding'

export function getEventType(id) {
      return EVENT_TYPES.find((t) => t.id === id) || EVENT_TYPES.find((t) => t.id === DEFAULT_EVENT_TYPE_ID)
}
