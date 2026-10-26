-- Reviewed, intentional drift: Prisma 5 cannot express these database objects.
--
-- 1. Composite foreign keys enforcing category integrity for service_requests
--    (service_id, appliance_category_id) and (fault_id, appliance_category_id)
--    are added by 20261022130000_service_fault_category_integrity. Prisma's
--    relation model cannot express an FK to a secondary composite unique key
--    without restructuring the relation, so the constraints stay migration-only
--    and are carried as reviewed baseline drift.
-- 2. PostGIS GIST indexes over Unsupported("geography") columns (locations,
--    technician_service_areas) exist only in migrations.
ALTER TABLE "service_requests" DROP CONSTRAINT "service_requests_fault_category_fkey";
ALTER TABLE "service_requests" DROP CONSTRAINT "service_requests_service_category_fkey";
DROP INDEX "locations_coordinates_gist";
DROP INDEX "technician_service_areas_coordinates_gist";
