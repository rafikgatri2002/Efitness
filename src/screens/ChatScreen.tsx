import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { COLORS, FONT, RADIUS, SPACING } from '../components/theme';
import { ScalePressable } from '../components/ScalePressable';
import { getApiErrorMessage, sendChat } from '../services/api';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

function nowStamp() {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit'
  });
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

export function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Welcome to IRONLOG AI. I can review your sessions, suggest progressive overload, and help tune your weekly split.',
        timestamp: nowStamp()
      }
    ]);

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

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setText('');
    setSending(true);

    try {
      const response = await sendChat({
        message: value,
        history: nextMessages.map((m) => ({ role: m.role, content: m.content }))
      });

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
        <View>
          <Text style={styles.title}>AI COACH</Text>
          <View style={styles.subtitleRow}>
            <Animated.View style={[styles.liveDot, { opacity: pulse }]} />
            <Text style={styles.subtitle}>Analysing your sessions</Text>
          </View>
        </View>

        <View style={styles.botAvatar}>
          <Text style={styles.botAvatarText}>🤖</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.chatWrap}
        contentContainerStyle={styles.chatContent}
        keyboardShouldPersistTaps="handled"
      >
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
  botAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accent2,
    borderWidth: 2,
    borderColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center'
  },
  botAvatarText: {
    fontSize: 22
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
