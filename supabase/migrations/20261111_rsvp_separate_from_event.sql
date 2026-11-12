-- RSVP keeps its own name and event type, separate from the Event (gallery) dashboard.
alter table public.events
  add column if not exists rsvp_event_name text,
  add column if not exists rsvp_event_type text;

-- Copy today's values into the RSVP columns once (only where not already set).
update public.events set
  rsvp_event_name = event_name,
  rsvp_event_type = event_type
where rsvp_event_name is null and rsvp_event_type is null;

notify pgrst, 'reload schema';
