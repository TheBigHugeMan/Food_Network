import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import type { ChatMessage as ApiChatMessage } from '../../lib/api';
import type { RestaurantRecommendation } from '../../lib/api';
import { RestaurantRecommendationCard } from './RestaurantRecommendationCard';

export type ChatMessage = ApiChatMessage & { restaurants?: RestaurantRecommendation[] };

type ChatMessageListProps = {
  messages: ChatMessage[];
  emptyMessage?: string;
  suggestionChips?: string[];
  onSuggestionPress?: (text: string) => void;
};

export function ChatMessageList({
  messages,
  emptyMessage = 'Ask for a restaurant recommendation below.',
  suggestionChips = ['Best sushi near me', 'Date night spot', 'Quick lunch downtown'],
  onSuggestionPress,
}: ChatMessageListProps) {
  if (messages.length === 0) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>{emptyMessage}</Text>
        <View style={styles.chipWrap}>
          {suggestionChips.map((label) => (
            <Pressable
              key={label}
              style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
              onPress={() => onSuggestionPress?.(label)}
            >
              <Text style={styles.chipText}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.list}
      contentContainerStyle={styles.listContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {messages.map((msg, index) => (
        <View
          key={index}
          style={[
            styles.bubbleWrap,
            msg.role === 'user' ? styles.userWrap : styles.assistantWrap,
          ]}
        >
          <View
            style={[
              styles.bubble,
              msg.role === 'user' ? styles.userBubble : styles.assistantBubble,
            ]}
          >
            <Text
              style={[
                styles.bubbleText,
                msg.role === 'user' ? styles.userText : styles.assistantText,
              ]}
              selectable
            >
              {msg.content}
            </Text>
            {msg.role === 'assistant' && msg.restaurants && msg.restaurants.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.cardsScroll}
                contentContainerStyle={styles.cardsScrollContent}
              >
                {msg.restaurants.map((rec, i) => (
                  <RestaurantRecommendationCard key={i} recommendation={rec} />
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  emptyWrap: {
    paddingVertical: 24,
    paddingHorizontal: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6d6d6d',
    textAlign: 'center',
    marginBottom: 16,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  chip: {
    backgroundColor: '#f2e6df',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  chipPressed: {
    opacity: 0.85,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e85d26',
  },
  list: {
    flex: 1,
    minHeight: 240,
  },
  listContent: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    paddingBottom: 24,
  },
  bubbleWrap: {
    marginBottom: 10,
    alignItems: 'stretch',
  },
  userWrap: {
    alignItems: 'flex-end',
  },
  assistantWrap: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '92%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: '#e85d26',
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    backgroundColor: '#f5f5f5',
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 23,
  },
  userText: {
    color: '#fff',
  },
  assistantText: {
    color: '#222',
  },
  cardsScroll: {
    marginTop: 12,
    marginHorizontal: -16,
  },
  cardsScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
});
