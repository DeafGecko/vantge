-- Title alignment for the RSVP invitation: left, center or right. Defaults to left (current look).
alter table public.events add column if not exists rsvp_title_align text default 'left';
notify pgrst, 'reload schema';
