import appliance_air_conditioner from '../assets/scenes/appliance_air_conditioner.webp';
import appliance_refrigerator from '../assets/scenes/appliance_refrigerator.webp';
import appliance_washing_machine from '../assets/scenes/appliance_washing_machine.webp';
import customer_home_hero from '../assets/scenes/customer_home_hero.webp';
import customer_onboarding_diagnosis from '../assets/scenes/customer_onboarding_diagnosis.webp';
import customer_onboarding_home from '../assets/scenes/customer_onboarding_home.webp';
import customer_onboarding_technician from '../assets/scenes/customer_onboarding_technician.webp';
import fault_air_conditioner from '../assets/scenes/fault_air_conditioner.webp';
import fault_diagnosis_visual from '../assets/scenes/fault_diagnosis_visual.webp';
import fault_empty from '../assets/scenes/fault_empty.webp';
import fault_refrigerator from '../assets/scenes/fault_refrigerator.webp';
import fault_success from '../assets/scenes/fault_success.webp';
import fault_washing_machine from '../assets/scenes/fault_washing_machine.webp';
import merchant_dashboard_hero from '../assets/scenes/merchant_dashboard_hero.webp';
import merchant_products from '../assets/scenes/merchant_products.webp';
import merchant_sales from '../assets/scenes/merchant_sales.webp';
import merchant_success from '../assets/scenes/merchant_success.webp';
import service_request_confirmation from '../assets/scenes/service_request_confirmation.webp';
import service_request_service from '../assets/scenes/service_request_service.webp';
import service_request_success from '../assets/scenes/service_request_success.webp';
import subscription_hero from '../assets/scenes/subscription_hero.webp';
import subscription_premium from '../assets/scenes/subscription_premium.webp';
import technician_availability from '../assets/scenes/technician_availability.webp';
import technician_dashboard_hero from '../assets/scenes/technician_dashboard_hero.webp';
import technician_dashboard_performance from '../assets/scenes/technician_dashboard_performance.webp';
import technician_discovery_hero from '../assets/scenes/technician_discovery_hero.webp';
import technician_placeholder_female from '../assets/scenes/technician_placeholder_female.webp';
import technician_placeholder_male from '../assets/scenes/technician_placeholder_male.webp';
import technician_profile_hero from '../assets/scenes/technician_profile_hero.webp';
import technician_profile_location from '../assets/scenes/technician_profile_location.webp';
import technician_profile_reviews from '../assets/scenes/technician_profile_reviews.webp';
import technician_profile_services from '../assets/scenes/technician_profile_services.webp';
import technician_requests from '../assets/scenes/technician_requests.webp';
import technician_trust from '../assets/scenes/technician_trust.webp';
import tracking_completed from '../assets/scenes/tracking_completed.webp';
import tracking_in_progress from '../assets/scenes/tracking_in_progress.webp';
import tracking_on_the_way from '../assets/scenes/tracking_on_the_way.webp';
import tracking_success from '../assets/scenes/tracking_success.webp';

import type { ImageSourcePropType } from 'react-native';

export const sceneAssets = {
  appliance_air_conditioner,
  appliance_refrigerator,
  appliance_washing_machine,
  customer_home_hero,
  customer_onboarding_diagnosis,
  customer_onboarding_home,
  customer_onboarding_technician,
  fault_air_conditioner,
  fault_diagnosis_visual,
  fault_empty,
  fault_refrigerator,
  fault_success,
  fault_washing_machine,
  merchant_dashboard_hero,
  merchant_products,
  merchant_sales,
  merchant_success,
  service_request_confirmation,
  service_request_service,
  service_request_success,
  subscription_hero,
  subscription_premium,
  technician_availability,
  technician_dashboard_hero,
  technician_dashboard_performance,
  technician_discovery_hero,
  technician_placeholder_female,
  technician_placeholder_male,
  technician_profile_hero,
  technician_profile_location,
  technician_profile_reviews,
  technician_profile_services,
  technician_requests,
  technician_trust,
  tracking_completed,
  tracking_in_progress,
  tracking_on_the_way,
  tracking_success,
} as const satisfies Record<string, ImageSourcePropType>;

export type SceneAssetName = keyof typeof sceneAssets;
