import { color, radius, spacing, typography } from '@khabir/ui-tokens';
import { StyleSheet, Text, View } from 'react-native';

import { Avatar, Card, StatusBadge } from '../../../../ui';

import type { CurrentOrderItem } from '../data/customer-home-types';

interface CurrentOrderCardProps {
  order: CurrentOrderItem;
}

/**
 * Card for the "طلباتك الحالية" list. Mirrors the reference:
 * appliance image tile (left), title + model + status badge (center),
 * technician avatar + task + scheduled time (right).
 */
export function CurrentOrderCard({ order }: CurrentOrderCardProps) {
  // Format the ISO time as "غداً 2:00 م" or "اليوم 2:00 م" for
  // friendliness. We avoid a heavy date library; the format is
  // sufficient for the Home screen presentation.
  const scheduled = formatScheduleAr(order.scheduledAtIso);
  return (
    <Card background={color.surface.base} padded style={styles.card}>
      <View style={styles.row}>
        <View style={styles.iconSlot}>
          <Avatar initials={initialFor(order.applianceAr)} size={56} />
        </View>
        <View style={styles.middle}>
          <Text style={styles.task}>{order.taskAr}</Text>
          <Text style={styles.model}>{order.brandAndModel} {order.modelCode}</Text>
          <Text style={styles.techLine}>{order.technicianName}</Text>
        </View>
        <View style={styles.right}>
          <StatusBadge status={order.status} label={order.statusLabelAr} />
          <Text style={styles.time}>{scheduled}</Text>
        </View>
      </View>
    </Card>
  );
}

function initialFor(label: string): string {
  return label.slice(0, 1);
}

function formatScheduleAr(iso: string): string {
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) {
      return iso;
    }
    const now = new Date();
    const dayDiff = Math.round(
      (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) -
        Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) /
        86_400_000,
    );
    const dayLabel = dayDiff === 0 ? 'اليوم' : dayDiff === 1 ? 'غداً' : `${dayDiff} يوم`;
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'م' : 'ص';
    const h12 = ((hours + 11) % 12) + 1;
    return `${dayLabel} ${h12}:${minutes} ${period}`;
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSlot: {
    marginEnd: spacing[3],
  },
  middle: {
    flex: 1,
  },
  right: {
    alignItems: 'flex-end',
    marginStart: spacing[3],
  },
  task: {
    color: color.text.primary,
    fontSize: typography.size.body,
    fontWeight: typography.weight.semibold,
  },
  model: {
    marginTop: spacing[1],
    color: color.text.secondary,
    fontSize: typography.size.caption,
  },
  techLine: {
    marginTop: spacing[1],
    color: color.text.secondary,
    fontSize: typography.size.caption,
  },
  time: {
    marginTop: spacing[2],
    color: color.text.secondary,
    fontSize: typography.size.caption,
  },
});
