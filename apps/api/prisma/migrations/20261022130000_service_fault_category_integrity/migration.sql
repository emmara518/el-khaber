-- DB-002: prevent a service request from citing a service or fault that
-- belongs to a different appliance category.
--
-- The existing single-column FKs validate existence only. Add the composite
-- unique targets and composite FKs so the database enforces the category
-- relationship regardless of which client writes the row.

CREATE UNIQUE INDEX "faults_id_appliance_category_id_key"
  ON "faults" ("id", "appliance_category_id");

CREATE UNIQUE INDEX "services_id_appliance_category_id_key"
  ON "services" ("id", "appliance_category_id");

ALTER TABLE "service_requests"
  ADD CONSTRAINT "service_requests_service_category_fkey"
  FOREIGN KEY ("service_id", "appliance_category_id")
  REFERENCES "services" ("id", "appliance_category_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "service_requests"
  ADD CONSTRAINT "service_requests_fault_category_fkey"
  FOREIGN KEY ("fault_id", "appliance_category_id")
  REFERENCES "faults" ("id", "appliance_category_id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
