import { View, TextInput, Pressable, Text, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';

type ChatComposerProps = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
};

export function ChatComposer({
  value,
  onChangeText,
  onSend,
  loading = false,
  placeholder = 'Ask for a restaurant recommendation...',
  disabled = false,
}: ChatComposerProps) {
  const canSend = value.trim().length > 0 && !loading && !disabled;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <View style={styles.wrap}>
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 4,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 100,
    backgroundColor: '#f5f5f5',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    paddingTop: 10,
    fontSize: 15,
    color: '#222',
  },
  sendBtn: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 22,
    justifyContent: 'center',
    minHeight: 44,
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
