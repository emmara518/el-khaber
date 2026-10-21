-- Al-Khabir technician self-service support (Task 10J-R1).
--
-- Minimal change: technician_service_areas.latitude / .longitude become
-- NULLABLE so technician-entered LABEL-ONLY areas (the onboarding UI's
-- preset district names, no coordinates) are representable. The
-- set_location_coordinates trigger (10E-R1) already derives NULL
-- coordinates when lat/lng are missing — no trigger change needed.
-- Radius/geo filtering honestly excludes label-only rows; no geo
-- semantics are invented.
--
-- No data is modified; existing rows keep their values.

ALTER TABLE "technician_service_areas" ALTER COLUMN "latitude" DROP NOT NULL;
ALTER TABLE "technician_service_areas" ALTER COLUMN "longitude" DROP NOT NULL;
