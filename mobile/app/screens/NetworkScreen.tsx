import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { DEMO_GRAPH } from '../data/demoGraph';
import { SocialGraph } from '../components/SocialGraph';
import { NetworkChatSection } from '../components/NetworkChatSection';
import { type GraphResponse, getNetworkGraph } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

type DataSource = 'demo' | 'real';

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

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
            <SocialGraph nodes={graph.nodes} edges={graph.edges} centerNodeId={centerNodeId} />
            <NetworkChatSection
              accessToken={session?.access_token ?? undefined}
              latitude={null}
              longitude={null}
            />
          </>
        )}
      </ScrollView>
    </View>
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
