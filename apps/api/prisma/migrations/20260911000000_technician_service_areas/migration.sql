-- Al-Khabir technician service-area foundation (Task 10E-R1, CTO-approved).
--
-- ADDITIVE ONLY. Adds:
--   1. technician_service_areas — technician-owned coverage points
--      (label + documented logical coordinates + derived PostGIS
--      geography(Point, 4326)), unique per (technician, label).
--   2. The CTO-approved index technician_services(service_id) so
--      discovery-by-specialty stops scanning the composite PK.
--
-- No existing tables are altered; no data is touched. The coordinate
-- derivation trigger reuses set_location_coordinates() from
-- 20260101000000_init_identity, and updated_at reuses set_updated_at().

CREATE TABLE "technician_service_areas" (
  "id"           UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
  "technician_id" UUID          NOT NULL,
  "label_ar"     VARCHAR(128)   NOT NULL,
  "latitude"     DECIMAL(9,6)   NOT NULL,
  "longitude"    DECIMAL(9,6)   NOT NULL,
  -- PostGIS geography(Point, 4326). Derived from latitude/longitude by the
  -- trigger below so latitude/longitude remain the single business truth.
  "coordinates"  geography(Point, 4326),
  "created_at"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "technician_service_areas_technician_id_label_ar_key"
    UNIQUE ("technician_id", "label_ar"),
  CONSTRAINT "technician_service_areas_technician_id_fkey"
    FOREIGN KEY ("technician_id") REFERENCES "technician_profiles"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- FK access path: all technician-owned area queries.
CREATE INDEX "technician_service_areas_technician_id_idx"
  ON "technician_service_areas" ("technician_id");

-- Geospatial access path for the ratified radius/area discovery filters.
CREATE INDEX "technician_service_areas_coordinates_gist"
  ON "technician_service_areas" USING GIST ("coordinates");

-- CTO-approved (Task 10E-R1 decision 3): discovery-by-specialty access path.
CREATE INDEX "technician_services_service_id_idx"
  ON "technician_services" ("service_id");

-- updated_at trigger (function exists from 20260101000000_init_identity).
CREATE TRIGGER technician_service_areas_set_updated_at
  BEFORE UPDATE ON "technician_service_areas"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Coordinate derivation (function exists from 20260101000000_init_identity):
-- keeps geography(Point, 4326) derived from latitude/longitude so there is
-- exactly one business truth.
CREATE TRIGGER technician_service_areas_set_coordinates
  BEFORE INSERT OR UPDATE ON "technician_service_areas"
  FOR EACH ROW EXECUTE FUNCTION set_location_coordinates();
