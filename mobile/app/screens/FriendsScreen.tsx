import { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  Pressable,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../../lib/auth-context';
import {
  getMyFriendsList,
  getPendingReceivedRequests,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  findProfileByDisplayName,
  type Profile,
  type FriendRequest,
} from '../../lib/friends';

type FriendsStackParamList = { FriendsList: undefined; FriendProfile: { userId: string } };
type Nav = NativeStackNavigationProp<FriendsStackParamList, 'FriendsList'>;

export function FriendsScreen() {
  const navigation = useNavigation<Nav>();
  const { session } = useAuth();
  const userId = session?.user?.id ?? '';

  const [friends, setFriends] = useState<Profile[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchName, setSearchName] = useState('');
  const [searchResult, setSearchResult] = useState<Profile | null>(null);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [friendList, pending] = await Promise.all([
      getMyFriendsList(userId),
      getPendingReceivedRequests(userId),
    ]);
    setFriends(friendList);
    setRequests(pending);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSearchUser = async () => {
    const q = searchName.trim();
    if (!q) return;
    setSearching(true);
    setSearchResult(null);
    const profile = await findProfileByDisplayName(q);
    setSearchResult(profile ?? null);
    setSearching(false);
  };

  const handleSendRequest = async (toUserId: string) => {
    if (!userId) return;
    setSending(true);
    const { ok, error } = await sendFriendRequest(userId, toUserId);
    setSending(false);
    if (ok) {
      setSearchResult(null);
      setSearchName('');
      Alert.alert('Sent', 'Friend request sent.');
    } else {
      Alert.alert('Could not send', error ?? 'Try again.');
    }
  };

  const handleAccept = async (requestId: string) => {
    if (!userId) return;
    setActioningId(requestId);
    const { ok, error } = await acceptFriendRequest(requestId, userId);
    setActioningId(null);
    if (ok) refresh();
    else Alert.alert('Error', error ?? 'Could not accept.');
  };

  const handleDecline = async (requestId: string) => {
    if (!userId) return;
    setActioningId(requestId);
    const { ok, error } = await declineFriendRequest(requestId, userId);
    setActioningId(null);
    if (ok) refresh();
    else Alert.alert('Error', error ?? 'Could not decline.');
  };

  const openFriendProfile = (friendUserId: string) => {
    navigation.navigate('FriendProfile', { userId: friendUserId });
  };

  if (!userId) {
    return (
      <View style={styles.centered}>
        <Text style={styles.placeholder}>Sign in to see friends</Text>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#e85d26" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      {/* —— Add friend —— */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add friend</Text>
        <View style={styles.addRow}>
          <TextInput
            style={styles.input}
            placeholder="Search by name (e.g. Jordan)"
            value={searchName}
            onChangeText={setSearchName}
            editable={!searching}
            autoCapitalize="words"
            autoCorrect={false}
          />
          <Pressable
            style={[styles.addButton, searching && styles.buttonDisabled]}
            onPress={handleSearchUser}
            disabled={searching}
          >
            {searching ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.addButtonText}>Search</Text>
            )}
          </Pressable>
        </View>
        {searchResult && (
          <View style={styles.searchResultCard}>
            <View style={styles.searchResultRow}>
              {searchResult.avatar_url ? (
                <Image source={{ uri: searchResult.avatar_url }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Text style={styles.thumbInitial}>
                    {(searchResult.display_name || searchResult.username || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.searchResultInfo}>
                <Text style={styles.searchResultName}>
                  {searchResult.display_name || searchResult.username || 'User'}
                </Text>
                <Text style={styles.searchResultUsername}>
                  {searchResult.username ? (searchResult.username.startsWith('@') ? searchResult.username : `@${searchResult.username}`) : ''}
                </Text>
              </View>
              <Pressable
                style={[styles.sendReqButton, sending && styles.buttonDisabled]}
                onPress={() => handleSendRequest(searchResult.id)}
                disabled={sending}
              >
                <Text style={styles.sendReqButtonText}>Send request</Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* —— Friend requests —— */}
      {requests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Friend requests</Text>
          {requests.map((req) => (
            <View key={req.id} style={styles.requestCard}>
              <View style={styles.requestRow}>
                {req.sender?.avatar_url ? (
                  <Image source={{ uri: req.sender.avatar_url }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <Text style={styles.thumbInitial}>
                      {(req.sender?.display_name || req.sender?.username || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={styles.requestInfo}>
                  <Text style={styles.requestName}>
                    {req.sender?.display_name || req.sender?.username || 'Someone'}
                  </Text>
                  <Text style={styles.requestUsername}>
                    {req.sender?.username ? (req.sender.username.startsWith('@') ? req.sender.username : `@${req.sender.username}`) : ''}
                  </Text>
                </View>
                <View style={styles.requestActions}>
                  <Pressable
                    style={[styles.acceptBtn, actioningId === req.id && styles.buttonDisabled]}
                    onPress={() => handleAccept(req.id)}
                    disabled={actioningId !== null}
                  >
                    {actioningId === req.id ? (
                      <ActivityIndicator color="#fff" size="small" />
                    ) : (
                      <Text style={styles.acceptBtnText}>Accept</Text>
                    )}
                  </Pressable>
                  <Pressable
                    style={[styles.declineBtn, actioningId === req.id && styles.buttonDisabled]}
                    onPress={() => handleDecline(req.id)}
                    disabled={actioningId !== null}
                  >
                    <Text style={styles.declineBtnText}>Decline</Text>
                  </Pressable>
                </View>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* —— Friends list —— */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Friends ({friends.length})</Text>
        {friends.length === 0 ? (
          <Text style={styles.empty}>No friends yet. Search by username to send a request.</Text>
        ) : (
          friends.map((friend) => (
            <Pressable
              key={friend.id}
              style={({ pressed }) => [styles.friendCard, pressed && styles.friendCardPressed]}
              onPress={() => openFriendProfile(friend.id)}
            >
              {friend.avatar_url ? (
                <Image source={{ uri: friend.avatar_url }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]}>
                  <Text style={styles.thumbInitial}>
                    {(friend.display_name || friend.username || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.friendInfo}>
                <Text style={styles.friendName}>{friend.display_name || friend.username || 'Friend'}</Text>
                <Text style={styles.friendUsername}>
                  {friend.username ? (friend.username.startsWith('@') ? friend.username : `@${friend.username}`) : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: '#fff' },
  container: { paddingBottom: 40 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  placeholder: { color: '#999', fontSize: 16 },
  section: { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  addRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  addButton: {
    backgroundColor: '#e85d26',
    paddingHorizontal: 18,
    justifyContent: 'center',
    borderRadius: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  buttonDisabled: { opacity: 0.6 },
  searchResultCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#eee',
  },
  searchResultRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  searchResultInfo: { flex: 1 },
  searchResultName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  searchResultUsername: { fontSize: 13, color: '#888', marginTop: 2 },
  sendReqButton: {
    backgroundColor: '#e85d26',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  sendReqButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  requestCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  requestUsername: { fontSize: 13, color: '#888', marginTop: 2 },
  requestActions: { flexDirection: 'row', gap: 8 },
  acceptBtn: {
    backgroundColor: '#34A853',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  acceptBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  declineBtn: {
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 72,
    alignItems: 'center',
  },
  declineBtnText: { color: '#666', fontWeight: '600', fontSize: 14 },
  thumb: { width: 48, height: 48, borderRadius: 24 },
  thumbPlaceholder: {
    backgroundColor: '#e85d26',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbInitial: { fontSize: 20, fontWeight: '700', color: '#fff' },
  empty: { color: '#999', fontSize: 14 },
  friendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    gap: 12,
  },
  friendCardPressed: { backgroundColor: '#f9f9f9' },
  friendInfo: { flex: 1 },
  friendName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  friendUsername: { fontSize: 13, color: '#888', marginTop: 2 },
  chevron: { fontSize: 24, color: '#ccc', fontWeight: '300' },
});
