import { View, Text, StyleSheet } from 'react-native';
import type { ChatMessage as ChatMessageWithRestaurants } from './ChatMessageList';
import { ChatMessageList } from './ChatMessageList';

type NetworkChatSectionProps = {
  messages: ChatMessageWithRestaurants[];
  onSuggestionPress?: (text: string) => void;
  suggestionChips?: string[];
};

export function NetworkChatSection({
  messages,
  onSuggestionPress,
  suggestionChips = [
    'Best sushi near me',
    'Date night spot',
    'Quick lunch downtown',
    'Cozy café for brunch',
  ],
}: NetworkChatSectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Restaurant recommendations</Text>
      <Text style={styles.sectionSubtitle}>Ask for suggestions; answers are powered by Gemini.</Text>
      <View style={styles.chatBox}>
        <ChatMessageList
          messages={messages}
          emptyMessage="Ask for a restaurant recommendation below or tap a suggestion."
          suggestionChips={suggestionChips}
          onSuggestionPress={onSuggestionPress}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
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
    marginBottom: 10,
  },
  chatBox: {
    backgroundColor: '#fafafa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
    minHeight: 320,
    paddingVertical: 14,
  },
});
