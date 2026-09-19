import { describe, expect, it } from 'vitest';

import { getTechnicianCardContent } from './technician-result-card-content';

import type { Technician } from '../technician-types';

const technician: Technician = {
  id: 'test-technician',
  nameAr: 'أحمد محمد',
  initialsAr: 'أم',
  verified: false,
  rating: 0,
  reviewCount: 0,
  experienceAr: '',
  specialtiesAr: [],
  appliances: [],
  servicesAr: [],
  areasAr: [],
  aboutAr: '',
  available: false,
  availabilityLabelAr: '',
  reviews: [],
};

describe('technician result card content', () => {
  it('omits absent metadata and trust claims from sparse real-model data', () => {
    const content = getTechnicianCardContent(technician);
    expect(content).toMatchObject({
      name: 'أحمد محمد',
      initials: 'أم',
      rating: null,
      verified: false,
      availability: '',
      experience: '',
      services: [],
      specialties: [],
      areas: [],
      accessibilityLabel: 'عرض ملف أحمد محمد',
    });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, 5.1])(
    'omits invalid rating %s even with reviews',
    (rating) => {
      const content = getTechnicianCardContent({ ...technician, rating, reviewCount: 12 });
      expect(content.rating).toBeNull();
      expect(content.accessibilityLabel).not.toContain('التقييم');
    },
  );

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])(
    'omits rating when review count %s is not a positive integer',
    (reviewCount) => {
      const content = getTechnicianCardContent({ ...technician, rating: 4.8, reviewCount });
      expect(content.rating).toBeNull();
      expect(content.accessibilityLabel).not.toContain('التقييم');
    },
  );

  it('includes a genuine rating, review count and verified claim', () => {
    const content = getTechnicianCardContent({
      ...technician,
      rating: 4.8,
      reviewCount: 12,
      verified: true,
    });
    expect(content.rating).toEqual({ value: 4.8, count: 12 });
    expect(content.verified).toBe(true);
    expect(content.accessibilityLabel).toContain('التقييم 4.8 من ٥، عدد التقييمات 12');
    expect(content.accessibilityLabel).toContain('موثّق من الخبير');
  });

  it.each(['مشغول حاليًا', 'غير متاح', 'متاح اليوم'])(
    'preserves the mapped availability label %s without inferring from the boolean',
    (availabilityLabelAr) => {
      const content = getTechnicianCardContent({ ...technician, availabilityLabelAr });
      expect(content.availability).toBe(availabilityLabelAr);
      expect(content.accessibilityLabel).toContain(availabilityLabelAr);
    },
  );

  it.each([true, false])('does not invent availability from available=%s', (available) => {
    const content = getTechnicianCardContent({
      ...technician,
      available,
      availabilityLabelAr: ' \n ',
    });
    expect(content.availability).toBe('');
    expect(content.accessibilityLabel).toBe('عرض ملف أحمد محمد');
  });

  it('trims, deduplicates and renders only actual services and nonblank metadata', () => {
    const input = {
      ...technician,
      servicesAr: [' صيانة غسالات ', '', 'صيانة غسالات', 'تركيب غسالات'],
      specialtiesAr: ['صيانة غسالات', ' أجهزة منزلية ', ' '],
      areasAr: [' النزهة ', ' ', 'النزهة'],
      experienceAr: ' خبرة ٥ سنوات ',
    };
    const content = getTechnicianCardContent(input);
    expect(content.services).toEqual(['صيانة غسالات', 'تركيب غسالات']);
    expect(content.specialties).toEqual(['أجهزة منزلية']);
    expect(content.areas).toEqual(['النزهة']);
    expect(content.experience).toBe('خبرة ٥ سنوات');
    expect(content.accessibilityLabel).toContain('مناطق الخدمة: النزهة');
    expect(content.accessibilityLabel.match(/صيانة غسالات/g)).toHaveLength(1);
    expect(input.servicesAr[0]).toBe(' صيانة غسالات ');
  });

  it('omits whitespace-only service, area and experience fields', () => {
    const content = getTechnicianCardContent({
      ...technician,
      servicesAr: [' ', '\n'],
      specialtiesAr: [' '],
      areasAr: [' '],
      experienceAr: '\n',
    });
    expect(content.services).toEqual([]);
    expect(content.specialties).toEqual([]);
    expect(content.areas).toEqual([]);
    expect(content.experience).toBe('');
    expect(content.accessibilityLabel).toBe('عرض ملف أحمد محمد');
  });

  it('derives missing initials only from the actual name', () => {
    expect(getTechnicianCardContent({ ...technician, initialsAr: ' ' }).initials).toBe('أ');
    expect(getTechnicianCardContent({ ...technician, initialsAr: '', nameAr: '' }).initials).toBe('');
  });
});
