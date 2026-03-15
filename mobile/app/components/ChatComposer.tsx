import { useMemo, useState } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Text,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import type { GraphNode } from '../../lib/api';

const MAX_MENTION_RESULTS = 5;

type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  friends?: GraphNode[];
};

function getMentionQuery(value: string): string | null {
  const idx = value.lastIndexOf('@');
  if (idx === -1) return null;
  const after = value.slice(idx + 1);
  if (after.includes(' ')) return null;
  return after;
}

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  loading = false,
  placeholder = 'Ask for a restaurant recommendation...',
  disabled = false,
  friends = [],
}: ChatComposerProps) {
  const canSend = value.trim().length > 0 && !loading && !disabled;
  const mentionQuery = getMentionQuery(value);

  const mentionCandidates = useMemo(() => {
    if (friends.length === 0) return [];
    if (!mentionQuery) return friends.slice(0, MAX_MENTION_RESULTS);
    const q = mentionQuery.toLowerCase();
    return friends
      .filter(
        (f) =>
          (f.displayName || '')
            .toLowerCase()
            .includes(q)
      )
      .slice(0, MAX_MENTION_RESULTS);
  }, [mentionQuery, friends]);

  const showMentionDropdown = Boolean(
    mentionQuery !== null && !disabled && !loading && mentionCandidates.length > 0
  );

  const insertMention = (displayName: string) => {
    const idx = value.lastIndexOf('@');
    if (idx === -1) return;
    const before = value.slice(0, idx);
    const after = value.slice(idx).replace(/@[\w\s]*$/, `@${displayName} `);
    onChangeText(before + after);
  };

  return (
    <View style={styles.wrap}>
        {showMentionDropdown && (
          <View style={styles.mentionDropdown}>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              style={styles.mentionScroll}
              nestedScrollEnabled
            >
              {mentionCandidates.map((friend) => (
                <Pressable
                  key={friend.id}
                  style={({ pressed }) => [
                    styles.mentionRow,
                    pressed && styles.mentionRowPressed,
                  ]}
                  onPress={() => insertMention(friend.displayName || 'Friend')}
                >
                  {friend.avatarUrl ? (
                    <Image
                      source={{ uri: friend.avatarUrl }}
                      style={styles.mentionAvatar}
                    />
                  ) : (
                    <View style={[styles.mentionAvatar, styles.mentionAvatarPlaceholder]}>
                      <Text style={styles.mentionAvatarText}>
                        {(friend.displayName || '?')[0]}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.mentionName} numberOfLines={1}>
                    {friend.displayName || 'Friend'}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        )}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor="#9a9a9a"
            editable={!loading && !disabled}
            multiline
            maxLength={500}
            returnKeyType="send"
            onSubmitEditing={canSend ? onSend : undefined}
            blurOnSubmit={false}
          />
          <Pressable
            style={[
              styles.sendBtn,
              canSend ? styles.sendBtnActive : styles.sendBtnDisabled,
            ]}
            onPress={canSend ? onSend : undefined}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Send message"
          >
            {loading ? (
              <Text style={styles.sendText}>...</Text>
            ) : (
              <Text style={[styles.sendText, canSend ? styles.sendTextActive : styles.sendTextDisabled]}>
                Send
              </Text>
            )}
          </Pressable>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  mentionDropdown: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 76,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    maxHeight: 200,
    zIndex: 10,
  },
  mentionScroll: {
    maxHeight: 200,
  },
  mentionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  mentionRowPressed: {
    backgroundColor: '#f2e6df',
  },
  mentionAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#e0e0e0',
  },
  mentionAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  mentionAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  mentionName: {
    fontSize: 15,
    color: '#222',
    fontWeight: '500',
    flex: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  input: {
    flex: 1,
    minHeight: 52,
    maxHeight: 140,
    backgroundColor: '#f5f5f5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 12,
    fontSize: 15,
    color: '#222',
  },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 52,
  },
  sendBtnActive: {
    backgroundColor: '#e85d26',
  },
  sendBtnDisabled: {
    backgroundColor: '#e0e0e0',
  },
  sendText: {
    fontSize: 15,
    fontWeight: '600',
  },
  sendTextActive: {
    color: '#fff',
  },
  sendTextDisabled: {
    color: '#9a9a9a',
  },
});
