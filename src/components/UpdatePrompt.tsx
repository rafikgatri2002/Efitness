import React, { useEffect, useState } from 'react';
import { Linking, Modal, Platform, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import { ScalePressable } from './ScalePressable';
import { COLORS, FONT, RADIUS, SPACING } from './theme';
import {
  fetchLatestRelease,
  getDismissedVersion,
  isNewerVersion,
  setDismissedVersion,
  UpdateInfo
} from '../services/updateCheck';

/**
 * Checks GitHub Releases once per app launch and offers the new version when
 * one exists. Mounted once at the app root; renders nothing until an update
 * is found, and stays silent on any error.
 */
export function UpdatePrompt() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Updates ship as a sideloaded Android APK; SecureStore is also
      // unavailable on web.
      if (Platform.OS === 'web') {
        return;
      }
      const installed = Constants.expoConfig?.version;
      if (!installed) {
        return;
      }
      const latest = await fetchLatestRelease();
      if (!latest || !isNewerVersion(latest.version, installed)) {
        return;
      }
      if ((await getDismissedVersion()) === latest.version) {
        return;
      }
      if (!cancelled) {
        setUpdate(latest);
      }
    };

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!update) {
    return null;
  }

  const onLater = () => {
    setDismissedVersion(update.version);
    setUpdate(null);
  };

  const onDownload = () => {
    Linking.openURL(update.releaseUrl).catch(() => {});
    setUpdate(null);
  };

  return (
    <Modal transparent visible statusBarTranslucent animationType="fade" onRequestClose={onLater}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.kicker}>UPDATE AVAILABLE</Text>
          <Text style={styles.title}>IronLog v{update.version}</Text>
          <Text style={styles.body}>
            A newer version is ready. Download it from the release page, then open the
            file to install.
          </Text>
          <ScalePressable style={styles.primaryButton} onPress={onDownload}>
            <Text style={styles.primaryButtonText}>DOWNLOAD UPDATE</Text>
          </ScalePressable>
          <ScalePressable style={styles.secondaryButton} onPress={onLater}>
            <Text style={styles.secondaryButtonText}>Later</Text>
          </ScalePressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg
  },
  kicker: {
    color: COLORS.accent,
    fontFamily: FONT.bodyBold,
    fontSize: 11,
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  },
  title: {
    marginTop: SPACING.sm,
    color: COLORS.text,
    fontFamily: FONT.display,
    fontSize: 40,
    letterSpacing: 1
  },
  body: {
    marginTop: SPACING.sm,
    color: COLORS.muted,
    fontFamily: FONT.body,
    fontSize: 14,
    lineHeight: 20
  },
  primaryButton: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.accent,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52
  },
  primaryButtonText: {
    color: '#000',
    fontFamily: FONT.display,
    fontSize: 22,
    letterSpacing: 1.5,
    textTransform: 'uppercase'
  },
  secondaryButton: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44
  },
  secondaryButtonText: {
    color: COLORS.muted,
    fontFamily: FONT.bodyMedium,
    fontSize: 14
  }
});
