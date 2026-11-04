-- Separate framing for the desktop background photo, and zoom for both screens.
-- Mobile keeps background_position / background_tint; desktop uses the _desktop columns.
alter table public.events add column if not exists background_zoom integer default 100;
alter table public.events add column if not exists background_zoom_desktop integer default 100;
alter table public.events add column if not exists background_position_desktop text;
alter table public.events add column if not exists background_tint_desktop integer;
