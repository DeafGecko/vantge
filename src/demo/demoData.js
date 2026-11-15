// Made-up data for the browser-only demo at /try/event and /try/rsvp.
// Nothing here is real: the names, guests and notes are invented, and the photos are stock images.
const DEMO_HOST_ID = 'demo-host'
const DEMO_EVENT_ID = 'demo-event'
const PARTY_PHOTO = '/demo/sample-8.jpg'

// Sample photos for the demo party. Every link here was checked to load.
const PHOTOS = [
  '/demo/sample-1.jpg',
  '/demo/sample-2.jpg',
  '/demo/sample-3.jpg',
  '/demo/sample-4.jpg',
  '/demo/sample-5.jpg',
  '/demo/sample-6.jpg',
  '/demo/sample-7.jpg',
  '/demo/sample-8.jpg',
  '/demo/sample-9.jpg',
]

const GUESTS = ['Sarah Mitchell', 'Tom Chen', 'Maya Patel', 'Grace Owens', 'Alex Kim', 'Jordan Brooks']

export const DEMO_DATA = {
  events: [{
    id: DEMO_EVENT_ID,
    host_id: DEMO_HOST_ID,
    event_name: "Sam's Birthday Party",
    event_slug: 'demo',
    event_type: 'birthday',
    theme: 'terracotta_sunset',
    font_family: 'josefin_sans',
    title_align: 'center',
    background_image: PARTY_PHOTO,
    background_image_desktop: PARTY_PHOTO,
    background_position: '50% 88%',
    background_position_desktop: '50% 50%',
    background_tint: 60,
    background_tint_desktop: 55,
    background_zoom: 100,
    background_zoom_desktop: 100,
    logo_url: null,
    gallery_unlocked: true,
    guest_passcode: null,
    allow_downloads: true,
    allow_sharing: true,
    allow_favorites: true,
    allow_uploads: true,
    require_approval: false,
    guest_upload_limit: null,
    rsvp_enabled: true,
    rsvp_status: 'published',
    rsvp_mode: 'rsvp_and_food',
    rsvp_event_name: "Sam's Birthday Party",
    rsvp_event_type: 'birthday',
    rsvp_event_date: '2026-11-21T17:00:00Z',
    rsvp_timezone: 'America/Chicago',
    rsvp_deadline: '2026-12-01T00:00:00Z',
    rsvp_attendance_limit: 50,
    rsvp_location: '123 Example Street, Anytown',
    rsvp_description: "Come celebrate Sam's birthday with us. Bring a dish if you can!",
    rsvp_host_display_name: "Sam's Birthday Party",
    rsvp_collect_email: false,
    rsvp_collect_phone: false,
    rsvp_headcount_mode: 'both',
    rsvp_allow_maybe: true,
    rsvp_theme: 'terracotta_sunset',
    rsvp_font: 'sans_outfit',
    rsvp_title_align: 'left',
    rsvp_logo_url: null,
    rsvp_background_image: PARTY_PHOTO,
    rsvp_background_image_desktop: PARTY_PHOTO,
    rsvp_background_position: '50% 50%',
    rsvp_background_position_desktop: '50% 50%',
    rsvp_background_tint: 55,
    rsvp_background_tint_desktop: 55,
    rsvp_background_zoom: 100,
    rsvp_background_zoom_desktop: 100,
    food_enabled: true,
    food_heading: 'Food Sign-up',
    food_allow_suggestions: true,
    food_show_contributors: true,
    created_at: '2026-11-01T12:00:00Z',
  }],

  rsvp_responses: [
    { id: 'r1', event_id: DEMO_EVENT_ID, guest_name: 'Sarah Mitchell', response: 'going', party_size: 2, guest_names: 'Mark Mitchell', note: 'So happy for you both! Can we bring the cake?' },
    { id: 'r2', event_id: DEMO_EVENT_ID, guest_name: 'Tom Chen', response: 'going', party_size: 2, guest_names: 'Lisa Chen', note: 'We will be there with bells on.' },
    { id: 'r3', event_id: DEMO_EVENT_ID, guest_name: 'Maya Patel', response: 'going', party_size: 1, guest_names: null, note: 'Counting down the days!' },
    { id: 'r4', event_id: DEMO_EVENT_ID, guest_name: 'Jordan Brooks', response: 'maybe', party_size: 1, guest_names: null, note: 'Checking my work schedule, will confirm soon.' },
    { id: 'r5', event_id: DEMO_EVENT_ID, guest_name: 'Grace Owens', response: 'going', party_size: 3, guest_names: 'Ellie and Ben Owens', note: 'Our first wedding with the kids. Expect dancing!' },
    { id: 'r6', event_id: DEMO_EVENT_ID, guest_name: 'Alex Kim', response: 'not_going', party_size: 1, guest_names: null, note: 'So sorry, we are abroad that week. Sending love.' },
  ].map(r => ({ ...r, edit_token: `demo-token-${r.id}`, created_at: '2026-11-05T12:00:00Z', updated_at: '2026-11-05T12:00:00Z' })),

  food_items: [
    { id: 'f1', event_id: DEMO_EVENT_ID, name: 'Roast turkey', category: 'Mains', spots_total: 1, unit: 'dish', sort_order: 0, is_suggestion: false, suggested_by: null, notes: null },
    { id: 'f2', event_id: DEMO_EVENT_ID, name: 'Mashed potatoes', category: 'Sides', spots_total: 2, unit: 'dish', sort_order: 1, is_suggestion: false, suggested_by: null, notes: null },
    { id: 'f3', event_id: DEMO_EVENT_ID, name: 'Pumpkin pie', category: 'Desserts', spots_total: null, unit: 'pie', sort_order: 2, is_suggestion: false, suggested_by: null, notes: null },
    { id: 'f4', event_id: DEMO_EVENT_ID, name: 'Sparkling cider', category: 'Drinks', spots_total: 4, unit: 'bottle', sort_order: 3, is_suggestion: true, suggested_by: 'Tom Chen', notes: null },
  ].map(f => ({ ...f, created_at: '2026-11-02T12:00:00Z' })),

  food_claims: [
    { id: 'c1', food_item_id: 'f2', event_id: DEMO_EVENT_ID, guest_name: 'Maya Patel', quantity: 1, description: 'My famous garlic mash', note: null },
    { id: 'c2', food_item_id: 'f3', event_id: DEMO_EVENT_ID, guest_name: 'Grace Owens', quantity: 1, description: null, note: null },
  ].map(c => ({ ...c, edit_token: `demo-token-${c.id}`, created_at: '2026-11-06T12:00:00Z', updated_at: '2026-11-06T12:00:00Z' })),

  // status 1 = approved, 0 = waiting for approval (same meaning as the real app)
  media_queue: PHOTOS.map((url, i) => ({
    id: `m${i + 1}`,
    event_id: DEMO_EVENT_ID,
    guest_name: GUESTS[i % GUESTS.length],
    caption: i % 2 === 0 ? 'Our favourite moment' : null,
    original_url: url,
    thumbnail_url: url,
    storage_path: null,
    is_video: false,
    is_admin_upload: i < 2,
    status: 1,
    created_at: `2026-11-1${i}T12:00:00Z`,
  })).concat([{
    // One photo a guest has sent that is still waiting for the host to approve it
    id: 'm-pending',
    event_id: DEMO_EVENT_ID,
    guest_name: 'Jordan Brooks',
    caption: 'Our first dance practice',
    original_url: '/demo/sample-7.jpg',
    thumbnail_url: '/demo/sample-7.jpg',
    storage_path: null,
    is_video: false,
    is_admin_upload: false,
    status: 0,
    created_at: '2026-11-15T12:00:00Z',
  }]),

  profiles: [{ id: DEMO_HOST_ID, email: 'demo@example.com', approved: true, rejected: false, created_at: '2026-11-01T12:00:00Z' }],
  admin_branding: [],
  event_type_library: [],
}

export const DEMO_USER = { id: DEMO_HOST_ID, email: 'demo@example.com' }
