-- Demo wedding for showing Vantge to prospects, at /demo.
-- Event side: a wedding (fictional couple, wedding stock photo as the background).
-- RSVP side: keeps the Thanksgiving RSVP name and type, with made-up guests and notes.
-- Run in Supabase SQL Editor. It copies the Thanksgiving event row, so it uses that event's host account.
-- Run it again any time: the first statement removes the old demo first.

-- 1. Remove an old demo (its RSVP responses are removed with it).
-- Matches only the demo row, so a real event with the slug "demo" is never touched.
delete from events where event_slug = 'demo' and event_name = 'Emma & Daniel';

-- 2. Copy the Thanksgiving event into a new demo wedding row
insert into events
select (jsonb_populate_record(
  null::events,
  (to_jsonb(e) - 'created_at')
  || jsonb_build_object(
       'id', gen_random_uuid(),
       'created_at', now(),
       'event_slug', 'demo',
       'event_name', 'Emma & Daniel',
       'event_type', 'wedding',
       'gallery_unlocked', true,
       'guest_passcode', null,
       'background_image', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80',
       'background_image_desktop', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80'
     )
)).*
from events e
where e.rsvp_event_name ilike '%thanksgiving%'
order by e.created_at
limit 1;

-- 3. Made-up RSVP responses
insert into rsvp_responses (event_id, guest_name, response, party_size, guest_names, note)
select e.id, v.guest_name, v.response, v.party_size, v.guest_names, v.note
from events e
cross join (values
  ('Sarah Mitchell', 'going',     2, 'Mark Mitchell',       'So happy for you both! Can we bring the cake?'),
  ('Tom Chen',       'going',     2, 'Lisa Chen',           'We will be there with bells on.'),
  ('Maya Patel',     'going',     1, null,                  'Counting down the days!'),
  ('Jordan Brooks',  'maybe',     1, null,                  'Checking my work schedule, will confirm soon.'),
  ('Grace Owens',    'going',     3, 'Ellie and Ben Owens', 'Our first wedding with the kids. Expect dancing!'),
  ('Alex Kim',       'not_going', 1, null,                  'So sorry, we are abroad that week. Sending love.')
) as v(guest_name, response, party_size, guest_names, note)
where e.event_slug = 'demo';
