-- DB-008: database-level guards for money ranges and coordinate pairs.
--
-- Application validation is not the final authority for financial or
-- geographic columns. These checks are additive and accept every currently
-- valid row (NULL prices remain valid where the schema permits them).

ALTER TABLE "service_requests"
  ADD CONSTRAINT "service_requests_estimated_prices_nonnegative"
  CHECK (
    ("estimated_price_from" IS NULL OR "estimated_price_from" >= 0) AND
    ("estimated_price_to" IS NULL OR "estimated_price_to" >= 0) AND
    ("final_price" IS NULL OR "final_price" >= 0)
  );

ALTER TABLE "service_requests"
  ADD CONSTRAINT "service_requests_estimated_price_order"
  CHECK (
    "estimated_price_from" IS NULL OR
    "estimated_price_to" IS NULL OR
    "estimated_price_from" <= "estimated_price_to"
  );

ALTER TABLE "products"
  ADD CONSTRAINT "products_price_nonnegative"
  CHECK ("price" IS NULL OR "price" >= 0);

ALTER TABLE "technician_services"
  ADD CONSTRAINT "technician_services_price_from_nonnegative"
  CHECK ("price_from" IS NULL OR "price_from" >= 0);

ALTER TABLE "payment_submissions"
  ADD CONSTRAINT "payment_submissions_amount_nonnegative"
  CHECK ("amount" >= 0);

ALTER TABLE "locations"
  ADD CONSTRAINT "locations_coordinate_pair"
  CHECK (("latitude" IS NULL) = ("longitude" IS NULL));

ALTER TABLE "locations"
  ADD CONSTRAINT "locations_coordinate_range"
  CHECK (
    ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)) AND
    ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180))
  );

ALTER TABLE "technician_service_areas"
  ADD CONSTRAINT "technician_service_areas_coordinate_pair"
  CHECK (("latitude" IS NULL) = ("longitude" IS NULL));

ALTER TABLE "technician_service_areas"
  ADD CONSTRAINT "technician_service_areas_coordinate_range"
  CHECK (
    ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)) AND
    ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180))
  );
