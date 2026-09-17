/*
# Enable Realtime on settlements table

## Overview
Adds the `settlements` table to the Supabase Realtime publication so the
admin panel receives instant INSERT/UPDATE/DELETE events when drivers
submit payment settlements (cash, UPI, credit). Without this, the admin
Counter Orders and Orders tabs only see settlement changes after a manual
page refresh.

## Changes
- Adds `settlements` to `supabase_realtime` publication.

## Notes
1. The `deliveries` table was already in the publication; this adds
   `settlements` alongside it.
2. Both admin tabs (Counter Orders, Orders) subscribe to settlement
   changes to auto-refresh the delivered/handover lists.
*/

ALTER PUBLICATION supabase_realtime ADD TABLE settlements;
