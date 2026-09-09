import TechnicianReviewsScreen from '../../src/features/technician/reviews/technician-reviews-screen';

/**
 * Route entry: Technician Reviews (T-E). Presentation of received
 * ratings behind `useTechnicianReviewsViewModel` (mock today, real
 * API adapter later without touching this file).
 */
export default function TechnicianReviewsRoute() {
  return <TechnicianReviewsScreen />;
}
