-- Save the background photo zoom so the RSVP preview and guest page match the editor.
alter table public.events add column if not exists background_zoom integer default 100;
