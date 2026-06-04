import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { HomeStackParamList } from '../navigation/types';
import { COLORS, FONT, RADIUS, SPACING } from '../components/theme';
import { ScalePressable } from '../components/ScalePressable';
import {
  createExercise,
  deleteExercise,
  Exercise,
  getApiErrorMessage,
  getExercisesByMuscle
} from '../services/api';
import { getMuscleImage } from '../assets/muscles';

type Props = NativeStackScreenProps<HomeStackParamList, 'Exercises'>;

export function ExercisesScreen({ route, navigation }: Props) {
  const { muscle, emoji } = route.params;
  const headerImage = getMuscleImage(muscle);
  const [items, setItems] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏋️');
  const [imageUrl, setImageUrl] = useState<string | undefined>(undefined);

  const loadExercises = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getExercisesByMuscle(muscle);
      setItems(data);
    } catch (error) {
      Alert.alert('Could not load exercises', getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [muscle]);

  useFocusEffect(
    useCallback(() => {
      loadExercises();
    }, [loadExercises])
  );

  const addExercise = async () => {
    if (!name.trim()) {
      Alert.alert('Missing name', 'Please enter an exercise name.');
      return;
    }

    setSaving(true);
    try {
      await createExercise({
        muscle,
        name: name.trim(),
        emoji: icon.trim() || '🏋️',
        image_url: imageUrl
      });
      setName('');
      setIcon('🏋️');
      setImageUrl(undefined);
      setShowModal(false);
      await loadExercises();
    } catch (error) {
      Alert.alert('Could not create exercise', getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (exercise: Exercise) => {
    Alert.alert('Delete exercise?', `${exercise.name} and all sessions will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteExercise(exercise.id);
            await loadExercises();
          } catch (error) {
            Alert.alert('Delete failed', getApiErrorMessage(error));
          }
        }
      }
    ]);
  };

  const subtitle = useMemo(() => {
    if (items.length === 0) {
      return '0 exercises';
    }
    return `${items.length} exercises`;
  }, [items.length]);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission denied', 'Allow media access to pick an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8
    });

    if (!result.canceled) {
      setImageUrl(result.assets[0].uri);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ScalePressable onPress={() => navigation.goBack()}>
          <Text style={styles.back}>‹ Back</Text>
        </ScalePressable>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>{muscle}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {headerImage ? (
          <Image source={headerImage} style={styles.headerImage} resizeMode="cover" />
        ) : (
          <Text style={styles.headerEmoji}>{emoji}</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyEmoji}>🏋️</Text>
          <Text style={styles.emptyTitle}>No exercises yet</Text>
          <Text style={styles.emptyText}>Tap the + button below to add your first one</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <ScalePressable
              style={styles.card}
              onPress={() =>
                navigation.navigate('Session', {
                  exerciseId: item.id,
                  exerciseName: item.name,
                  emoji: item.emoji || '🏋️'
                })
              }
              onLongPress={() => confirmDelete(item)}
            >
              <View style={styles.iconBox}>
                <Text style={styles.iconEmoji}>{item.emoji || '🏋️'}</Text>
              </View>

              <View style={styles.cardMain}>
                <Text style={styles.cardName}>{item.name}</Text>
                <Text style={styles.cardMeta}>{item.last_session_summary || 'No sessions yet'}</Text>
              </View>

              <View style={styles.prWrap}>
                <Text style={styles.prValue}>
                  {item.personal_best ? item.personal_best : '–'}
                  {item.personal_best ? <Text style={styles.prUnit}>kg</Text> : null}
                </Text>
                <Text style={styles.prLabel}>PR</Text>
              </View>
            </ScalePressable>
          )}
        />
      )}

      <ScalePressable style={styles.fab} onPress={() => setShowModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </ScalePressable>

      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <KeyboardAvoidingView
            style={styles.overlay}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <TouchableWithoutFeedback>
              <View style={styles.sheet}>
                <View style={styles.handle} />
                <Text style={styles.sheetTitle}>Add exercise</Text>

                <Text style={styles.label}>EXERCISE NAME</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  style={styles.input}
                  placeholder="Bench Press"
                  placeholderTextColor={COLORS.muted}
                />

                <Text style={styles.label}>EMOJI ICON</Text>
                <TextInput
                  value={icon}
                  onChangeText={setIcon}
                  style={[styles.input, styles.emojiInput]}
                  placeholder="🏋️"
                  placeholderTextColor={COLORS.muted}
                />

                <ScalePressable style={styles.imageButton} onPress={pickImage}>
                  <Text style={styles.imageButtonText}>PICK IMAGE (OPTIONAL)</Text>
                </ScalePressable>
                {imageUrl ? <Image source={{ uri: imageUrl }} style={styles.previewImage} /> : null}

                <View style={styles.modalButtons}>
                  <ScalePressable style={styles.cancelButton} onPress={() => setShowModal(false)}>
                    <Text style={styles.cancelText}>Cancel</Text>
                  </ScalePressable>

                  <ScalePressable style={styles.addButton} onPress={addExercise} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text style={styles.addText}>ADD</Text>
                    )}
                  </ScalePressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  back: {
    color: COLORS.muted,
    fontFamily: FONT.bodyMedium,
    fontSize: 16
  },
  headerCenter: {
    alignItems: 'center'
  },
  title: {
    color: COLORS.accent,
    fontFamily: FONT.display,
    letterSpacing: 2,
    fontSize: 44,
    lineHeight: 40,
    textTransform: 'uppercase'
  },
  subtitle: {
    marginTop: -4,
    color: COLORS.muted,
    fontFamily: FONT.body,
    fontSize: 12
  },
  headerEmoji: {
    fontSize: 26
  },
  headerImage: {
    width: 56,
    height: 56,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  listContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: 100
  },
  card: {
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center'
  },
  iconBox: {
    width: 52,
    height: 52,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center'
  },
  iconEmoji: {
    fontSize: 24
  },
  cardMain: {
    flex: 1,
    marginHorizontal: SPACING.md
  },
  cardName: {
    color: COLORS.text,
    fontFamily: FONT.bodyBold,
    fontSize: 17
  },
  cardMeta: {
    color: COLORS.muted,
    fontFamily: FONT.body,
    marginTop: 4,
    fontSize: 12
  },
  prWrap: {
    alignItems: 'flex-end'
  },
  prValue: {
    color: COLORS.accent,
    fontFamily: FONT.display,
    fontSize: 28,
    letterSpacing: 1
  },
  prUnit: {
    color: COLORS.muted,
    fontFamily: FONT.bodyMedium,
    fontSize: 12
  },
  prLabel: {
    color: COLORS.muted,
    fontFamily: FONT.display,
    fontSize: 11,
    letterSpacing: 1.5
  },
  fab: {
    position: 'absolute',
    right: SPACING.lg,
    bottom: SPACING.xl,
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 5
  },
  fabText: {
    color: '#000',
    fontFamily: FONT.display,
    fontSize: 44,
    lineHeight: 42
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl
  },
  emptyEmoji: {
    fontSize: 46
  },
  emptyTitle: {
    marginTop: SPACING.md,
    color: COLORS.text,
    fontFamily: FONT.bodyBold,
    fontSize: 20
  },
  emptyText: {
    marginTop: SPACING.sm,
    color: COLORS.muted,
    fontFamily: FONT.body,
    textAlign: 'center'
  },
  overlay: {
    flex: 1,
    backgroundColor: '#00000099',
    justifyContent: 'flex-end'
  },
  sheet: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    paddingBottom: SPACING.xl
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.border,
    marginBottom: SPACING.md
  },
  sheetTitle: {
    color: COLORS.text,
    fontFamily: FONT.display,
    letterSpacing: 2,
    fontSize: 30,
    textTransform: 'uppercase',
    marginBottom: SPACING.sm
  },
  label: {
    color: COLORS.muted,
    fontFamily: FONT.bodyBold,
    fontSize: 11,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginTop: SPACING.sm
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
    color: COLORS.text,
    fontFamily: FONT.bodyMedium,
    fontSize: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2
  },
  emojiInput: {
    textAlign: 'center',
    fontSize: 28
  },
  imageButton: {
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    paddingVertical: SPACING.sm + 2
  },
  imageButtonText: {
    color: COLORS.text,
    fontFamily: FONT.display,
    fontSize: 18,
    letterSpacing: 1.3
  },
  previewImage: {
    width: '100%',
    height: 120,
    borderRadius: RADIUS.md,
    marginTop: SPACING.sm
  },
  modalButtons: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginTop: SPACING.lg
  },
  cancelButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surface2,
    borderColor: COLORS.border,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  cancelText: {
    color: COLORS.text,
    fontFamily: FONT.bodyMedium,
    fontSize: 15
  },
  addButton: {
    flex: 2,
    minHeight: 48,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  addText: {
    color: '#000',
    fontFamily: FONT.display,
    fontSize: 24,
    letterSpacing: 1.3
  }
});
