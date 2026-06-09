import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar } from '../components/Avatar';
import { ScalePressable } from '../components/ScalePressable';
import { COLORS, FONT, RADIUS, SPACING } from '../components/theme';
import { HomeStackParamList } from '../navigation/types';
import { useAuth } from '../services/AuthContext';
import { getApiErrorMessage, Gender, UpdateProfilePayload } from '../services/api';

type Nav = NativeStackNavigationProp<HomeStackParamList, 'Profile'>;

const GENDERS: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' }
];

type FieldKey = 'name' | 'username' | 'height' | 'weight';

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: 'Underweight', color: COLORS.accent2 };
  if (bmi < 25) return { label: 'Normal', color: COLORS.success };
  if (bmi < 30) return { label: 'Overweight', color: COLORS.accent2 };
  return { label: 'Obese', color: COLORS.danger };
}

function formatMemberSince(iso?: string) {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
}

export function ProfileScreen() {
  const navigation = useNavigation<Nav>();
  const { user, updateProfile, logout } = useAuth();

  const [name, setName] = useState(user?.name ?? '');
  const [username, setUsername] = useState(user?.username ?? '');
  const [gender, setGender] = useState<Gender | null>(user?.gender ?? null);
  const [height, setHeight] = useState(
    user?.height_cm != null ? String(user.height_cm) : ''
  );
  const [weight, setWeight] = useState(
    user?.weight_kg != null ? String(user.weight_kg) : ''
  );
  const [focus, setFocus] = useState<FieldKey | null>(null);
  const [saving, setSaving] = useState(false);

  const heightNum = parseFloat(height);
  const weightNum = parseFloat(weight);

  const bmi = useMemo(() => {
    if (!(heightNum > 0) || !(weightNum > 0)) return null;
    const meters = heightNum / 100;
    return weightNum / (meters * meters);
  }, [heightNum, weightNum]);

  const memberSince = formatMemberSince(user?.created_at);

  const onSave = async () => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      Alert.alert('Invalid name', 'Your name needs at least 2 characters.');
      return;
    }

    const trimmedUsername = username.trim();
    if (trimmedUsername.length > 0 && trimmedUsername.length < 2) {
      Alert.alert('Invalid username', 'Username needs at least 2 characters.');
      return;
    }

    if (height.trim().length > 0 && !(heightNum > 0)) {
      Alert.alert('Invalid height', 'Enter your height in centimetres.');
      return;
    }
    if (weight.trim().length > 0 && !(weightNum > 0)) {
      Alert.alert('Invalid weight', 'Enter your weight in kilograms.');
      return;
    }

    // Only send fields the user actually changed.
    const payload: UpdateProfilePayload = {};
    if (trimmedName !== (user?.name ?? '')) payload.name = trimmedName;
    if (trimmedUsername.length > 0 && trimmedUsername !== (user?.username ?? '')) {
      payload.username = trimmedUsername;
    }
    if (gender && gender !== user?.gender) payload.gender = gender;
    if (heightNum > 0 && heightNum !== user?.height_cm) payload.height_cm = heightNum;
    if (weightNum > 0 && weightNum !== user?.weight_kg) payload.weight_kg = weightNum;

    if (Object.keys(payload).length === 0) {
      Alert.alert('Nothing to save', 'You haven’t changed anything yet.');
      return;
    }

    setSaving(true);
    try {
      await updateProfile(payload);
      Alert.alert('Saved', 'Your profile has been updated.');
    } catch (error) {
      Alert.alert('Could not save', getApiErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: () => logout() }
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <ScalePressable style={styles.backButton} onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>‹</Text>
          </ScalePressable>
          <Text style={styles.title}>PROFILE</Text>
          <View style={styles.backButton} />
        </View>

        <View style={styles.hero}>
          <Avatar name={user?.name || 'User'} size={84} />
          <Text style={styles.heroName}>{user?.name || 'User'}</Text>
          {!!user?.username && <Text style={styles.heroHandle}>@{user.username}</Text>}
          <Text style={styles.heroEmail}>{user?.email}</Text>
          {!!memberSince && (
            <Text style={styles.heroMeta}>Member since {memberSince}</Text>
          )}
        </View>

        {bmi != null && (
          <View style={styles.bmiCard}>
            <View>
              <Text style={styles.bmiLabel}>BODY MASS INDEX</Text>
              <Text style={[styles.bmiCategory, { color: bmiCategory(bmi).color }]}>
                {bmiCategory(bmi).label}
              </Text>
            </View>
            <Text style={styles.bmiValue}>{bmi.toFixed(1)}</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>ACCOUNT</Text>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>FULL NAME</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Your name"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="words"
            style={[styles.input, focus === 'name' && styles.inputFocus]}
            onFocus={() => setFocus('name')}
            onBlur={() => setFocus(null)}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>USERNAME</Text>
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Pick a username"
            placeholderTextColor={COLORS.muted}
            autoCapitalize="none"
            autoCorrect={false}
            style={[styles.input, focus === 'username' && styles.inputFocus]}
            onFocus={() => setFocus('username')}
            onBlur={() => setFocus(null)}
          />
        </View>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>EMAIL</Text>
          <View style={[styles.input, styles.inputDisabled]}>
            <Text style={styles.inputDisabledText}>{user?.email}</Text>
          </View>
          <Text style={styles.helper}>Email is used to log in and can’t be changed here.</Text>
        </View>

        <Text style={styles.sectionLabel}>BODY METRICS</Text>

        <View style={styles.fieldWrap}>
          <Text style={styles.label}>GENDER</Text>
          <View style={styles.segment}>
            {GENDERS.map((g) => {
              const active = gender === g.value;
              return (
                <ScalePressable
                  key={g.value}
                  style={[styles.segmentItem, active && styles.segmentItemActive]}
                  onPress={() => setGender(g.value)}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                    {g.label}
                  </Text>
                </ScalePressable>
              );
            })}
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.fieldWrap, styles.rowItem]}>
            <Text style={styles.label}>HEIGHT (CM)</Text>
            <TextInput
              value={height}
              onChangeText={setHeight}
              placeholder="175"
              placeholderTextColor={COLORS.muted}
              keyboardType="numeric"
              style={[styles.input, focus === 'height' && styles.inputFocus]}
              onFocus={() => setFocus('height')}
              onBlur={() => setFocus(null)}
            />
          </View>
          <View style={[styles.fieldWrap, styles.rowItem]}>
            <Text style={styles.label}>WEIGHT (KG)</Text>
            <TextInput
              value={weight}
              onChangeText={setWeight}
              placeholder="72"
              placeholderTextColor={COLORS.muted}
              keyboardType="numeric"
              style={[styles.input, focus === 'weight' && styles.inputFocus]}
              onFocus={() => setFocus('weight')}
              onBlur={() => setFocus(null)}
            />
          </View>
        </View>

        <ScalePressable style={styles.primaryButton} onPress={onSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.primaryButtonText}>SAVE CHANGES</Text>
          )}
        </ScalePressable>

        <ScalePressable style={styles.logoutButton} onPress={confirmLogout}>
          <Text style={styles.logoutButtonText}>LOG OUT</Text>
        </ScalePressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg
  },
  content: {
    paddingTop: SPACING.xl + 4,
    paddingHorizontal: SPACING.md,
    paddingBottom: 120
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.lg
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border
  },
  backArrow: {
    color: COLORS.text,
    fontFamily: FONT.display,
    fontSize: 30,
    lineHeight: 32,
    marginTop: -2
  },
  title: {
    color: COLORS.accent,
    fontFamily: FONT.display,
    letterSpacing: 2,
    fontSize: 30
  },
  hero: {
    alignItems: 'center',
    marginBottom: SPACING.lg
  },
  heroName: {
    marginTop: SPACING.md,
    color: COLORS.text,
    fontFamily: FONT.bodyBold,
    fontSize: 22
  },
  heroHandle: {
    marginTop: 2,
    color: COLORS.accent,
    fontFamily: FONT.bodyMedium,
    fontSize: 14
  },
  heroEmail: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: FONT.body,
    fontSize: 14
  },
  heroMeta: {
    marginTop: SPACING.xs,
    color: COLORS.muted,
    fontFamily: FONT.body,
    fontSize: 12
  },
  bmiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg
  },
  bmiLabel: {
    color: COLORS.muted,
    fontFamily: FONT.bodyBold,
    letterSpacing: 1.5,
    fontSize: 11
  },
  bmiCategory: {
    marginTop: 4,
    fontFamily: FONT.bodyBold,
    fontSize: 16
  },
  bmiValue: {
    color: COLORS.accent,
    fontFamily: FONT.display,
    fontSize: 44,
    letterSpacing: 1
  },
  sectionLabel: {
    color: COLORS.muted,
    fontFamily: FONT.bodyBold,
    letterSpacing: 2,
    fontSize: 12,
    textTransform: 'uppercase',
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs
  },
  fieldWrap: {
    marginTop: SPACING.md
  },
  label: {
    color: COLORS.muted,
    fontFamily: FONT.bodyBold,
    letterSpacing: 1.5,
    fontSize: 11,
    textTransform: 'uppercase',
    marginBottom: SPACING.xs
  },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    color: COLORS.text,
    fontFamily: FONT.bodyMedium,
    fontSize: 16,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2
  },
  inputFocus: {
    borderColor: COLORS.accent
  },
  inputDisabled: {
    justifyContent: 'center'
  },
  inputDisabledText: {
    color: COLORS.muted,
    fontFamily: FONT.bodyMedium,
    fontSize: 16
  },
  helper: {
    marginTop: SPACING.xs,
    color: COLORS.muted,
    fontFamily: FONT.body,
    fontSize: 12
  },
  segment: {
    flexDirection: 'row',
    gap: SPACING.sm
  },
  segmentItem: {
    flex: 1,
    paddingVertical: SPACING.sm + 2,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    alignItems: 'center'
  },
  segmentItemActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent
  },
  segmentText: {
    color: COLORS.text,
    fontFamily: FONT.bodyMedium,
    fontSize: 15
  },
  segmentTextActive: {
    color: '#000',
    fontFamily: FONT.bodyBold
  },
  row: {
    flexDirection: 'row',
    gap: SPACING.md
  },
  rowItem: {
    flex: 1
  },
  primaryButton: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52
  },
  primaryButtonText: {
    color: '#000',
    fontFamily: FONT.display,
    fontSize: 24,
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  },
  logoutButton: {
    marginTop: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    borderWidth: 1,
    borderColor: COLORS.danger
  },
  logoutButtonText: {
    color: COLORS.danger,
    fontFamily: FONT.display,
    fontSize: 22,
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  }
});
