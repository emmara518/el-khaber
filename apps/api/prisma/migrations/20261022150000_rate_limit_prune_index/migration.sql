-- DB-006: support scheduled pruning by window_start.
--
-- The fixed-window table is pruned hourly by RateLimitService. The existing
-- unique index starts with policy, so a window_start-only predicate could
-- not use it efficiently.

CREATE INDEX "rate_limit_buckets_window_start_idx"
  ON "rate_limit_buckets" ("window_start");
