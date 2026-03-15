import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { DEMO_GRAPH } from '../data/demoGraph';
import { SocialGraph } from '../components/SocialGraph';
import { NetworkChatSection } from '../components/NetworkChatSection';
import { ChatComposer } from '../components/ChatComposer';
import {
  type GraphResponse,
  getNetworkGraph,
  sendRestaurantChatMessage,
  type RestaurantRecommendation,
} from '../../lib/api';
import { useAuth } from '../../lib/auth-context';
import type { ChatMessage as ChatMessageWithRestaurants } from '../components/ChatMessageList';

type DataSource = 'demo' | 'real';

const SUGGESTION_CHIPS = [
  'Best sushi near me',
  'Date night spot',
  'Quick lunch downtown',
  'Cozy café for brunch',
];

function getCenterNodeId(graph: GraphResponse, fallbackUserId: string) {
  const explicitSelf = graph.nodes.find((node) => node.isSelf);
  if (explicitSelf) return explicitSelf.id;
  const byUser = graph.nodes.find((node) => node.id === fallbackUserId);
  if (byUser) return byUser.id;
  return graph.nodes[0]?.id ?? fallbackUserId;
}

export function NetworkScreen() {
  const { session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<DataSource>('demo');
  const [graph, setGraph] = useState<GraphResponse>(DEMO_GRAPH);
  const [isScrolling, setIsScrolling] = useState(false);
  const [messages, setMessages] = useState<ChatMessageWithRestaurants[]>([]);
  const [input, setInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [locationState, setLocationState] = useState<
    | { status: 'pending' }
    | { status: 'granted'; latitude: number; longitude: number; suburb?: string }
    | { status: 'denied' }
  >({ status: 'pending' });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        if (!cancelled) setLocationState({ status: 'denied' });
        return;
      }
      try {
        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        let detectedSuburb: string | undefined;
        try {
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          detectedSuburb = geo?.district ?? geo?.subregion ?? geo?.city ?? undefined;
        } catch {
          // non-fatal
        }
        if (!cancelled)
          setLocationState({
            status: 'granted',
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            suburb: detectedSuburb,
          });
      } catch {
        if (!cancelled) setLocationState({ status: 'denied' });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const onScrollBeginDrag = useCallback(() => setIsScrolling(true), []);
  const onScrollEndDrag = useCallback(() => setIsScrolling(false), []);
  const onMomentumScrollEnd = useCallback(() => setIsScrolling(false), []);

  useEffect(() => {
    let isMounted = true;

    async function load() {
      if (!session?.access_token || !session.user?.id) {
        if (!isMounted) return;
        setGraph(DEMO_GRAPH);
        setSource('demo');
        setLoading(false);
        return;
      }

      try {
        const liveGraph = await getNetworkGraph(session.access_token);
        const isUsableLiveGraph = liveGraph.nodes.length > 1 && liveGraph.edges.length > 0;
        if (!isMounted) return;
        if (isUsableLiveGraph) {
          setGraph(liveGraph);
          setSource('real');
        } else {
          setGraph(DEMO_GRAPH);
          setSource('demo');
        }
      } catch {
        if (!isMounted) return;
        setGraph(DEMO_GRAPH);
        setSource('demo');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [session?.access_token, session?.user?.id]);

  const centerNodeId = useMemo(
    () => getCenterNodeId(graph, session?.user?.id ?? 'you'),
    [graph, session?.user?.id]
  );

  const appendAssistant = useCallback(
    (reply: string, restaurants: RestaurantRecommendation[]) => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: reply, restaurants },
      ]);
    },
    []
  );

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    if (!session?.access_token) {
      Alert.alert('Sign in required', 'Sign in to get restaurant recommendations.');
      return;
    }

    setInput('');
    const userMsg: ChatMessageWithRestaurants = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await sendRestaurantChatMessage(session.access_token, {
        message: text,
        history,
        latitude: locationState.status === 'granted' ? (locationState as any).latitude : undefined,
        longitude: locationState.status === 'granted' ? (locationState as any).longitude : undefined,
        suburb: locationState.status === 'granted' ? (locationState as any).suburb : undefined,
      });
      appendAssistant(res.reply, res.restaurants ?? []);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Request failed. Try again.';
      appendAssistant(`Sorry, I couldn't get recommendations right now. ${message}`, []);
    } finally {
      setChatLoading(false);
    }
  }, [input, chatLoading, session?.access_token, messages, appendAssistant]);

  const handleSuggestionPress = useCallback((suggestion: string) => {
    setInput(suggestion);
  }, []);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollEnd={onMomentumScrollEnd}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Taste Network</Text>
          <Text style={styles.subtitle}>
            {source === 'real'
              ? 'Tap a friend to see taste similarity; tap again to dismiss.'
              : 'Demo graph: add more friend data to see your live taste network.'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#e85d26" />
          </View>
        ) : (
          <>
            <SocialGraph
              nodes={graph.nodes}
              edges={graph.edges}
              centerNodeId={centerNodeId}
              isScrolling={isScrolling}
            />
            <NetworkChatSection
              messages={messages}
              onSuggestionPress={handleSuggestionPress}
              suggestionChips={SUGGESTION_CHIPS}
            />
          </>
        )}
      </ScrollView>

      <ChatComposer
        value={input}
        onChangeText={setInput}
        onSend={handleSend}
        loading={chatLoading}
        disabled={!session?.access_token}
        friends={graph.nodes.filter((n) => !n.isSelf)}
        placeholder={
          session?.access_token
            ? 'Ask for a restaurant recommendation...'
            : 'Sign in to get recommendations'
        }
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 14,
    paddingBottom: 24,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  subtitle: {
    color: '#6d6d6d',
    lineHeight: 20,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
