export const EVENT_TYPES = [
      {
            id: 'wedding',
            label: 'Wedding',
            icon: '💍',
            tagline: 'Welcome to the celebration',
            subline: 'Scan. Snap. Share.',
      },
      {
            id: 'birthday',
            label: 'Birthday',
            icon: '🎂',
            tagline: 'Join the birthday fun',
            subline: 'Snap a moment. Make a memory.',
      },
      {
            id: 'anniversary',
            label: 'Anniversary',
            icon: '🥂',
            tagline: 'Celebrating a milestone',
            subline: 'Capture the love. Share the joy.',
      },
      {
            id: 'party',
            label: 'Party',
            icon: '🎉',
            tagline: 'The party starts here',
            subline: 'Snap. Share. Repeat.',
      },
      {
            id: 'corporate',
            label: 'Conference',
            icon: '🏢',
            tagline: 'Welcome to the event',
            subline: 'Capture every moment.',
      },
      {
            id: 'family',
            label: 'Family Reunion',
            icon: '🏡',
            tagline: 'Family comes together',
            subline: 'Snap. Share. Remember.',
      },
      {
            id: 'graduation',
            label: 'Graduation',
            icon: '🎓',
            tagline: 'Celebrating an achievement',
            subline: 'Capture this moment forever.',
      },
      {
            id: 'other',
            label: 'Other',
            icon: '✨',
            tagline: 'Welcome',
            subline: 'Scan. Snap. Share.',
      },
]

export const DEFAULT_EVENT_TYPE_ID = 'wedding'

export function getEventType(id) {
      return EVENT_TYPES.find((t) => t.id === id) || EVENT_TYPES.find((t) => t.id === DEFAULT_EVENT_TYPE_ID)
}
