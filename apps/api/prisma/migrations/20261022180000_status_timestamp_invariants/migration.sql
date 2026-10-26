-- DB-011: tie service-request status to its lifecycle timestamps.
--
-- The state-machine service and Admin override now write the matching stamp.
-- Add the database invariant so a direct write cannot create a completed row
-- with no completed_at (or an in-progress row with no started_at).

ALTER TABLE "service_requests"
  ADD CONSTRAINT "service_requests_status_timestamps"
  CHECK (
    (status <> 'accepted' OR accepted_at IS NOT NULL) AND
    (status <> 'on_the_way' OR (accepted_at IS NOT NULL AND started_at IS NOT NULL)) AND
    (status <> 'in_progress' OR started_at IS NOT NULL) AND
    (status <> 'completed' OR completed_at IS NOT NULL) AND
    (status <> 'cancelled' OR cancelled_at IS NOT NULL)
  );
