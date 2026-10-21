-- Task REM-001: allow label/address-only customer locations.
--
-- docs/06_DATABASE.md §6 says "Store exact coordinates only when required."
-- No map/geocoding provider is approved, so a customer location may carry
-- only a label + address text. The latitude/longitude -> geography
-- derivation trigger (`set_location_coordinates`) already handles NULL
-- latitude/longitude by leaving `coordinates` NULL, so this migration only
-- relaxes the NOT NULL constraints.
--
-- Non-destructive/additive: no DROP TABLE/COLUMN, no data rewrite.

ALTER TABLE "locations" ALTER COLUMN "latitude" DROP NOT NULL;
ALTER TABLE "locations" ALTER COLUMN "longitude" DROP NOT NULL;
