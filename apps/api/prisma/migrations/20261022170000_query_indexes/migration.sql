-- DB-009: align indexes with the actual list/order queries.
--
-- Additive only; existing single-column indexes remain for other predicates.

CREATE INDEX "service_requests_customer_id_created_at_idx"
  ON "service_requests" ("customer_id", "created_at");

CREATE INDEX "service_requests_technician_id_created_at_idx"
  ON "service_requests" ("technician_id", "created_at");

CREATE INDEX "reviews_technician_id_created_at_idx"
  ON "reviews" ("technician_id", "created_at");

CREATE INDEX "notifications_user_id_created_at_idx"
  ON "notifications" ("user_id", "created_at");

CREATE INDEX "audit_logs_created_at_idx"
  ON "audit_logs" ("created_at");
