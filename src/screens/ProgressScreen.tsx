import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { VictoryArea, VictoryAxis, VictoryChart, VictoryTheme } from 'victory-native';
import { Avatar } from '../components/Avatar';
import { ScalePressable } from '../components/ScalePressable';
import { COLORS, FONT, RADIUS, SPACING } from '../components/theme';
import { useAuth } from '../services/AuthContext';
import {
  ExerciseProgressPoint,
  getApiErrorMessage,
  getExerciseProgress,
  getExercisesByMuscle,
  getMuscles,
  getProgressOverview,
  ProgressOverview
} from '../services/api';

type ExerciseOption = { id: string; name: string };

function monthShort(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toLocaleDateString(undefined, { month: 'short' });
}

function dateLine(date: string) {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) {
    return date;
  }
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

export function ProgressScreen() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<ProgressOverview | null>(null);
  const [exerciseOptions, setExerciseOptions] = useState<ExerciseOption[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseOption | null>(null);
  const [chartData, setChartData] = useState<ExerciseProgressPoint[]>([]);

  const loadOptions = useCallback(async () => {
    const muscles = await getMuscles();
    const withExercises = muscles.filter((m) => m.exercise_count > 0);
    const exerciseLists = await Promise.all(
      withExercises.map((m) => getExercisesByMuscle(m.muscle))
    );

    const options = exerciseLists
      .flat()
      .map((exercise) => ({ id: exercise.id, name: exercise.name }))
      .filter(
        (item, index, self) => self.findIndex((entry) => entry.id === item.id) === index
      );

    setExerciseOptions(options);
    return options;
  }, []);

  const loadOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [overviewData, options] = await Promise.all([getProgressOverview(), loadOptions()]);
      setOverview(overviewData);

      const first = options[0] || null;
      setSelectedExercise(first);
      if (first) {
        const progress = await getExerciseProgress(first.id);
        setChartData(progress);
      } else {
        setChartData([]);
      }
    } catch (error) {
      Alert.alert('Could not load progress', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [loadOptions]);

  const pickExercise = useCallback(async (exercise: ExerciseOption) => {
    try {
      setSelectedExercise(exercise);
      const progress = await getExerciseProgress(exercise.id);
      setChartData(progress);
    } catch (error) {
      Alert.alert('Could not load chart', getApiErrorMessage(error));
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const chartPoints = useMemo(() => {
    if (!Array.isArray(chartData)) {
      return [];
    }
    return chartData.map((point) => ({
      x: monthShort(point.date) || point.date,
      y: point.max_weight
    }));
  }, [chartData]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.content}
      data={overview?.recent_sessions || []}
      keyExtractor={(item) => String(item.id)}
      ListHeaderComponent={
        <>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.title}>PROGRESS</Text>
              <Text style={styles.subtitle}>Your journey so far</Text>
            </View>
            <Avatar name={user?.name || 'User'} />
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{overview?.total_sessions || 0}</Text>
              <Text style={styles.statLabel}>SESSIONS</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{overview?.prs_this_month || 0}</Text>
              <Text style={styles.statLabel}>PRS THIS MONTH</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{overview?.week_streak || 0}</Text>
              <Text style={styles.statLabel}>WEEK STREAK</Text>
            </View>
          </View>

          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>
              {selectedExercise ? `${selectedExercise.name} – weight over time` : 'No exercise data yet'}
            </Text>

            <FlatList
              horizontal
              data={exerciseOptions}
              keyExtractor={(item) => String(item.id)}
              showsHorizontalScrollIndicator={false}
              style={styles.exercisePills}
              renderItem={({ item }) => (
                <ScalePressable
                  style={[
                    styles.pill,
                    selectedExercise?.id === item.id && styles.pillActive
                  ]}
                  onPress={() => pickExercise(item)}
                >
                  <Text
                    style={[
                      styles.pillText,
                      selectedExercise?.id === item.id && styles.pillTextActive
                    ]}
                  >
                    {item.name}
                  </Text>
                </ScalePressable>
              )}
            />

            {chartPoints.length > 0 ? (
              <VictoryChart
                height={220}
                theme={VictoryTheme.material}
                domainPadding={{ x: 16, y: 20 }}
                padding={{ top: 20, left: 40, right: 20, bottom: 36 }}
              >
                <VictoryAxis
                  style={{
                    axis: { stroke: COLORS.border },
                    tickLabels: { fill: COLORS.muted, fontSize: 10, fontFamily: FONT.body }
                  }}
                />
                <VictoryAxis
                  dependentAxis
                  style={{
                    axis: { stroke: COLORS.border },
                    grid: { stroke: '#1f1f1f' },
                    tickLabels: { fill: COLORS.muted, fontSize: 10, fontFamily: FONT.body }
                  }}
                />
                <VictoryArea
                  interpolation="monotoneX"
                  data={chartPoints}
                  style={{
                    data: {
                      fill: 'rgba(232,255,71,0.2)',
                      stroke: COLORS.accent,
                      strokeWidth: 2
                    }
                  }}
                />
              </VictoryChart>
            ) : (
              <View style={styles.chartEmpty}>
                <Text style={styles.chartEmptyText}>No chart points yet</Text>
              </View>
            )}
          </View>

          <Text style={styles.sectionHeading}>Recent sessions</Text>
        </>
      }
      ListEmptyComponent={
        <View style={styles.emptyHistory}>
          <Text style={styles.emptyHistoryText}>No sessions logged yet</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.historyCard}>
          <Text style={styles.historyDate}>
            {dateLine(item.date)}
            {item.duration_minutes ? ` · ${item.duration_minutes} MIN` : ''}
          </Text>
          <Text style={styles.historyMuscles}>{item.muscles.join(', ')}</Text>
          <Text style={styles.historySummary}>{item.exercises_summary}</Text>
          {item.pr_badge ? (
            <View style={styles.prBadge}>
              <Text style={styles.prBadgeText}>🏆 PR — {item.pr_badge}</Text>
            </View>
          ) : null}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg
  },
  content: {
    paddingTop: 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: 110
  },
  centered: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    color: COLORS.accent,
    fontFamily: FONT.display,
    letterSpacing: 2,
    fontSize: 36,
    lineHeight: 34
  },
  subtitle: {
    color: COLORS.muted,
    fontFamily: FONT.body,
    fontSize: 13
  },
  statsRow: {
    marginTop: SPACING.lg,
    flexDirection: 'row',
    gap: SPACING.sm
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: 'center'
  },
  statValue: {
    color: COLORS.accent,
    fontFamily: FONT.display,
    letterSpacing: 1.3,
    fontSize: 32
  },
  statLabel: {
    color: COLORS.muted,
    fontFamily: FONT.bodyBold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontSize: 10,
    textAlign: 'center'
  },
  chartCard: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md
  },
  chartTitle: {
    color: COLORS.text,
    fontFamily: FONT.bodyBold,
    fontSize: 16
  },
  exercisePills: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    maxHeight: 34
  },
  pill: {
    marginRight: SPACING.sm,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  pillActive: {
    borderColor: COLORS.accent,
    backgroundColor: '#2d3910'
  },
  pillText: {
    color: COLORS.muted,
    fontFamily: FONT.bodyMedium,
    fontSize: 12
  },
  pillTextActive: {
    color: COLORS.accent
  },
  chartEmpty: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chartEmptyText: {
    color: COLORS.muted,
    fontFamily: FONT.body
  },
  sectionHeading: {
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
    color: COLORS.text,
    fontFamily: FONT.display,
    fontSize: 28,
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  },
  emptyHistory: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xl
  },
  emptyHistoryText: {
    color: COLORS.muted,
    fontFamily: FONT.body
  },
  historyCard: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm
  },
  historyDate: {
    color: COLORS.muted,
    fontFamily: FONT.bodyBold,
    textTransform: 'uppercase',
    fontSize: 11,
    letterSpacing: 1.1
  },
  historyMuscles: {
    marginTop: SPACING.xs,
    color: COLORS.text,
    fontFamily: FONT.bodyBold,
    fontSize: 16
  },
  historySummary: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: FONT.body,
    fontSize: 13
  },
  prBadge: {
    marginTop: SPACING.sm,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#2d3910',
    borderWidth: 1,
    borderColor: COLORS.accent,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  prBadgeText: {
    color: COLORS.accent,
    fontFamily: FONT.bodyBold,
    fontSize: 11
  }
});
