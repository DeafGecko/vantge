-- Title alignment for the Event (gallery) page: left, center or right.
alter table public.events add column if not exists title_align text default 'center';
notify pgrst, 'reload schema';
