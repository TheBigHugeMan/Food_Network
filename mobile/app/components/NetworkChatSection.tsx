import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import {
  sendRestaurantChatMessage,
  type ChatMessage,
  type RestaurantRecommendation,
} from '../../lib/api';
import type { ChatMessage as ChatMessageWithRestaurants } from './ChatMessageList';
import { ChatMessageList } from './ChatMessageList';
import { ChatComposer } from './ChatComposer';

const SUGGESTION_CHIPS = [
  'Best sushi near me',
  'Date night spot',
  'Quick lunch downtown',
  'Cozy café for brunch',
];

type NetworkChatSectionProps = {
  accessToken: string | undefined;
  latitude?: number | null;
  longitude?: number | null;
};

export function NetworkChatSection({
  accessToken,
  latitude,
  longitude,
}: NetworkChatSectionProps) {
  const [messages, setMessages] = useState<ChatMessageWithRestaurants[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const appendAssistant = useCallback((reply: string, restaurants: RestaurantRecommendation[]) => {
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: reply, restaurants },
    ]);
  }, []);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!accessToken) {
      Alert.alert('Sign in required', 'Sign in to get restaurant recommendations.');
      return;
    }

    setInput('');
    const userMsg: ChatMessageWithRestaurants = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const history: ChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await sendRestaurantChatMessage(accessToken, {
        message: text,
        history,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
      });
      appendAssistant(res.reply, res.restaurants ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Request failed. Try again.';
      appendAssistant(`Sorry, I couldn't get recommendations right now. ${message}`, []);
    } finally {
      setLoading(false);
    }
  }, [input, loading, accessToken, messages, latitude, longitude, appendAssistant]);

  const handleSuggestionPress = useCallback(
    (suggestion: string) => {
      setInput(suggestion);
    },
    []
  );

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Restaurant recommendations</Text>
      <Text style={styles.sectionSubtitle}>Ask for suggestions; answers are powered by Gemini.</Text>
      <View style={styles.chatBox}>
        <ChatMessageList
          messages={messages}
          emptyMessage="Ask for a restaurant recommendation below or tap a suggestion."
          suggestionChips={SUGGESTION_CHIPS}
          onSuggestionPress={handleSuggestionPress}
        />
        <ChatComposer
          value={input}
          onChangeText={setInput}
          onSend={handleSend}
          loading={loading}
          disabled={!accessToken}
          placeholder={accessToken ? 'Ask for a restaurant recommendation...' : 'Sign in to get recommendations'}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6d6d6d',
    marginBottom: 12,
  },
  chatBox: {
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
    minHeight: 120,
  },
});
