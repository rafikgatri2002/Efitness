import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  View
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar } from '../components/Avatar';
import { ScalePressable } from '../components/ScalePressable';
import { COLORS, FONT, RADIUS, SPACING } from '../components/theme';
import { HomeStackParamList } from '../navigation/types';
import { useAuth } from '../services/AuthContext';
import { getApiErrorMessage, getMuscles, MuscleItem } from '../services/api';

const fallbackMuscles = [
  { muscle: 'Chest', emoji: '🫁' },
  { muscle: 'Back', emoji: '🦴' },
  { muscle: 'Biceps', emoji: '💪' },
  { muscle: 'Triceps', emoji: '🦾' },
  { muscle: 'Legs', emoji: '🦵' },
  { muscle: 'Shoulders', emoji: '🎯' },
  { muscle: 'Abs', emoji: '⚡' },
  { muscle: 'Cardio', emoji: '🏃' }
] as const;

type Nav = NativeStackNavigationProp<HomeStackParamList, 'MusclesList'>;

function formatDate(value?: string | null) {
  if (!value) {
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function todayLabel() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long'
  });
}

export function HomeScreen() {
  const navigation = useNavigation<Nav>();
  const { user, logout } = useAuth();
  const [items, setItems] = useState<MuscleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (refresh = false) => {
    if (refresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const data = await getMuscles();
      setItems(data);
    } catch (error) {
      Alert.alert('Could not load muscles', getApiErrorMessage(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const mergedMuscles = useMemo(() => {
    return fallbackMuscles.map((base) => {
      const fromApi = items.find(
        (entry) => entry.muscle.toLowerCase() === base.muscle.toLowerCase()
      );
      return {
        muscle: base.muscle,
        emoji: base.emoji,
        exercise_count: fromApi?.exercise_count ?? 0,
        last_trained: fromApi?.last_trained ?? null
      };
    });
  }, [items]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={mergedMuscles}
      numColumns={2}
      columnWrapperStyle={styles.columnWrap}
      keyExtractor={(item) => item.muscle}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => loadData(true)} tintColor={COLORS.accent} />
      }
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.title}>MUSCLES</Text>
              <Text style={styles.date}>{todayLabel()}</Text>
            </View>
            <ScalePressable onPress={logout}>
              <Avatar name={user?.name ?? 'User'} />
            </ScalePressable>
          </View>

          <Text style={styles.sectionLabel}>Choose a muscle group</Text>
        </View>
      }
      renderItem={({ item }) => {
        const countLabel = item.exercise_count === 0 ? 'No exercises yet' : `${item.exercise_count} exercises`;

        return (
          <ScalePressable
            style={styles.card}
            onPress={() => navigation.navigate('Exercises', { muscle: item.muscle, emoji: item.emoji })}
          >
            {item.exercise_count > 0 ? <View style={styles.liveDot} /> : null}
            <Text style={styles.cardEmoji}>{item.emoji}</Text>
            <Text style={styles.cardTitle}>{item.muscle}</Text>
            <Text style={styles.cardMeta}>{countLabel}</Text>
            {item.last_trained ? (
              <Text style={styles.cardLast}>Last: {formatDate(item.last_trained)}</Text>
            ) : null}
          </ScalePressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listContent: {
    backgroundColor: COLORS.bg,
    paddingHorizontal: SPACING.md,
    paddingBottom: 120
  },
  headerWrap: {
    paddingTop: SPACING.xl + 4,
    marginBottom: SPACING.md
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  title: {
    color: COLORS.accent,
    fontFamily: FONT.display,
    letterSpacing: 2,
    fontSize: 32
  },
  date: {
    color: COLORS.muted,
    fontFamily: FONT.body,
    fontSize: 14,
    marginTop: -4
  },
  sectionLabel: {
    marginTop: SPACING.lg,
    color: COLORS.text,
    fontFamily: FONT.bodyMedium,
    fontSize: 16
  },
  columnWrap: {
    gap: SPACING.md
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    minHeight: 150,
    marginBottom: SPACING.md,
    position: 'relative'
  },
  cardEmoji: {
    fontSize: 30
  },
  cardTitle: {
    marginTop: SPACING.sm,
    color: COLORS.text,
    fontFamily: FONT.bodyBold,
    fontSize: 18
  },
  cardMeta: {
    marginTop: SPACING.xs,
    color: COLORS.muted,
    fontFamily: FONT.body,
    fontSize: 12
  },
  cardLast: {
    marginTop: SPACING.sm,
    color: COLORS.muted,
    fontFamily: FONT.bodyMedium,
    fontSize: 12
  },
  liveDot: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.accent2
  }
});
