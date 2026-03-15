import { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Image as SvgImage,
  LinearGradient,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import type { GraphEdge, GraphNode } from '../../lib/api';

type PositionedNode = GraphNode & { x: number; y: number };
type Selection =
  | { type: 'edge'; edge: GraphEdge; fromName: string; toName: string }
  | { type: 'node'; nodeId: string; friendName: string; edge: GraphEdge }
  | null;

type SocialGraphProps = {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerNodeId: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getDisplayName(node: GraphNode | undefined) {
  if (!node?.displayName) return 'User';
  const text = node.displayName.trim();
  return text || 'User';
}

function getFallbackAvatar(nodeId: string) {
  return `https://i.pravatar.cc/200?u=${encodeURIComponent(nodeId)}`;
}

function buildCurvedPath(
  from: PositionedNode,
  to: PositionedNode,
  score: number,
  index: number
) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const distance = Math.sqrt(dx * dx + dy * dy) || 1;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;

  const nx = -dy / distance;
  const ny = dx / distance;
  const direction = index % 2 === 0 ? 1 : -1;
  const curvature = 14 + (1 - clamp(score, 0, 1)) * 24;
  const cx = mx + nx * curvature * direction;
  const cy = my + ny * curvature * direction;

  return `M ${from.x} ${from.y} Q ${cx} ${cy} ${to.x} ${to.y}`;
}

const TWO_PI = 2 * Math.PI;
const PHASE_INCREMENT = 0.004;

export function SocialGraph({ nodes, edges, centerNodeId }: SocialGraphProps) {
  const { width } = useWindowDimensions();
  const [selection, setSelection] = useState<Selection>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    let rafId: number;
    const tick = () => {
      if (selection === null) {
        setPhase((p) => (p + PHASE_INCREMENT) % TWO_PI);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [selection]);

  const canvasWidth = Math.max(320, width - 24);
  const canvasHeight = 560;
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2 - 12;
  const nodeRadius = 34;

  const { positionedNodes, centerEdgesByTarget } = useMemo(() => {
    const centerNode = nodes.find((node) => node.id === centerNodeId) ?? nodes[0];
    const others = nodes.filter((node) => node.id !== centerNode.id);
    const centerEdgesByTarget = new Map<string, GraphEdge>();
    for (const edge of edges) {
      if (edge.fromId === centerNode.id) {
        centerEdgesByTarget.set(edge.toId, edge);
      } else if (edge.toId === centerNode.id) {
        centerEdgesByTarget.set(edge.fromId, edge);
      }
    }

    const sortedOthers = [...others].sort((a, b) => {
      const aScore = centerEdgesByTarget.get(a.id)?.score ?? 0;
      const bScore = centerEdgesByTarget.get(b.id)?.score ?? 0;
      return bScore - aScore;
    });

    const minDistance = 138;
    const maxDistance = Math.min(centerX - 44, centerY - 62, 268);
    const points: PositionedNode[] = [{ ...centerNode, x: centerX, y: centerY }];

    sortedOthers.forEach((node, index) => {
      const baseAngle = (Math.PI * 2 * index) / Math.max(1, sortedOthers.length);
      const currentAngle = baseAngle + phase;
      const score = clamp(centerEdgesByTarget.get(node.id)?.score ?? 0.35, 0, 1);
      const distance = minDistance + (1 - score) * (maxDistance - minDistance);
      points.push({
        ...node,
        x: centerX + Math.cos(currentAngle) * distance,
        y: centerY + Math.sin(currentAngle) * distance,
      });
    });

    return { positionedNodes: points, centerEdgesByTarget };
  }, [centerNodeId, nodes, edges, centerX, centerY, phase]);

  const nodeMap = useMemo(
    () => new Map(positionedNodes.map((node) => [node.id, node])),
    [positionedNodes]
  );

  const handleNodePress = (node: PositionedNode) => {
    if (node.id === centerNodeId) return;
    const edge = centerEdgesByTarget.get(node.id);
    if (!edge) return;
    if (selection?.type === 'node' && selection.nodeId === node.id) {
      setSelection(null);
    } else {
      setSelection({
        type: 'node',
        nodeId: node.id,
        friendName: getDisplayName(node),
        edge,
      });
    }
  };

  return (
    <View style={styles.container}>
      <Svg width={canvasWidth} height={canvasHeight}>
        <Defs>
          <LinearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="#fff4ec" />
            <Stop offset="100%" stopColor="#ffe0ce" />
          </LinearGradient>
          {positionedNodes.map((node) => (
            <ClipPath key={`clip-${node.id}`} id={`clip-${node.id}`}>
              <Circle cx={node.x} cy={node.y} r={nodeRadius - 2} />
            </ClipPath>
          ))}
        </Defs>

        {edges.map((edge, index) => {
          const from = nodeMap.get(edge.fromId);
          const to = nodeMap.get(edge.toId);
          if (!from || !to) return null;
          const edgeOpacity = 0.35 + clamp(edge.score, 0, 1) * 0.5;
          const edgePath = buildCurvedPath(from, to, edge.score, index);
          const fromName = getDisplayName(nodeMap.get(edge.fromId));
          const toName = getDisplayName(nodeMap.get(edge.toId));
          return (
            <G key={`edge-wrap-${index}`}>
              <Path
                d={edgePath}
                stroke="#e85d26"
                strokeOpacity={edgeOpacity}
                strokeWidth={2 + edge.score * 2.6}
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d={edgePath}
                stroke="transparent"
                strokeWidth={22}
                fill="none"
                onPress={() => setSelection({ type: 'edge', edge, fromName, toName })}
              />
            </G>
          );
        })}

        {positionedNodes.map((node) => {
          const avatarUri = node.avatarUrl || getFallbackAvatar(node.id);
          const borderColor = node.id === centerNodeId ? '#e85d26' : '#a4a4a4';
          return (
            <G key={node.id}>
              <Circle cx={node.x} cy={node.y} r={nodeRadius} fill="url(#nodeGradient)" stroke={borderColor} strokeWidth={3.2} />
              <SvgImage
                x={node.x - (nodeRadius - 2)}
                y={node.y - (nodeRadius - 2)}
                width={(nodeRadius - 2) * 2}
                height={(nodeRadius - 2) * 2}
                href={{ uri: avatarUri }}
                preserveAspectRatio="xMidYMid slice"
                clipPath={`url(#clip-${node.id})`}
              />
              <SvgText
                x={node.x}
                y={node.y + nodeRadius + 20}
                textAnchor="middle"
                fontSize={13}
                fontWeight="600"
                fill="#2f2f2f"
              >
                {getDisplayName(node)}
              </SvgText>
              <Circle
                cx={node.x}
                cy={node.y}
                r={nodeRadius + 14}
                fill="transparent"
                onPress={() => handleNodePress(node)}
              />
            </G>
          );
        })}
      </Svg>

      <Modal visible={selection !== null} transparent animationType="fade" onRequestClose={() => setSelection(null)}>
        <Pressable style={styles.backdrop} onPress={() => setSelection(null)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            {selection && (
              <>
                <Text style={styles.modalTitle}>
                  {selection.type === 'edge'
                    ? `${selection.fromName} and ${selection.toName}`
                    : selection.friendName}
                </Text>
                {selection.type === 'node' && (
                  <Text style={styles.modalSubtitle}>Taste match with you</Text>
                )}
                <Text style={styles.modalScore}>
                  {Math.round(selection.edge.score * 100)}% similar
                </Text>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${Math.round(selection.edge.score * 100)}%` },
                    ]}
                  />
                </View>
                <Text style={styles.modalReason}>{selection.edge.reason}</Text>
                <Text style={styles.modalHint}>Tap node again or outside to close</Text>
              </>
            )}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.42)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6d6d6d',
    marginBottom: 8,
  },
  modalScore: {
    fontSize: 14,
    fontWeight: '600',
    color: '#e85d26',
    marginBottom: 10,
  },
  progressTrack: {
    height: 10,
    borderRadius: 999,
    backgroundColor: '#f2e6df',
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#e85d26',
  },
  modalReason: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  modalHint: {
    marginTop: 10,
    color: '#8a8a8a',
    fontSize: 12,
  },
});
