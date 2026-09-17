/*
# Enable Realtime on deliveries table

## Overview
Adds the `deliveries` table to the Supabase Realtime publication so the
driver app receives instant UPDATE/INSERT events. This makes closed
orders disappear from the driver's phone immediately when the admin
accepts the handover, and new orders appear without a manual refresh.

## Changes
- Adds `deliveries` to `supabase_realtime` publication.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE deliveries;
