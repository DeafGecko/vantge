-- RSVP gets its own design, separate from the gallery's background photo and logo.
alter table public.events
  add column if not exists rsvp_background_image text,
  add column if not exists rsvp_background_image_desktop text,
  add column if not exists rsvp_background_position text,
  add column if not exists rsvp_background_position_desktop text,
  add column if not exists rsvp_background_tint integer,
  add column if not exists rsvp_background_tint_desktop integer,
  add column if not exists rsvp_background_zoom integer default 100,
  add column if not exists rsvp_background_zoom_desktop integer default 100,
  add column if not exists rsvp_logo_url text;

-- Copy today's RSVP look into the new RSVP columns (only where not already set).
update public.events set
  rsvp_background_image = background_image,
  rsvp_background_image_desktop = background_image_desktop,
  rsvp_background_position = background_position,
  rsvp_background_position_desktop = background_position_desktop,
  rsvp_background_tint = background_tint,
  rsvp_background_tint_desktop = background_tint_desktop,
  rsvp_background_zoom = background_zoom,
  rsvp_background_zoom_desktop = background_zoom_desktop,
  rsvp_logo_url = logo_url
where rsvp_background_image is null and rsvp_background_position is null and rsvp_logo_url is null;

notify pgrst, 'reload schema';
