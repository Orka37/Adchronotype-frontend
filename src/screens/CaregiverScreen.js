import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { CAREGIVER_MESSAGES, acceptCaregiverRequest, getCaregiverConnections, getCaregiverMessages, getCaregiverStats, getIncomingCaregiverRequests, getOutgoingCaregiverRequests, rejectCaregiverRequest, removeCaregiverConnection, searchCaregivers, sendCaregiverMessage, sendCaregiverRequest, updateCaregiverSearch } from '../api/caregivers';
import { getMe } from '../api/users';
import { parseApiError } from '../utils/errors';
import { log } from '../utils/logger';
import ConfirmationModal from '../components/ConfirmationModal';

function displayName(user) {
  if (!user) return 'Unknown user';
  const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
  return fullName || user.username || 'Unknown user';
}

function otherUserFor(link) {
  return link?.otherUser || link?.other_user || null;
}

function predictionFactors(prediction) {
  return prediction?.factorContributions || prediction?.factor_contributions || null;
}

function formatScore(value) {
  if (value == null) return '—';
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toFixed(1)}%` : '—';
}

function formatDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatContribution(value) {
  if (value == null) return '—';
  const number = Number(value);
  if (!Number.isFinite(number)) return '—';
  return `${number > 0 ? '+' : ''}${number.toFixed(1)}%`;
}

function formatTestScore(test) {
  if (!test) return '—';
  const score = Number(test.score);
  const value = Number.isFinite(score) && Number.isInteger(score) ? score : score.toFixed(1);
  return `${value} ${test.unit || 'pts'}`;
}

export default function CaregiverScreen({ navigation }) {
  const [profile, setProfile] = useState(null);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchMessage, setSearchMessage] = useState('');
  const [incoming, setIncoming] = useState([]);
  const [outgoing, setOutgoing] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [selectedStats, setSelectedStats] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [connectionToRemove, setConnectionToRemove] = useState(null);

  const factorRows = useMemo(() => {
    const factors = predictionFactors(selectedStats?.latestPrediction || selectedStats?.latest_prediction);
    if (!factors) return [];
    return [
      ['Chronotype', factors.chronotype],
      ['Age', factors.age],
      ['Sleeptime', factors.sleep_time],
      ['Waketime', factors.wake_time],
      ['BMI', factors.bmi],
      ['Ethnicity', factors.ethnicity],
    ];
  }, [selectedStats]);

  const loadCaregiverData = useCallback(async () => {
    try {
      setLoading(true);
      const [me, nextIncoming, nextOutgoing, nextConnections] = await Promise.all([
        getMe(),
        getIncomingCaregiverRequests(),
        getOutgoingCaregiverRequests(),
        getCaregiverConnections(),
      ]);
      setProfile(me);
      setSearchEnabled(Boolean(me.caregiverSearchEnabled));
      setIncoming(Array.isArray(nextIncoming) ? nextIncoming : []);
      setOutgoing(Array.isArray(nextOutgoing) ? nextOutgoing : []);
      setConnections(Array.isArray(nextConnections) ? nextConnections : []);

      if (selectedConnection) {
        const selectedOther = otherUserFor(selectedConnection);
        const stillConnected = nextConnections.find((link) => otherUserFor(link)?.id === selectedOther?.id);
        if (!stillConnected) {
          setSelectedConnection(null);
          setSelectedStats(null);
          setMessages([]);
        }
      }
    } catch (err) {
      log.error('CaregiverScreen.loadCaregiverData', err);
      Alert.alert('Could not load caregiver data', parseApiError(err));
    } finally {
      setLoading(false);
    }
  }, [selectedConnection]);

  useEffect(() => {
    loadCaregiverData();
  }, [loadCaregiverData]);

  useFocusEffect(
    useCallback(() => {
      loadCaregiverData();
    }, [loadCaregiverData])
  );

  async function refresh() {
    setRefreshing(true);
    await loadCaregiverData();
    setRefreshing(false);
  }

  async function toggleSearch(value) {
    const previous = searchEnabled;
    setSearchEnabled(value);
    try {
      const updated = await updateCaregiverSearch(value);
      setProfile(updated);
      setSearchEnabled(Boolean(updated.caregiverSearchEnabled));
      log.info('CaregiverScreen: search visibility changed');
    } catch (err) {
      setSearchEnabled(previous);
      log.error('CaregiverScreen.toggleSearch', err);
      Alert.alert('Could not update privacy', parseApiError(err));
    }
  }

  async function handleSearch() {
      const username = query.trim();
    if (username.length < 2) {
      Alert.alert('Search by username', 'Enter at least 2 characters.');
      return;
    }

    try {
      setSearching(true);
      setSearchResults([]);
      setSearchMessage('');
      const result = await searchCaregivers(username);
      const results = Array.isArray(result) ? result : [];
      setSearchResults(results);
      if (results.length === 0) {
        setSearchMessage('No searchable user found with that username.');
      }
      log.info('CaregiverScreen: username searched');
    } catch (err) {
      setSearchResults([]);
      if (err?.response?.status === 404) {
        setSearchMessage('No searchable user found with that username.');
      } else {
        log.error('CaregiverScreen.handleSearch', err);
        Alert.alert('Search failed', parseApiError(err));
      }
    } finally {
      setSearching(false);
    }
  }

  async function handleRequest(username) {
    try {
      setBusy(true);
      await sendCaregiverRequest(username);
      setSearchResults((current) => current.map((user) => (
        user.username === username ? { ...user, request_status: 'pending' } : user
      )));
      await loadCaregiverData();
      Alert.alert('Request sent', `Your caregiver request was sent to @${username}.`);
    } catch (err) {
      log.error('CaregiverScreen.handleRequest', err);
      Alert.alert('Could not send request', parseApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleRequestAction(linkId, action) {
    try {
      setBusy(true);
      if (action === 'accept') {
        await acceptCaregiverRequest(linkId);
      } else {
        await rejectCaregiverRequest(linkId);
      }
      await loadCaregiverData();
    } catch (err) {
      log.error('CaregiverScreen.handleRequestAction', err);
      Alert.alert('Request update failed', parseApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function openConnection(link) {
    const otherUserId = otherUserFor(link)?.id;
    if (!otherUserId) return;

    try {
      setBusy(true);
      setSelectedConnection(link);
      const [stats, thread] = await Promise.all([
        getCaregiverStats(otherUserId),
        getCaregiverMessages(otherUserId),
      ]);
      setSelectedStats(stats);
      setMessages(Array.isArray(thread) ? thread : []);
      log.info('CaregiverScreen: connected user stats opened');
    } catch (err) {
      log.error('CaregiverScreen.openConnection', err);
      Alert.alert('Could not open stats', parseApiError(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSendMessage(messageKey) {
    const otherUserId = otherUserFor(selectedConnection)?.id;
    if (!otherUserId) return;

    try {
      setBusy(true);
      await sendCaregiverMessage(otherUserId, messageKey);
      const thread = await getCaregiverMessages(otherUserId);
      setMessages(Array.isArray(thread) ? thread : []);
      log.info('CaregiverScreen: prebuilt message sent');
    } catch (err) {
      log.error('CaregiverScreen.handleSendMessage', err);
      Alert.alert('Could not send message', parseApiError(err));
    } finally {
      setBusy(false);
    }
  }

  function confirmRemoveConnection(link) {
    setConnectionToRemove(link);
  }

  async function performRemoveConnection() {
    const link = connectionToRemove;
    if (!link) return;
    try {
      setBusy(true);
      await removeCaregiverConnection(link.id);
      setConnectionToRemove(null);
      if (selectedConnection?.id === link.id) {
        setSelectedConnection(null);
        setSelectedStats(null);
        setMessages([]);
      }
      await loadCaregiverData();
      log.info('CaregiverScreen: connection removed');
    } catch (err) {
      log.error('CaregiverScreen.performRemoveConnection', err);
      Alert.alert('Could not remove connection', parseApiError(err));
    } finally {
      setBusy(false);
    }
  }

  const latestPrediction = selectedStats?.latestPrediction || selectedStats?.latest_prediction;
  const cognitiveTests = selectedStats?.cognitiveTests || selectedStats?.cognitive_tests || [];
  const personalBests = selectedStats?.personalBests || selectedStats?.personal_bests || {};

  if (loading) {
    return (
      <View style={[styles.root, styles.center]}>
        <ActivityIndicator color="#7c3aed" size="large" />
      </View>
    );
  }

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <SafeAreaView style={styles.safeBottom}>
        <View style={styles.root}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#8a52f3" colors={['#8a52f3']} />}
          >
            <View style={styles.header}>
              <TouchableOpacity
                style={styles.backBtn}
                onPress={() => navigation.navigate('Report')}
                activeOpacity={0.8}
              >
                <Feather name="chevron-left" size={26} color="#fff" />
              </TouchableOpacity>
              <View style={styles.headerText}>
                <Text style={styles.title}>Caregiver</Text>
                <Text style={styles.subtitle}>Connect with trusted people and share progress.</Text>
              </View>
              {busy && <ActivityIndicator color="#7c3aed" />}
            </View>

            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.iconBox}>
                  <Feather name="eye" size={18} color="#c8b8ff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Appear in Search</Text>
                  <Text style={styles.cardBody}>Allow trusted people to find your username and send a request.</Text>
                </View>
                <Switch
                  value={searchEnabled}
                  onValueChange={toggleSearch}
                  trackColor={{ false: '#2a3060', true: '#7c3aed66' }}
                  thumbColor={searchEnabled ? '#8a52f3' : '#6c7094'}
                />
              </View>
              <Text style={styles.username}>Your username: @{profile?.username}</Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Find Someone</Text>
              <View style={styles.searchRow}>
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search username"
                  placeholderTextColor="#4a5270"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                  style={styles.searchInput}
                />
                <TouchableOpacity style={styles.searchBtn} onPress={handleSearch} disabled={searching} activeOpacity={0.85}>
                  {searching ? <ActivityIndicator color="#fff" /> : <Feather name="search" size={18} color="#fff" />}
                </TouchableOpacity>
              </View>

              {searchMessage ? <Text style={styles.searchMessage}>{searchMessage}</Text> : null}

              {searchResults.map((user) => {
                const alreadyPending = user.request_status === 'pending';
                const alreadyConnected = user.request_status === 'accepted' || user.request_status === 'active';
                const disabled = busy || alreadyPending || alreadyConnected;
                const buttonLabel = alreadyConnected ? 'Connected' : alreadyPending ? 'Pending' : 'Invite';

                return (
                  <View key={user.id || user.username} style={styles.personRow}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{displayName(user).slice(0, 1).toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personName}>{displayName(user)}</Text>
                      <Text style={styles.personMeta}>@{user.username}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.smallBtn, disabled && styles.smallBtnDisabled]}
                      onPress={() => handleRequest(user.username)}
                      disabled={disabled}
                    >
                      <Text style={[styles.smallBtnText, disabled && styles.smallBtnTextDisabled]}>{buttonLabel}</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>

            {incoming.length > 0 && (
              <View style={styles.card}>
                <View style={styles.sectionTitleRow}>
                  <Text style={styles.cardTitle}>Incoming Requests</Text>
                  <View style={styles.countBadge}>
                    <Text style={styles.countBadgeText}>{incoming.length}</Text>
                  </View>
                </View>
                {incoming.map((link) => (
                  <View key={link.id} style={styles.requestRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personName}>{displayName(otherUserFor(link))}</Text>
                      <Text style={styles.personMeta}>@{otherUserFor(link)?.username}</Text>
                    </View>
                    <TouchableOpacity style={styles.acceptBtn} onPress={() => handleRequestAction(link.id, 'accept')} disabled={busy}>
                      <Feather name="check" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.rejectBtn} onPress={() => handleRequestAction(link.id, 'reject')} disabled={busy}>
                      <Feather name="x" size={16} color="#ff5c5c" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {outgoing.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Sent Requests</Text>
                {outgoing.map((link) => (
                  <View key={link.id} style={styles.personRow}>
                    <View style={styles.avatarDim}><Feather name="clock" size={16} color="#6c7094" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personName}>{displayName(otherUserFor(link))}</Text>
                      <Text style={styles.personMeta}>Pending request to @{otherUserFor(link)?.username}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Connections</Text>
              {connections.length === 0 ? (
                <Text style={styles.emptyText}>Accepted caregiver connections will appear here.</Text>
              ) : connections.map((link) => {
                const selected = selectedConnection?.id === link.id;
                return (
                  <TouchableOpacity key={link.id} style={[styles.connectionRow, selected && styles.connectionRowOn]} onPress={() => openConnection(link)} activeOpacity={0.85}>
                    <View style={styles.avatar}><Text style={styles.avatarText}>{displayName(otherUserFor(link)).slice(0, 1).toUpperCase()}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.personName}>{displayName(otherUserFor(link))}</Text>
                      <Text style={styles.personMeta}>@{otherUserFor(link)?.username}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => confirmRemoveConnection(link)}
                      disabled={busy}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="trash-2" size={16} color="#ff5c5c" />
                    </TouchableOpacity>
                    <Feather name="chevron-right" size={18} color="#6c7094" />
                  </TouchableOpacity>
                );
              })}
            </View>

            {selectedConnection && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>{displayName(otherUserFor(selectedConnection))}'s Shared Stats</Text>
                <View style={styles.scoreRow}>
                  <View style={styles.scoreBox}>
                    <Text style={styles.metricValue}>{formatScore(latestPrediction?.prediction)}</Text>
                    <Text style={styles.metricLabel}>Latest Score</Text>
                  </View>
                  <View style={styles.scoreBox}>
                    <Text style={styles.metricValue}>{latestPrediction?.riskLevel || latestPrediction?.risk_level || '—'}</Text>
                    <Text style={styles.metricLabel}>Level</Text>
                  </View>
                </View>

                {factorRows.length > 0 && (
                  <>
                    <Text style={styles.subhead}>Factor Contributions</Text>
                    <View style={styles.factorGrid}>
                      {factorRows.map(([label, value]) => (
                        <View key={label} style={styles.factorCell}>
                          <Text style={styles.factorLabel}>{label}</Text>
                          <Text style={styles.factorValue}>{formatContribution(value)}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                <Text style={styles.subhead}>Cognitive Test Scores</Text>
                {cognitiveTests.length === 0 ? (
                  <Text style={styles.emptyText}>No cognitive test results shared yet.</Text>
                ) : cognitiveTests.slice(0, 6).map((test) => (
                  <View key={test.id || `${test.testType}-${test.testedAt}`} style={styles.resultRow}>
                    <View>
                      <Text style={styles.resultName}>{test.testType || test.test_type}</Text>
                      <Text style={styles.personMeta}>Attempt {test.attemptNumber || test.attempt_number || 1} · {formatDate(test.testedAt || test.tested_at)}</Text>
                    </View>
                    <Text style={styles.resultScore}>{formatTestScore(test)}</Text>
                  </View>
                ))}

                {Object.keys(personalBests || {}).length > 0 && (
                  <>
                    <Text style={styles.subhead}>Personal Bests</Text>
                    <View style={styles.factorGrid}>
                      {Object.entries(personalBests).map(([key, test]) => (
                        <View key={key} style={styles.factorCell}>
                          <Text style={styles.factorLabel}>{key}</Text>
                          <Text style={styles.factorValue}>{formatTestScore(test)}</Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}

                <Text style={styles.subhead}>Send a Message</Text>
                <View style={styles.messageGrid}>
                  {CAREGIVER_MESSAGES.map((message) => (
                    <TouchableOpacity key={message.key} style={styles.messageBtn} onPress={() => handleSendMessage(message.key)} disabled={busy} activeOpacity={0.85}>
                      <Text style={styles.messageBtnText}>{message.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {messages.length > 0 && (
                  <>
                    <Text style={styles.subhead}>Recent Messages</Text>
                    {messages.slice(0, 5).map((message) => (
                      <View key={message.id} style={styles.messageRow}>
                        <Feather name="message-circle" size={14} color="#7c3aed" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.messageText}>{message.messageText || message.message_text}</Text>
                          <Text style={styles.personMeta}>{formatDate(message.createdAt || message.created_at)}</Text>
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>

          <View style={styles.navWrap}>
            <View style={styles.nav}>
              {[
                { label: 'Home', icon: 'home', active: false, onPress: () => navigation.navigate('Report') },
                { label: 'Sleep', icon: 'moon', active: false, onPress: () => navigation.navigate('SleepLog') },
                { label: 'Tips', icon: 'book-open', active: false, onPress: () => navigation.navigate('Tips') },
                { label: 'Caregiver', icon: 'users', active: true, onPress: null, badgeCount: incoming.length },
                { label: 'Profile', icon: 'user', active: false, onPress: () => navigation.navigate('Profile') },
              ].map((tab) => (
                <TouchableOpacity key={tab.label} style={styles.navItem} onPress={tab.onPress} disabled={tab.active} activeOpacity={0.7}>
                  {tab.badgeCount > 0 && (
                    <View style={styles.navBadge}>
                      <Text style={styles.navBadgeText}>{tab.badgeCount > 9 ? '9+' : tab.badgeCount}</Text>
                    </View>
                  )}
                  <Feather name={tab.icon} size={22} color={tab.active ? '#8a52f3' : '#6c7094'} />
                  <Text style={[styles.navLabel, tab.active && { color: '#8a52f3' }]}>{tab.label}</Text>
                  {tab.active && <View style={styles.activeDot} />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </SafeAreaView>

      <ConfirmationModal
        visible={Boolean(connectionToRemove)}
        title="Remove connection?"
        message={`Remove ${displayName(otherUserFor(connectionToRemove))} from your caregiver connections?`}
        confirmLabel="Remove"
        danger
        busy={busy}
        onCancel={() => setConnectionToRemove(null)}
        onConfirm={performRemoveConnection}
      />
    </>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 0, backgroundColor: '#030827', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom: { flex: 1, backgroundColor: '#030A31' },
  root: { flex: 1, backgroundColor: '#030A31' },
  center: { alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, paddingHorizontal: 16 },
  scrollContent: { paddingTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { alignItems: 'center', height: 40, justifyContent: 'center', marginRight: 8, width: 40 },
  headerText: { flex: 1 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900' },
  subtitle: { color: '#8c91b5', fontSize: 13, marginTop: 4 },
  card: { backgroundColor: '#161b3d', borderRadius: 16, borderWidth: 1, borderColor: '#1f254f', padding: 14, marginBottom: 14 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: { width: 38, height: 38, borderRadius: 11, backgroundColor: '#7c3aed22', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 6 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  countBadge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: '#ff5c5c', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  countBadgeText: { color: '#fff', fontSize: 11, fontWeight: '900' },
  cardBody: { color: '#8c91b5', fontSize: 12, lineHeight: 18 },
  username: { color: '#c8b8ff', fontSize: 12, fontWeight: '700', marginTop: 12 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  searchInput: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1.5, borderColor: '#1f254f', backgroundColor: '#0b1030', color: '#fff', paddingHorizontal: 14, fontSize: 14 },
  searchBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  personRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1f254f', marginTop: 10 },
  requestRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderTopWidth: 1, borderTopColor: '#1f254f' },
  connectionRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#1f254f' },
  connectionRowOn: { backgroundColor: '#7c3aed14', marginHorizontal: -8, paddingHorizontal: 8, borderRadius: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#7c3aed', alignItems: 'center', justifyContent: 'center' },
  avatarDim: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#1f254f', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontWeight: '900', fontSize: 15 },
  personName: { color: '#fff', fontSize: 14, fontWeight: '800' },
  personMeta: { color: '#6c7094', fontSize: 11, marginTop: 3 },
  smallBtn: { backgroundColor: '#7c3aed', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  smallBtnDisabled: { backgroundColor: '#1f254f' },
  smallBtnTextDisabled: { color: '#6c7094' },
  searchMessage: { color: '#8c91b5', fontSize: 12, lineHeight: 18, marginTop: 12 },
  acceptBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#00c9b1', alignItems: 'center', justifyContent: 'center' },
  rejectBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#ff5c5c22', borderWidth: 1, borderColor: '#ff5c5c55', alignItems: 'center', justifyContent: 'center' },
  removeBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#ff5c5c18', borderWidth: 1, borderColor: '#ff5c5c44', alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#6c7094', fontSize: 12, lineHeight: 18, paddingTop: 4 },
  scoreRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  scoreBox: { flex: 1, backgroundColor: '#0b1030', borderRadius: 12, borderWidth: 1, borderColor: '#1f254f', padding: 12 },
  metricValue: { color: '#00c9b1', fontSize: 18, fontWeight: '900' },
  metricLabel: { color: '#6c7094', fontSize: 10, fontWeight: '700', marginTop: 4 },
  subhead: { color: '#c8b8ff', fontSize: 12, fontWeight: '900', marginTop: 16, marginBottom: 8, letterSpacing: 0.3 },
  factorGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  factorCell: { width: '48%', backgroundColor: '#0b1030', borderRadius: 10, borderWidth: 1, borderColor: '#1f254f', padding: 10 },
  factorLabel: { color: '#8c91b5', fontSize: 10, fontWeight: '700', marginBottom: 4 },
  factorValue: { color: '#fff', fontSize: 15, fontWeight: '900' },
  resultRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: '#1f254f', paddingVertical: 10 },
  resultName: { color: '#fff', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' },
  resultScore: { color: '#c8b8ff', fontSize: 12, fontWeight: '900' },
  messageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  messageBtn: { width: '48%', backgroundColor: '#7c3aed22', borderWidth: 1, borderColor: '#7c3aed55', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center' },
  messageBtnText: { color: '#c8b8ff', fontSize: 11, fontWeight: '800', textAlign: 'center' },
  messageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderTopWidth: 1, borderTopColor: '#1f254f', paddingVertical: 10 },
  messageText: { color: '#fff', fontSize: 12, lineHeight: 17 },
  navWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#030A31', borderTopWidth: 1, borderTopColor: '#1f254f' },
  nav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  navItem: { alignItems: 'center', width: 64 },
  navBadge: { position: 'absolute', top: -5, right: 13, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: '#ff5c5c', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4, zIndex: 2 },
  navBadgeText: { color: '#fff', fontSize: 9, fontWeight: '900' },
  navLabel: { color: '#6c7094', fontSize: 10, marginTop: 4, fontWeight: '600' },
  activeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#8a52f3', position: 'absolute', bottom: -8 },
});
