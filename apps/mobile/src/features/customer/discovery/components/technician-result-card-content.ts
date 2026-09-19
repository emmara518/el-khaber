import type { Technician } from '../technician-types';

function cleanLabels(labels: ReadonlyArray<string>): string[] {
  return [...new Set(labels.map((label) => label.trim()).filter(Boolean))];
}

export function getTechnicianCardContent(technician: Technician) {
  const name = technician.nameAr.trim();
  const initials = technician.initialsAr.trim() || Array.from(name)[0] || '';
  const services = cleanLabels(technician.servicesAr);
  const specialties = cleanLabels(technician.specialtiesAr).filter(
    (specialty) => !services.includes(specialty),
  );
  const areas = cleanLabels(technician.areasAr);
  const experience = technician.experienceAr.trim();
  const availability = technician.availabilityLabelAr.trim();
  const verified = technician.verified === true;
  const rating =
    Number.isInteger(technician.reviewCount) &&
    technician.reviewCount > 0 &&
    Number.isFinite(technician.rating) &&
    technician.rating > 0 &&
    technician.rating <= 5
      ? { value: technician.rating, count: technician.reviewCount }
      : null;

  return {
    name,
    initials,
    services,
    specialties,
    areas,
    experience,
    availability,
    verified,
    rating,
    accessibilityLabel: [
      `عرض ملف ${name}`,
      ...specialties,
      ...services,
      rating !== null
        ? `التقييم ${rating.value.toFixed(1)} من ٥، عدد التقييمات ${rating.count}`
        : '',
      verified ? 'موثّق من الخبير: تم التحقق من الهوية والخبرة' : '',
      availability,
      experience,
      areas.length > 0 ? `مناطق الخدمة: ${areas.join('، ')}` : '',
    ]
      .filter(Boolean)
      .join('، '),
  };
}
