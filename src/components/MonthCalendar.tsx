import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ScalePressable } from './ScalePressable';
import { COLORS, FONT, RADIUS, SPACING } from './theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const pad = (n: number) => String(n).padStart(2, '0');

// Build a plain calendar-day key (never goes through timezone math).
export function ymd(year: number, month0: number, day: number) {
  return `${year}-${pad(month0 + 1)}-${pad(day)}`;
}

export function todayKey() {
  const now = new Date();
  return ymd(now.getFullYear(), now.getMonth(), now.getDate());
}

type Props = {
  /** Any day within the displayed month. */
  viewDate: Date;
  /** Selected day key, YYYY-MM-DD. */
  selectedKey: string;
  /** Day keys (YYYY-MM-DD) that have at least one session. */
  markedKeys: Set<string>;
  onChangeMonth: (next: Date) => void;
  onSelectDay: (key: string) => void;
};

export function MonthCalendar({
  viewDate,
  selectedKey,
  markedKeys,
  onChangeMonth,
  onSelectDay
}: Props) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const today = todayKey();

  const weeks = useMemo(() => {
    const firstWeekday = new Date(year, month, 1).getDay(); // 0=Sun
    const lead = (firstWeekday + 6) % 7; // shift to Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < lead; i += 1) cells.push(null);
    for (let d = 1; d <= daysInMonth; d += 1) cells.push(d);
    while (cells.length % 7 !== 0) cells.push(null);
    // Chunk into rows of 7 so each week renders as its own flex row. This keeps
    // exactly 7 columns regardless of sub-pixel rounding.
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [year, month]);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <ScalePressable style={styles.navButton} onPress={() => onChangeMonth(new Date(year, month - 1, 1))}>
          <Text style={styles.navText}>‹</Text>
        </ScalePressable>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <ScalePressable style={styles.navButton} onPress={() => onChangeMonth(new Date(year, month + 1, 1))}>
          <Text style={styles.navText}>›</Text>
        </ScalePressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((w, i) => (
          <Text key={`${w}-${i}`} style={styles.weekday}>
            {w}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {weeks.map((week, weekIndex) => (
          <View key={`week-${weekIndex}`} style={styles.weekLine}>
            {week.map((day, dayIndex) => {
              if (day === null) {
                return <View key={`blank-${weekIndex}-${dayIndex}`} style={styles.cell} />;
              }
              const key = ymd(year, month, day);
              const isToday = key === today;
              const isSelected = key === selectedKey;
              const isMarked = markedKeys.has(key);
              return (
                <ScalePressable key={key} style={styles.cell} onPress={() => onSelectDay(key)}>
                  <View
                    style={[
                      styles.dayInner,
                      isToday && styles.dayToday,
                      isSelected && styles.daySelected
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isSelected && styles.dayTextSelected,
                        isToday && !isSelected && styles.dayTextToday
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                  {isMarked ? (
                    <View style={[styles.dot, isSelected && styles.dotSelected]} />
                  ) : (
                    <View style={styles.dotPlaceholder} />
                  )}
                </ScalePressable>
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  navText: {
    color: COLORS.accent,
    fontFamily: FONT.display,
    fontSize: 28,
    lineHeight: 30
  },
  monthLabel: {
    color: COLORS.text,
    fontFamily: FONT.display,
    fontSize: 26,
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: SPACING.xs
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.muted,
    fontFamily: FONT.bodyBold,
    fontSize: 11,
    letterSpacing: 1
  },
  grid: {
    flexDirection: 'column'
  },
  weekLine: {
    flexDirection: 'row'
  },
  cell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4
  },
  dayInner: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center'
  },
  dayToday: {
    borderWidth: 1,
    borderColor: COLORS.border
  },
  daySelected: {
    backgroundColor: COLORS.accent
  },
  dayText: {
    color: COLORS.text,
    fontFamily: FONT.bodyMedium,
    fontSize: 15
  },
  dayTextToday: {
    color: COLORS.accent
  },
  dayTextSelected: {
    color: '#000',
    fontFamily: FONT.bodyBold
  },
  dot: {
    marginTop: 3,
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.accent2
  },
  dotSelected: {
    backgroundColor: COLORS.accent
  },
  dotPlaceholder: {
    marginTop: 3,
    width: 5,
    height: 5
  }
});
