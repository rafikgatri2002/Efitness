import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONT, RADIUS, SPACING } from '../components/theme';
import { ScalePressable } from '../components/ScalePressable';
import { CoachStackParamList } from '../navigation/types';
import {
  ConversationMessage,
  getApiErrorMessage,
  getConversation,
  getConversations,
  sendChat
} from '../services/api';

type Props = NativeStackScreenProps<CoachStackParamList, 'Chat'>;

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

// How many recent messages to load when resuming a conversation.
const PAGE = 50;

function nowStamp() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function toUiMessage(m: ConversationMessage): Message {
  return { id: m.id, role: m.role, content: m.content, timestamp: formatTime(m.created_at) };
}

function SendIcon() {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path d="M21 3L3 11L10.2 13.8L13 21L21 3Z" stroke="#000" strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M10 14L21 3" stroke="#000" strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

function TypingDots() {
  const a = useRef(new Animated.Value(0.4)).current;
  const b = useRef(new Animated.Value(0.4)).current;
  const c = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const pulse = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true
          }),
          Animated.timing(value, {
            toValue: 0.4,
            duration: 350,
            useNativeDriver: true
          })
        ])
      ).start();

    pulse(a, 0);
    pulse(b, 120);
    pulse(c, 240);
  }, [a, b, c]);

  return (
    <View style={styles.typingDots}>
      <Animated.View style={[styles.dot, { opacity: a }]} />
      <Animated.View style={[styles.dot, { opacity: b }]} />
      <Animated.View style={[styles.dot, { opacity: c }]} />
    </View>
  );
}

export function ChatScreen({ navigation, route }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [publishedLabels, setPublishedLabels] = useState<string[]>([]);
  const [activeLabels, setActiveLabels] = useState<string[]>([]);

  const scrollRef = useRef<ScrollView>(null);
  const pulse = useRef(new Animated.Value(0.5)).current;
  // Tracks what is currently loaded so we don't reload/wipe an active thread.
  // null = nothing loaded yet, 'new' = a fresh unsaved chat, otherwise an id.
  const loadedIdRef = useRef<string | 'new' | null>(null);

  const openConversation = useCallback(async (id: string) => {
    if (loadedIdRef.current === id) {
      return;
    }
    loadedIdRef.current = id;
    setLoadingHistory(true);
    try {
      // Load the most recent PAGE messages (the first call also tells us the total).
      let detail = await getConversation(id, { limit: PAGE });
      if (detail.message_count > PAGE) {
        detail = await getConversation(id, { limit: PAGE, skip: detail.message_count - PAGE });
      }
      setConversationId(id);
      setMessages(detail.messages.map(toUiMessage));
    } catch (error) {
      loadedIdRef.current = null; // allow a retry
      Alert.alert('Could not load conversation', getApiErrorMessage(error));
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const startNewChat = useCallback(() => {
    loadedIdRef.current = 'new';
    setConversationId(null);
    setMessages([]);
    setText('');
    navigation.setParams({ conversationId: undefined });
  }, [navigation]);

  const resumeLast = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const recent = await getConversations({ source: 'chat', limit: 1 });
      const last = recent[0];
      if (last && last.message_count > 0) {
        await openConversation(last.id);
      } else {
        loadedIdRef.current = 'new';
      }
    } catch {
      loadedIdRef.current = 'new';
    } finally {
      setLoadingHistory(false);
    }
  }, [openConversation]);

  // Open the requested conversation (from History), or resume the latest on first mount.
  useEffect(() => {
    const target = route.params?.conversationId;
    if (target) {
      openConversation(target);
    } else if (loadedIdRef.current === null) {
      resumeLast();
    }
  }, [route.params?.conversationId, openConversation, resumeLast]);

  // Keep the published-reference labels fresh (a user may publish from History).
  const refreshLabels = useCallback(async () => {
    try {
      const pubs = await getConversations({ is_published: true, limit: 50 });
      const labels = Array.from(
        new Set(
          pubs
            .map((c) => c.label)
            .filter((l): l is string => !!l && l.trim().length > 0)
        )
      );
      setPublishedLabels(labels);
      setActiveLabels((prev) => prev.filter((l) => labels.includes(l)));
    } catch {
      // non-fatal — references are optional
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshLabels();
    }, [refreshLabels])
  );

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, [pulse]);

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
  }, [messages, sending]);

  const toggleLabel = (label: string) => {
    setActiveLabels((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const onSend = async () => {
    const value = text.trim();
    if (!value || sending) {
      return;
    }

    const userMessage: Message = {
      id: `${Date.now()}-u`,
      role: 'user',
      content: value,
      timestamp: nowStamp()
    };

    setMessages((prev) => [...prev, userMessage]);
    setText('');
    setSending(true);

    try {
      const response = await sendChat({
        message: value,
        conversation_id: conversationId ?? undefined,
        reference_labels: activeLabels.length ? activeLabels : undefined
      });

      // First turn of a new chat: adopt the conversation the server just created.
      if (!conversationId) {
        setConversationId(response.conversation_id);
        loadedIdRef.current = response.conversation_id;
        navigation.setParams({ conversationId: response.conversation_id });
      }

      const botMessage: Message = {
        id: `${Date.now()}-a`,
        role: 'assistant',
        content: response.reply,
        timestamp: nowStamp()
      };

      setMessages((prev) => [...prev, botMessage]);
    } catch (error) {
      const errMsg = getApiErrorMessage(error, 'Coach unavailable right now.');
      setMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: 'assistant',
          content: errMsg,
          timestamp: nowStamp()
        }
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 12 : 0}
    >
      <View style={styles.topBar}>
        <View style={styles.topBarMain}>
          <Text style={styles.title}>AI COACH</Text>
          <View style={styles.subtitleRow}>
            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
            <Text style={styles.subtitle}>{sending ? 'Thinking…' : 'Remembers your chats'}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <ScalePressable style={styles.actionBtn} onPress={() => navigation.navigate('Conversations')}>
            <Text style={styles.actionText}>HISTORY</Text>
          </ScalePressable>
          <ScalePressable style={[styles.actionBtn, styles.actionBtnAccent]} onPress={startNewChat}>
            <Text style={[styles.actionText, styles.actionTextAccent]}>+ NEW</Text>
          </ScalePressable>
        </View>
      </View>

      {publishedLabels.length > 0 ? (
        <View style={styles.refRow}>
          <Text style={styles.refCaption}>REFERENCES</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.refChips}
          >
            {publishedLabels.map((label) => {
              const active = activeLabels.includes(label);
              return (
                <ScalePressable
                  key={label}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleLabel(label)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
                </ScalePressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {loadingHistory && messages.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <ScrollView
          ref={scrollRef}
          style={styles.chatWrap}
          contentContainerStyle={styles.chatContent}
          keyboardShouldPersistTaps="handled"
        >
          {messages.length === 0 ? (
            <View style={[styles.bubbleWrap, styles.botWrap]}>
              <Text style={styles.botLabel}>IRONLOG AI</Text>
              <View style={[styles.bubble, styles.botBubble]}>
                <Text style={styles.bubbleText}>
                  Welcome to IRONLOG AI. I remember our past chats and your sessions — ask about
                  progression, volume, or recovery. You can also import a Gemini conversation from
                  History.
                </Text>
              </View>
            </View>
          ) : null}

          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <View key={message.id} style={[styles.bubbleWrap, isUser ? styles.userWrap : styles.botWrap]}>
                {!isUser ? <Text style={styles.botLabel}>IRONLOG AI</Text> : null}
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.botBubble]}>
                  <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>{message.content}</Text>
                </View>
                <Text style={styles.timestamp}>{message.timestamp}</Text>
              </View>
            );
          })}

          {sending ? (
            <View style={[styles.bubbleWrap, styles.botWrap]}>
              <Text style={styles.botLabel}>IRONLOG AI</Text>
              <View style={[styles.bubble, styles.botBubble]}>
                <TypingDots />
              </View>
            </View>
          ) : null}
        </ScrollView>
      )}

      <View style={styles.inputBar}>
        <TextInput
          value={text}
          onChangeText={setText}
          multiline
          style={styles.input}
          placeholder="Ask about progression, volume, recovery..."
          placeholderTextColor={COLORS.muted}
          onSubmitEditing={(event) => {
            if (Platform.OS === 'web' && (event.nativeEvent as { shiftKey?: boolean }).shiftKey) {
              return;
            }
            onSend();
          }}
        />

        <ScalePressable style={styles.sendButton} onPress={onSend}>
          {sending ? <ActivityIndicator color="#000" /> : <SendIcon />}
        </ScalePressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    paddingTop: 56
  },
  topBar: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  topBarMain: {
    flex: 1
  },
  title: {
    color: COLORS.accent,
    fontFamily: FONT.display,
    letterSpacing: 2,
    fontSize: 36,
    lineHeight: 34
  },
  subtitleRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.success
  },
  subtitle: {
    color: COLORS.muted,
    fontFamily: FONT.body,
    fontSize: 12
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm
  },
  actionBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 7
  },
  actionBtnAccent: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent
  },
  actionText: {
    color: COLORS.text,
    fontFamily: FONT.display,
    fontSize: 14,
    letterSpacing: 1
  },
  actionTextAccent: {
    color: '#000'
  },
  refRow: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm
  },
  refCaption: {
    color: COLORS.muted,
    fontFamily: FONT.bodyBold,
    fontSize: 10,
    letterSpacing: 1.2
  },
  refChips: {
    gap: SPACING.sm,
    paddingRight: SPACING.md,
    alignItems: 'center'
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    backgroundColor: COLORS.surface2,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6
  },
  chipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent
  },
  chipText: {
    color: COLORS.muted,
    fontFamily: FONT.bodyMedium,
    fontSize: 13
  },
  chipTextActive: {
    color: '#000'
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  chatWrap: {
    flex: 1
  },
  chatContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md
  },
  bubbleWrap: {
    marginVertical: SPACING.sm,
    maxWidth: '82%'
  },
  botWrap: {
    alignSelf: 'flex-start'
  },
  userWrap: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end'
  },
  botLabel: {
    color: COLORS.accent,
    fontFamily: FONT.display,
    letterSpacing: 1,
    fontSize: 12,
    marginBottom: 4
  },
  bubble: {
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2
  },
  botBubble: {
    backgroundColor: COLORS.surface2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderBottomLeftRadius: 6
  },
  userBubble: {
    backgroundColor: COLORS.accent,
    borderBottomRightRadius: 6
  },
  bubbleText: {
    color: COLORS.text,
    fontFamily: FONT.body,
    fontSize: 15
  },
  userBubbleText: {
    color: '#000',
    fontFamily: FONT.bodyMedium
  },
  timestamp: {
    marginTop: 4,
    color: COLORS.muted,
    fontFamily: FONT.body,
    fontSize: 10
  },
  inputBar: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderTopWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: SPACING.sm
  },
  input: {
    flex: 1,
    maxHeight: 120,
    minHeight: 46,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface2,
    color: COLORS.text,
    fontFamily: FONT.body,
    fontSize: 14,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12
  },
  sendButton: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.muted
  }
});
