import { GraphResponse } from '../../lib/api';

export const DEMO_GRAPH: GraphResponse = {
  nodes: [
    { id: 'you', displayName: 'You', avatarUrl: 'https://i.pravatar.cc/200?u=you', isSelf: true },
    { id: 'friend-1', displayName: 'Aisha', avatarUrl: 'https://i.pravatar.cc/200?u=friend-1' },
    { id: 'friend-2', displayName: 'Leo', avatarUrl: 'https://i.pravatar.cc/200?u=friend-2' },
    { id: 'friend-3', displayName: 'Maya', avatarUrl: 'https://i.pravatar.cc/200?u=friend-3' },
    { id: 'friend-4', displayName: 'Noah', avatarUrl: 'https://i.pravatar.cc/200?u=friend-4' },
    { id: 'friend-5', displayName: 'Sara', avatarUrl: 'https://i.pravatar.cc/200?u=friend-5' },
  ],
  edges: [
    { fromId: 'you', toId: 'friend-1', score: 0.88, reason: 'Shared cuisines: Japanese, Thai' },
    { fromId: 'you', toId: 'friend-2', score: 0.71, reason: 'Shared cuisines: Italian, Mexican' },
    { fromId: 'you', toId: 'friend-3', score: 0.63, reason: 'Similar taste profile' },
    { fromId: 'you', toId: 'friend-4', score: 0.52, reason: '2 shared restaurants' },
    { fromId: 'you', toId: 'friend-5', score: 0.45, reason: 'Shared cuisines: Korean' },
    { fromId: 'friend-1', toId: 'friend-3', score: 0.58, reason: 'Shared cuisines: Japanese' },
  ],
};
