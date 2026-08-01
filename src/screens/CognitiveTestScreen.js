import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getCognitiveStatus, getCognitiveTests, getPersonalBests, submitAllCognitiveTests } from '../api/cognitive';
import { useAuth } from '../context/AuthContext';
import { parseApiError } from '../utils/errors';
import { deleteStoredItem, getStoredItem, setStoredItem } from '../utils/storage';
import { log } from '../utils/logger';

const TESTS = [
  { key: 'memory', label: 'Memory Match', icon: 'brain', color: '#7c3aed', desc: '3 rounds of word-pair recall' },
  { key: 'stroop', label: 'Stroop Test', icon: 'palette', color: '#00c9b1', desc: 'Timed congruent and incongruent phases' },
  { key: 'digit_span', label: 'Digit Span Sequencing', icon: 'numeric', color: '#ffb830', desc: 'Sort digit sequences in ascending order' },
  { key: 'reaction', label: 'Reaction Time', icon: 'lightning-bolt', color: '#ff5c5c', desc: '20 target-response trials' },
];

const TEST_INSTRUCTIONS = {
  memory: [
    'You will study unrelated word pairs one at a time.',
    'After the study phase, the first word appears as a cue.',
    'Type the matching word before time runs out. The test has 3 rounds.',
  ],
  stroop: [
    'A color word appears in colored ink.',
    'Tap the ink color, not the word itself.',
    'You will complete a matching-color phase and a harder mismatched-color phase.',
  ],
  digit_span: [
    'Watch digits appear one at a time.',
    'When prompted, enter the digits in ascending order.',
    'The sequence length increases as you answer correctly.',
  ],
  reaction: [
    'Wait until the target appears.',
    'Tap the target as quickly as you can.',
    'Do not tap early; the score is based on your average response time.',
  ],
};

const WORDSETS = [
  [
    ['cat', 'ring'],
    ['sun', 'jam'],
    ['bed', 'rope'],
    ['fish', 'bell'],
    ['tree', 'mask'],
    ['star', 'shoe'],
    ['book', 'coal'],
    ['rain', 'gold'],
    ['glass', 'farm'],
    ['road', 'leaf'],
    ['bread', 'wave'],
    ['clock', 'sand'],
  ],
  [
    ['ship', 'barn'],
    ['salt', 'glove'],
    ['stone', 'card'],
    ['wind', 'seat'],
    ['lamp', 'knot'],
    ['foot', 'surf'],
    ['milk', 'twig'],
    ['ring', 'cup'],
    ['seed', 'mine'],
    ['bell', 'sky'],
    ['leaf', 'hook'],
    ['mask', 'page'],
  ],
  [
    ['coal', 'bed'],
    ['gate', 'fish'],
    ['wave', 'bread'],
    ['sand', 'star'],
    ['chair', 'rain'],
    ['hand', 'glass'],
    ['card', 'sun'],
    ['wheel', 'book'],
    ['barn', 'cat'],
    ['rope', 'tree'],
    ['bird', 'road'],
    ['jam', 'ship'],
  ],
];

const STROOP_COLORS = {
  red: '#ff5c5c',
  blue: '#5a8dee',
  green: '#00c9b1',
  yellow: '#ffb830',
};

const STROOP_COLOR_NAMES = Object.keys(STROOP_COLORS);
const MEMORY_STUDY_MS = 3000;
const MEMORY_ANSWER_MS = 8000;
const MEMORY_ROUNDS = 3;
const STROOP_PHASE_SECONDS = 45;
const DIGIT_START_LEN = 3;
const DIGIT_MAX_LEN = 9;
const DIGIT_TRIALS_PER_LEN = 2;
const DIGIT_DISPLAY_MS = 1000;
const DIGIT_GAP_MS = 600;
const DIGIT_INTER_TRIAL_MS = 1500;
const DIGIT_ANSWER_SECONDS = 5;
const RT_TRIALS = 20;

const TEST_META = TESTS.reduce((acc, test) => {
  acc[test.key] = test;
  return acc;
}, {});

function shuffle(items) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalize(value) {
  return (value || '').trim().toLowerCase();
}

function generateDigitSequence(length) {
  return Array.from({ length }, () => Math.floor(Math.random() * 9) + 1);
}

function arraysEqual(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function createStroopTrial(type) {
  const word = STROOP_COLOR_NAMES[Math.floor(Math.random() * STROOP_COLOR_NAMES.length)];
  const ink = type === 'congruent'
    ? word
    : shuffle(STROOP_COLOR_NAMES.filter((color) => color !== word))[0];

  return { word, ink };
}

function formatScore(testType, score, fallbackUnit) {
  if (score == null) return 'No result';
  const unit = testType === 'reaction' ? 'ms' : fallbackUnit || 'pts';
  const value = Number.isInteger(score) ? score : Number(score).toFixed(1);
  return `${value} ${unit}`;
}

function formatTestDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function formatAvailableDate(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function CognitiveTestScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const draftKey = user ? `cognitive_draft_${user.id || user.username}` : null;
  const [phase, setPhase] = useState('intro');
  const [pendingTest, setPendingTest] = useState(null);
  const [results, setResults] = useState({});
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [cognitiveStatus, setCognitiveStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [savedResults, setSavedResults] = useState([]);
  const [personalBests, setPersonalBests] = useState({});
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  const [resultsOnly, setResultsOnly] = useState(false);

  const allDone = TESTS.every((test) => results[test.key]);
  const doneCount = Object.keys(results).length;
  const hasDraft = doneCount > 0;
  const isLocked = cognitiveStatus?.can_start === false && !hasDraft;
  const isRunningTest = ['memory', 'stroop', 'digit_span', 'reaction'].includes(phase);

  const loadCognitiveSummary = useCallback(async () => {
    try {
      setSummaryLoading(true);
      setSummaryError('');
      const [history, bests] = await Promise.all([
        getCognitiveTests(undefined, 1),
        getPersonalBests(),
      ]);
      let status = null;
      try {
        status = await getCognitiveStatus();
      } catch (err) {
        log.warn('CognitiveTestScreen: cognitive status unavailable, using local fallback', err?.message);
      }
      setSavedResults(Array.isArray(history) ? history : []);
      setPersonalBests(bests || {});
      setCognitiveStatus(status || null);
      if (status?.next_attempt_number && !hasDraft) {
        setAttemptNumber(status.next_attempt_number);
      }
    } catch (err) {
      if (err?.response?.status === 401) {
        log.warn('CognitiveTestScreen: session expired while loading summary');
        setSummaryError('Your session expired. Please log in again.');
        await deleteStoredItem('tokens').catch(() => {});
        await deleteStoredItem('user').catch(() => {});
        signOut();
      } else {
        log.error('CognitiveTestScreen.loadCognitiveSummary', err);
        setSummaryError('Saved results could not be loaded.');
      }
    } finally {
      setSummaryLoading(false);
    }
  }, [hasDraft, signOut]);

  useEffect(() => {
    loadCognitiveSummary();
  }, [loadCognitiveSummary]);

  useEffect(() => {
    if (!draftKey) return;

    getStoredItem(draftKey)
      .then((raw) => {
        if (!raw) return;
        const draft = JSON.parse(raw);
        if (draft?.results && typeof draft.results === 'object') {
          setResults(draft.results);
          setAttemptNumber(Number(draft.attemptNumber || 1));
          setPhase('hub');
        }
      })
      .catch((err) => log.warn('CognitiveTestScreen: could not restore draft', err?.message));
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !cognitiveStatus || cognitiveStatus.can_start !== false || !hasDraft) return;

    deleteStoredItem(draftKey).catch(() => {});
    setResults({});
    setPendingTest(null);
    setAttemptNumber(cognitiveStatus.next_attempt_number || 1);
    setPhase('intro');
    Alert.alert(
      'Retake not available yet',
      `You can take the cognitive tests again on ${formatAvailableDate(cognitiveStatus.next_available_at)}.`
    );
  }, [cognitiveStatus, draftKey, hasDraft]);

  async function persistDraft(nextResults, nextAttemptNumber = attemptNumber) {
    if (!draftKey) return;
    if (!Object.keys(nextResults).length) {
      await deleteStoredItem(draftKey).catch(() => {});
      return;
    }
    await setStoredItem(draftKey, JSON.stringify({
      attemptNumber: nextAttemptNumber,
      results: nextResults,
      updatedAt: new Date().toISOString(),
    })).catch((err) => log.warn('CognitiveTestScreen: could not persist draft', err?.message));
  }

  function startAttempt() {
    if (isLocked) return;
    setResultsOnly(false);
    setPhase('hub');
  }

  function viewSavedResults() {
    setResultsOnly(true);
    setPhase('hub');
  }

  function pickTest(testKey) {
    setPendingTest(testKey);
    setPhase('instruction');
  }

  function beginPendingTest() {
    if (!pendingTest) {
      setPhase('hub');
      return;
    }
    setPhase(pendingTest);
  }

  function returnToTestList() {
    setPhase('hub');
  }

  function handleBackPress() {
    if (isRunningTest) {
      returnToTestList();
      return;
    }

    navigation.goBack();
  }

  function recordResult(testKey, score, unit, durationSeconds) {
    setResults((prev) => {
      const next = {
        ...prev,
        [testKey]: {
          test_type: testKey,
          attempt_number: attemptNumber,
          score,
          unit,
          duration_seconds: durationSeconds ?? null,
          tested_at: new Date().toISOString(),
        },
      };
      persistDraft(next);
      return next;
    });
    setPendingTest(null);
    setPhase('hub');
  }

  async function handleSubmitAll() {
    setSubmitting(true);

    try {
      const payload = TESTS.map((test) => ({
        ...results[test.key],
        attempt_number: attemptNumber,
      }));
      log.info('submitting cognitive tests', { count: payload.length, attempt: attemptNumber });
      await submitAllCognitiveTests(payload);
      await deleteStoredItem(draftKey).catch(() => {});
      await loadCognitiveSummary();
      setResults({});
      setPhase('done');
    } catch (err) {
      log.error('cognitive submit failed', err);
      Alert.alert(
        'Could not save results',
        parseApiError(err),
        [{ text: 'OK' }]
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <SafeAreaView style={styles.safeTop} />
      <SafeAreaView style={styles.safeBottom}>
        <View style={styles.root}>
          <LinearGradient colors={['#030827', '#030A31']} style={StyleSheet.absoluteFillObject} />

          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackPress} style={styles.backBtn} activeOpacity={0.7}>
              <Feather name="arrow-left" size={22} color="#c8b8ff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Cognitive Test</Text>
            <View style={styles.headerSpacer} />
          </View>

          {phase === 'intro' && (
            <Intro
              locked={isLocked}
              nextAvailableAt={cognitiveStatus?.next_available_at}
              onStart={startAttempt}
              onViewResults={viewSavedResults}
              onBack={() => navigation.goBack()}
            />
          )}
          {phase === 'hub' && (
            <TestHub
              results={results}
              allDone={allDone}
              submitting={submitting}
              savedResults={savedResults}
              personalBests={personalBests}
              summaryLoading={summaryLoading}
              summaryError={summaryError}
              resultsOnly={resultsOnly}
              onRefreshSummary={loadCognitiveSummary}
              attemptNumber={attemptNumber}
              onPick={pickTest}
              onSubmit={handleSubmitAll}
            />
          )}
          {phase === 'instruction' && (
            <TestInstruction testKey={pendingTest} onBegin={beginPendingTest} onBack={returnToTestList} />
          )}
          {phase === 'memory' && <MemoryTest onDone={recordResult} onCancel={returnToTestList} />}
          {phase === 'stroop' && <StroopTest onDone={recordResult} onCancel={returnToTestList} />}
          {phase === 'digit_span' && <DigitSpanTest onDone={recordResult} onCancel={returnToTestList} />}
          {phase === 'reaction' && <ReactionTest onDone={recordResult} onCancel={returnToTestList} />}
          {phase === 'done' && <Done onHome={() => navigation.navigate('Report')} />}
        </View>
      </SafeAreaView>
    </>
  );
}

function Intro({ locked, nextAvailableAt, onStart, onViewResults, onBack }) {
  return (
    <ScrollView contentContainerStyle={styles.introScroll}>
      <View style={styles.brainCircle}>
        <MaterialCommunityIcons name="brain" size={40} color="#c8b8ff" />
      </View>
      <Text style={styles.introTitle}>Cognitive Test Battery</Text>

      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>HOW YOUR DATA IS USED</Text>
        <Text style={styles.infoBody}>
          Your results are stored securely and used for ADChronotype research to improve prediction accuracy.
        </Text>
      </View>

      <View style={styles.warnCard}>
        <Text style={styles.warnLabel}>NOT A CLINICAL ASSESSMENT</Text>
        <Text style={styles.warnBody}>
          These tests do not diagnose any medical condition. Results are for research only.
        </Text>
      </View>

      <Text style={styles.introSub}>You will complete 4 tests. Plan for about 20 minutes in a quiet place.</Text>
      {locked ? (
        <View style={styles.lockCard}>
          <Feather name="lock" size={20} color="#ffb830" />
          <Text style={styles.lockTitle}>Retake available after one week</Text>
          <Text style={styles.lockText}>You can take the full battery again on {formatAvailableDate(nextAvailableAt)}.</Text>
          <TouchableOpacity style={styles.secondaryFullBtn} onPress={onViewResults} activeOpacity={0.85}>
            <Text style={styles.secondaryFullBtnText}>View Saved Results</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.primaryBtn} onPress={onStart} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>I Understand - Start Tests</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.linkText}>Back to Report</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function TestHub({
  results,
  allDone,
  submitting,
  attemptNumber,
  savedResults,
  personalBests,
  summaryLoading,
  summaryError,
  resultsOnly,
  onRefreshSummary,
  onPick,
  onSubmit,
}) {
  const doneCount = Object.keys(results).length;
  const recentResults = savedResults.slice(0, 6);

  return (
    <ScrollView contentContainerStyle={styles.hubScroll}>
      {resultsOnly ? (
        <Text style={styles.hubProgress}>Saved cognitive test results</Text>
      ) : (
        <>
          <Text style={styles.hubProgress}>Attempt {attemptNumber} · {doneCount} of 4 tests complete</Text>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(doneCount / 4) * 100}%` }]} />
          </View>
        </>
      )}

      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>Personal Bests</Text>
          <TouchableOpacity onPress={onRefreshSummary} disabled={summaryLoading} activeOpacity={0.7}>
            {summaryLoading
              ? <ActivityIndicator color="#7c3aed" size="small" />
              : <Feather name="refresh-cw" size={16} color="#8a52f3" />
            }
          </TouchableOpacity>
        </View>
        {summaryError ? <Text style={styles.summaryError}>{summaryError}</Text> : null}
        <View style={styles.bestGrid}>
          {TESTS.map((test) => (
            <View key={test.key} style={styles.bestTile}>
              <MaterialCommunityIcons name={test.icon} size={18} color={test.color} />
              <Text style={styles.bestLabel}>{test.label.replace(' Sequencing', '')}</Text>
              <Text style={styles.bestValue}>{formatScore(test.key, personalBests[test.key])}</Text>
            </View>
          ))}
        </View>
      </View>

      {!resultsOnly && TESTS.map((test) => {
        const done = !!results[test.key];

        return (
          <TouchableOpacity
            key={test.key}
            style={[styles.testCard, done && styles.testCardDone]}
            onPress={() => !done && onPick(test.key)}
            disabled={done}
            activeOpacity={0.8}
          >
            <View style={[styles.testIcon, { backgroundColor: `${test.color}22` }]}>
              <MaterialCommunityIcons name={test.icon} size={24} color={test.color} />
            </View>
            <View style={styles.testCardContent}>
              <Text style={styles.testLabel}>{test.label}</Text>
              <Text style={styles.testDesc}>
                {done ? `Score: ${results[test.key].score} ${results[test.key].unit}` : test.desc}
              </Text>
            </View>
            {done ? (
              <Feather name="check-circle" size={22} color="#00c9b1" />
            ) : (
              <Feather name="chevron-right" size={22} color="#6c7094" />
            )}
          </TouchableOpacity>
        );
      })}

      {!resultsOnly && (
        <TouchableOpacity
          style={[styles.primaryBtn, (!allDone || submitting) && styles.primaryBtnDisabled]}
          onPress={onSubmit}
          disabled={!allDone || submitting}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>{allDone ? 'Submit All Results' : 'Complete all 4 tests'}</Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>Recent Saved Results</Text>
        {summaryLoading && !recentResults.length ? (
          <View style={styles.emptyResultsRow}>
            <ActivityIndicator color="#7c3aed" size="small" />
            <Text style={styles.emptyResultsText}>Loading saved results</Text>
          </View>
        ) : recentResults.length ? (
          recentResults.map((item) => {
            const meta = TEST_META[item.test_type] || {};
            return (
              <View key={item.id || `${item.test_type}-${item.tested_at}`} style={styles.resultRow}>
                <View style={[styles.resultIcon, { backgroundColor: `${meta.color || '#7c3aed'}22` }]}>
                  <MaterialCommunityIcons name={meta.icon || 'brain'} size={16} color={meta.color || '#7c3aed'} />
                </View>
                <View style={styles.resultTextWrap}>
                  <Text style={styles.resultLabel}>{meta.label || item.test_type}</Text>
                  <Text style={styles.resultDate}>Attempt {item.attempt_number || 1} · {formatTestDate(item.tested_at)}</Text>
                </View>
                <Text style={styles.resultScore}>{formatScore(item.test_type, item.score, item.unit)}</Text>
              </View>
            );
          })
        ) : (
          <Text style={styles.emptyResultsText}>No saved cognitive test results yet.</Text>
        )}
      </View>
    </ScrollView>
  );
}


function TestInstruction({ testKey, onBegin, onBack }) {
  const meta = TEST_META[testKey] || TESTS[0];
  const instructions = TEST_INSTRUCTIONS[testKey] || [];

  return (
    <ScrollView contentContainerStyle={styles.introScroll}>
      <View style={[styles.brainCircle, { backgroundColor: `${meta.color || '#7c3aed'}22` }]}> 
        <MaterialCommunityIcons name={meta.icon || 'brain'} size={40} color={meta.color || '#c8b8ff'} />
      </View>
      <Text style={styles.introTitle}>{meta.label}</Text>
      <Text style={styles.introSub}>{meta.desc}</Text>
      <View style={styles.infoCard}>
        <Text style={styles.infoLabel}>BEFORE YOU START</Text>
        {instructions.map((line, index) => (
          <Text key={line} style={styles.instructionLine}>{index + 1}. {line}</Text>
        ))}
      </View>
      <TouchableOpacity style={styles.primaryBtn} onPress={onBegin} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Begin {meta.label}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onBack} activeOpacity={0.7}>
        <Text style={styles.linkText}>Back to Test List</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function MemoryTest({ onDone, onCancel }) {
  const basePairsRef = useRef(WORDSETS[0]);
  const answerRef = useRef('');
  const [stage, setStage] = useState('study');
  const [pairs, setPairs] = useState(() => shuffle(basePairsRef.current));
  const [studyIdx, setStudyIdx] = useState(0);
  const [cueIdx, setCueIdx] = useState(0);
  const [cueOrder, setCueOrder] = useState(() => shuffle(basePairsRef.current.map((_, index) => index)));
  const [round, setRound] = useState(1);
  const [answer, setAnswer] = useState('');
  const [currentCorrect, setCurrentCorrect] = useState(0);
  const [roundScores, setRoundScores] = useState([]);
  const [answerSeconds, setAnswerSeconds] = useState(MEMORY_ANSWER_MS / 1000);
  const startRef = useRef(Date.now());
  const studyTimerRef = useRef(null);
  const answerTimerRef = useRef(null);
  const answerTickRef = useRef(null);

  const cleanupAnswerTimers = useCallback(() => {
    clearTimeout(answerTimerRef.current);
    clearInterval(answerTickRef.current);
  }, []);

  useEffect(() => {
    answerRef.current = answer;
  }, [answer]);

  const beginStudyRound = useCallback((nextRound, nextScores = roundScores) => {
    cleanupAnswerTimers();
    clearTimeout(studyTimerRef.current);
    setPairs(shuffle(basePairsRef.current));
    setRound(nextRound);
    setRoundScores(nextScores);
    setStudyIdx(0);
    setCueIdx(0);
    setCurrentCorrect(0);
    setAnswer('');
    setStage('study');
  }, [cleanupAnswerTimers, roundScores]);

  const finishCue = useCallback((submittedAnswer = answerRef.current) => {
    cleanupAnswerTimers();
    const pairIndex = cueOrder[cueIdx];
    const expected = pairs[pairIndex]?.[1];
    const isCorrect = normalize(submittedAnswer) === normalize(expected);
    const nextCorrect = currentCorrect + (isCorrect ? 1 : 0);

    if (cueIdx < pairs.length - 1) {
      setCurrentCorrect(nextCorrect);
      setCueIdx((current) => current + 1);
      setAnswer('');
      setAnswerSeconds(MEMORY_ANSWER_MS / 1000);
      return;
    }

    const nextScores = [...roundScores, nextCorrect];
    if (round < MEMORY_ROUNDS) {
      beginStudyRound(round + 1, nextScores);
      return;
    }

    const total = nextScores.reduce((sum, score) => sum + score, 0);
    const duration = (Date.now() - startRef.current) / 1000;
    onDone('memory', total, 'correct', duration);
  }, [beginStudyRound, cleanupAnswerTimers, cueIdx, cueOrder, currentCorrect, onDone, pairs, round, roundScores]);

  useEffect(() => {
    if (stage !== 'study') return undefined;

    studyTimerRef.current = setTimeout(() => {
      if (studyIdx < pairs.length - 1) {
        setStudyIdx((current) => current + 1);
        return;
      }

      setCueOrder(shuffle(pairs.map((_, index) => index)));
      setCueIdx(0);
      setAnswer('');
      setAnswerSeconds(MEMORY_ANSWER_MS / 1000);
      setStage('recall');
    }, MEMORY_STUDY_MS);

    return () => clearTimeout(studyTimerRef.current);
  }, [pairs, stage, studyIdx]);

  useEffect(() => {
    if (stage !== 'recall') return undefined;

    setAnswerSeconds(MEMORY_ANSWER_MS / 1000);
    answerTickRef.current = setInterval(() => {
      setAnswerSeconds((current) => Math.max(0, current - 1));
    }, 1000);
    answerTimerRef.current = setTimeout(() => finishCue(''), MEMORY_ANSWER_MS);

    return cleanupAnswerTimers;
  }, [cleanupAnswerTimers, cueIdx, finishCue, stage]);

  useEffect(() => () => {
    clearTimeout(studyTimerRef.current);
    cleanupAnswerTimers();
  }, [cleanupAnswerTimers]);

  const studyPct = Math.round(((studyIdx + 1) / pairs.length) * 100);
  const cuePair = pairs[cueOrder[cueIdx]] ?? pairs[0];
  const canSubmitAnswer = answer.trim().length > 0;

  if (stage === 'study') {
    return (
      <View style={styles.testBody}>
        <Text style={styles.testStage}>Study the pairs - Round {round} of {MEMORY_ROUNDS}</Text>
        <Text style={styles.testCounter}>{studyIdx + 1} / {pairs.length}</Text>
        <View style={styles.progressBarWide}>
          <View style={[styles.progressFill, { width: `${studyPct}%` }]} />
        </View>
        <View style={styles.pairBox}>
          <Text style={styles.pairWord}>{pairs[studyIdx][0]}</Text>
          <Feather name="arrow-right" size={24} color="#6c7094" />
          <Text style={styles.pairWord}>{pairs[studyIdx][1]}</Text>
        </View>
        <Text style={styles.helperText}>Each pair appears for 3 seconds.</Text>
        <BackToTestsButton onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={styles.testBody}>
      <Text style={styles.testStage}>Round {round} recall</Text>
      <Text style={styles.testCounter}>Cue {cueIdx + 1} / {pairs.length} · {answerSeconds}s left</Text>
      <Text style={styles.cueWord}>{cuePair[0]}</Text>
      <TextInput
        style={styles.input}
        value={answer}
        onChangeText={setAnswer}
        placeholder="Type the matching word"
        placeholderTextColor="#4a5270"
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={() => canSubmitAnswer && finishCue(answer)}
        returnKeyType="done"
      />
      <TouchableOpacity
        style={[styles.primaryBtn, !canSubmitAnswer && styles.primaryBtnDisabled]}
        onPress={() => canSubmitAnswer && finishCue(answer)}
        disabled={!canSubmitAnswer}
        activeOpacity={0.85}
      >
        <Text style={styles.primaryBtnText}>Submit Answer</Text>
      </TouchableOpacity>
      <Text style={styles.helperText}>Scores: {roundScores.length ? roundScores.join(' / ') : 'No completed rounds yet'}</Text>
      <BackToTestsButton onPress={onCancel} />
    </View>
  );
}

function StroopTest({ onDone, onCancel }) {
  const [phase, setPhase] = useState('congruent');
  const [trial, setTrial] = useState(() => createStroopTrial('congruent'));
  const [secondsLeft, setSecondsLeft] = useState(STROOP_PHASE_SECONDS);
  const [congruentScore, setCongruentScore] = useState(0);
  const [incongruentScore, setIncongruentScore] = useState(0);
  const [paused, setPaused] = useState(false);
  const startRef = useRef(Date.now());
  const phaseRef = useRef('congruent');

  const finishStroop = useCallback(() => {
    const total = congruentScore + incongruentScore;
    const duration = (Date.now() - startRef.current) / 1000;
    onDone('stroop', total, 'correct', duration);
  }, [congruentScore, incongruentScore, onDone]);

  useEffect(() => {
    if (paused) return undefined;

    const timer = setInterval(() => {
      setSecondsLeft((current) => {
        if (current > 1) return current - 1;

        clearInterval(timer);
        if (phaseRef.current === 'congruent') {
          setPaused(true);
        } else {
          finishStroop();
        }
        return 0;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [finishStroop, paused]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    function handleKeyDown(event) {
      const map = { r: 'red', b: 'blue', g: 'green', y: 'yellow' };
      const chosen = map[event.key?.toLowerCase()];
      if (chosen && !paused) pick(chosen);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  function continueToIncongruent() {
    phaseRef.current = 'incongruent';
    setPhase('incongruent');
    setTrial(createStroopTrial('incongruent'));
    setSecondsLeft(STROOP_PHASE_SECONDS);
    setPaused(false);
  }

  function pick(color) {
    if (paused || secondsLeft <= 0) return;

    if (color === trial.ink) {
      if (phase === 'congruent') setCongruentScore((current) => current + 1);
      else setIncongruentScore((current) => current + 1);
    }

    setTrial(createStroopTrial(phase));
  }

  if (paused) {
    return (
      <View style={styles.testBody}>
        <Text style={styles.testStage}>Congruent Phase Complete</Text>
        <Text style={styles.introSub}>Correct: {congruentScore}. Next is the incongruent phase.</Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={continueToIncongruent} activeOpacity={0.85}>
          <Text style={styles.primaryBtnText}>Continue</Text>
        </TouchableOpacity>
        <BackToTestsButton onPress={onCancel} />
      </View>
    );
  }

  return (
    <View style={styles.testBody}>
      <Text style={styles.testStage}>{phase === 'congruent' ? 'Congruent' : 'Incongruent'} Stroop</Text>
      <Text style={styles.testCounter}>Time left: {secondsLeft}s · Correct: {phase === 'congruent' ? congruentScore : incongruentScore}</Text>
      <Text style={[styles.stroopWord, { color: STROOP_COLORS[trial.ink] }]}>{trial.word.toUpperCase()}</Text>
      <Text style={styles.helperText}>Tap the ink color, not the word. Web keys: R, B, G, Y.</Text>
      <View style={styles.stroopBtns}>
        {STROOP_COLOR_NAMES.map((color) => (
          <TouchableOpacity
            key={color}
            style={[styles.stroopBtn, { backgroundColor: STROOP_COLORS[color] }]}
            onPress={() => pick(color)}
            activeOpacity={0.8}
          >
            <Text style={styles.stroopBtnText}>{color.toUpperCase()}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <BackToTestsButton onPress={onCancel} />
    </View>
  );
}

function DigitSpanTest({ onDone, onCancel }) {
  const [currentLen, setCurrentLen] = useState(DIGIT_START_LEN);
  const [trialCount, setTrialCount] = useState(0);
  const [failuresAtLen, setFailuresAtLen] = useState(0);
  const [best, setBest] = useState(0);
  const [sequence, setSequence] = useState(() => generateDigitSequence(DIGIT_START_LEN));
  const [visibleDigit, setVisibleDigit] = useState('Get ready');
  const [showing, setShowing] = useState(true);
  const [answer, setAnswer] = useState('');
  const [answerSeconds, setAnswerSeconds] = useState(DIGIT_ANSWER_SECONDS);
  const startRef = useRef(Date.now());
  const answerTimerRef = useRef(null);
  const answerTickRef = useRef(null);
  const displayTimersRef = useRef([]);
  const stateRef = useRef({ currentLen, trialCount, failuresAtLen, best, sequence, answer });

  useEffect(() => {
    stateRef.current = { currentLen, trialCount, failuresAtLen, best, sequence, answer };
  }, [answer, best, currentLen, failuresAtLen, sequence, trialCount]);

  const clearDigitTimers = useCallback(() => {
    displayTimersRef.current.forEach(clearTimeout);
    displayTimersRef.current = [];
    clearTimeout(answerTimerRef.current);
    clearInterval(answerTickRef.current);
  }, []);

  const finishDigitSpan = useCallback((finalBest = stateRef.current.best) => {
    clearDigitTimers();
    const duration = (Date.now() - startRef.current) / 1000;
    onDone('digit_span', finalBest, 'digits', duration);
  }, [clearDigitTimers, onDone]);

  const beginTrial = useCallback((length) => {
    clearDigitTimers();
    const nextSequence = generateDigitSequence(length);
    setSequence(nextSequence);
    setAnswer('');
    setShowing(true);
    setAnswerSeconds(DIGIT_ANSWER_SECONDS);
    setVisibleDigit('Get ready');

    let delay = 500;
    nextSequence.forEach((digit) => {
      displayTimersRef.current.push(setTimeout(() => setVisibleDigit(String(digit)), delay));
      delay += DIGIT_DISPLAY_MS;
      displayTimersRef.current.push(setTimeout(() => setVisibleDigit(''), delay));
      delay += DIGIT_GAP_MS;
    });

    displayTimersRef.current.push(setTimeout(() => {
      setVisibleDigit('NOW');
      setShowing(false);
      answerTickRef.current = setInterval(() => {
        setAnswerSeconds((current) => Math.max(0, current - 1));
      }, 1000);
      answerTimerRef.current = setTimeout(() => submitDigitAnswer(''), DIGIT_ANSWER_SECONDS * 1000);
    }, delay));
  }, [clearDigitTimers]);

  const submitDigitAnswer = useCallback((rawValue = stateRef.current.answer) => {
    const snapshot = stateRef.current;

    clearTimeout(answerTimerRef.current);
    clearInterval(answerTickRef.current);

    const user = rawValue.replace(/\s+/g, '').split('').map(Number).filter((num) => !Number.isNaN(num));
    const correct = [...snapshot.sequence].sort((a, b) => a - b);
    const isCorrect = user.length > 0 && arraysEqual(user, correct);
    const nextBest = isCorrect ? Math.max(snapshot.best, snapshot.currentLen) : snapshot.best;
    const nextTrialCount = snapshot.trialCount + 1;
    const nextFailures = isCorrect ? 0 : snapshot.failuresAtLen + 1;

    setBest(nextBest);

    if (nextTrialCount >= DIGIT_TRIALS_PER_LEN) {
      if (nextFailures >= DIGIT_TRIALS_PER_LEN || snapshot.currentLen >= DIGIT_MAX_LEN) {
        finishDigitSpan(nextBest);
        return;
      }

      const nextLen = snapshot.currentLen + 1;
      setCurrentLen(nextLen);
      setTrialCount(0);
      setFailuresAtLen(0);
      setVisibleDigit('Get ready');
      setTimeout(() => beginTrial(nextLen), DIGIT_INTER_TRIAL_MS);
      return;
    }

    setTrialCount(nextTrialCount);
    setFailuresAtLen(nextFailures);
    setVisibleDigit('Get ready');
    setTimeout(() => beginTrial(snapshot.currentLen), DIGIT_INTER_TRIAL_MS);
  }, [beginTrial, clearDigitTimers, finishDigitSpan]);

  useEffect(() => {
    beginTrial(DIGIT_START_LEN);
    return clearDigitTimers;
  }, [beginTrial, clearDigitTimers]);

  return (
    <View style={styles.testBody}>
      <Text style={styles.testStage}>Digit Span Sequencing</Text>
      <Text style={styles.testCounter}>Length {currentLen} · Trial {(trialCount % DIGIT_TRIALS_PER_LEN) + 1} of {DIGIT_TRIALS_PER_LEN} · Best {best}</Text>
      <View style={styles.digitBox}>
        <Text style={styles.digitBig}>{visibleDigit || ' '}</Text>
        <Text style={styles.testDesc}>
          {showing ? 'Watch the digits one at a time' : `Type them in ascending order · ${answerSeconds}s left`}
        </Text>
      </View>
      {!showing && (
        <>
          <TextInput
            style={styles.input}
            value={answer}
            onChangeText={setAnswer}
            placeholder="Smallest to largest, e.g. 138"
            placeholderTextColor="#4a5270"
            keyboardType="number-pad"
            onSubmitEditing={() => submitDigitAnswer(answer)}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.primaryBtn} onPress={() => submitDigitAnswer(answer)} activeOpacity={0.85}>
            <Text style={styles.primaryBtnText}>Submit Sequence</Text>
          </TouchableOpacity>
        </>
      )}
      <BackToTestsButton onPress={onCancel} />
    </View>
  );
}

function ReactionTest({ onDone, onCancel }) {
  const [trial, setTrial] = useState(0);
  const [targetVisible, setTargetVisible] = useState(false);
  const [times, setTimes] = useState([]);
  const [message, setMessage] = useState('Wait for the target');
  const startRef = useRef(Date.now());
  const targetStartRef = useRef(0);
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);
  const trialRef = useRef(0);
  const timesRef = useRef([]);

  const clearReactionTimers = useCallback(() => {
    clearTimeout(showTimerRef.current);
    clearTimeout(hideTimerRef.current);
  }, []);

  const finishReaction = useCallback((finalTimes = timesRef.current) => {
    clearReactionTimers();
    const average = finalTimes.length
      ? Math.round(finalTimes.reduce((sum, time) => sum + time, 0) / finalTimes.length)
      : 0;
    const duration = (Date.now() - startRef.current) / 1000;
    onDone('reaction', average, average > 0 ? 'ms' : 'N/A', duration);
  }, [clearReactionTimers, onDone]);

  const scheduleTrial = useCallback((nextTrial) => {
    clearReactionTimers();
    trialRef.current = nextTrial;
    setTrial(nextTrial);
    setTargetVisible(false);
    setMessage('Wait for the target');

    const delay = 3000 + Math.random() * 500;
    showTimerRef.current = setTimeout(() => {
      targetStartRef.current = Date.now();
      setTargetVisible(true);
      setMessage('Tap the target');

      const hideDelay = 3000 + Math.random() * 500;
      hideTimerRef.current = setTimeout(() => {
        setTargetVisible(false);
        setMessage('Missed. Get ready.');
        const followingTrial = nextTrial + 1;
        if (followingTrial >= RT_TRIALS) {
          finishReaction(timesRef.current);
        } else {
          scheduleTrial(followingTrial);
        }
      }, hideDelay);
    }, delay);
  }, [clearReactionTimers, finishReaction]);

  const recordResponse = useCallback(() => {
    if (!targetVisible) return;

    const reactionMs = Date.now() - targetStartRef.current;
    const nextTimes = [...timesRef.current, reactionMs];
    timesRef.current = nextTimes;
    setTimes(nextTimes);
    setTargetVisible(false);
    clearTimeout(hideTimerRef.current);
    setMessage(`${Math.round(reactionMs)} ms`);

    const nextTrial = trialRef.current + 1;
    if (nextTrial >= RT_TRIALS) {
      finishReaction(nextTimes);
      return;
    }

    setTimeout(() => scheduleTrial(nextTrial), 700);
  }, [finishReaction, scheduleTrial, targetVisible]);

  useEffect(() => {
    scheduleTrial(0);
    return clearReactionTimers;
  }, [clearReactionTimers, scheduleTrial]);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    function handleKeyDown(event) {
      if (event.code === 'Space' && !event.repeat) {
        event.preventDefault();
        recordResponse();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [recordResponse]);

  return (
    <View style={styles.testBody}>
      <Text style={styles.testStage}>Reaction Time</Text>
      <Text style={styles.testCounter}>Trial {Math.min(trial + 1, RT_TRIALS)} / {RT_TRIALS} · Responses {times.length}</Text>
      <TouchableOpacity style={styles.reactionArea} onPress={recordResponse} activeOpacity={1}>
        {targetVisible ? (
          <View style={styles.reactionBall}>
            <Text style={styles.reactionBallText}>Tap</Text>
          </View>
        ) : (
          <Text style={styles.reactionText}>{message}</Text>
        )}
      </TouchableOpacity>
      <Text style={styles.helperText}>Tap the target when it appears. Web users can press Space.</Text>
      <BackToTestsButton onPress={onCancel} />
    </View>
  );
}

function BackToTestsButton({ onPress }) {
  return (
    <TouchableOpacity style={styles.secondaryBtn} onPress={onPress} activeOpacity={0.7}>
      <Feather name="grid" size={15} color="#c8b8ff" />
      <Text style={styles.secondaryBtnText}>Back to Tests</Text>
    </TouchableOpacity>
  );
}

function Done({ onHome }) {
  return (
    <View style={styles.testBody}>
      <View style={styles.brainCircle}>
        <Feather name="check" size={40} color="#00c9b1" />
      </View>
      <Text style={styles.introTitle}>All Tests Complete</Text>
      <Text style={styles.introSub}>Your results have been saved securely.</Text>
      <TouchableOpacity style={styles.primaryBtn} onPress={onHome} activeOpacity={0.85}>
        <Text style={styles.primaryBtnText}>Back to Report</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 0, backgroundColor: '#030827', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  safeBottom: { flex: 1, backgroundColor: '#030A31' },
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a40',
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: '#fff', fontSize: 17, fontWeight: '800' },
  headerSpacer: { width: 40 },
  introScroll: { padding: 20, alignItems: 'center', paddingBottom: 36 },
  brainCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1a1060',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  introTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 16, textAlign: 'center' },
  introSub: { color: '#8c91b5', fontSize: 13, textAlign: 'center', marginVertical: 16, lineHeight: 20 },
  infoCard: {
    backgroundColor: 'rgba(124,58,237,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.35)',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 12,
  },
  infoLabel: { color: '#a78bfa', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  infoBody: { color: '#c4b5fd', fontSize: 13, lineHeight: 20 },
  instructionLine: { color: '#c4b5fd', fontSize: 13, lineHeight: 21, marginBottom: 8 },
  lockCard: { backgroundColor: '#1f1a10', borderWidth: 1, borderColor: '#ffb83066', borderRadius: 14, padding: 16, width: '100%', alignItems: 'center', marginVertical: 12 },
  lockTitle: { color: '#ffb830', fontSize: 15, fontWeight: '800', marginTop: 8, textAlign: 'center' },
  lockText: { color: '#c9bdd9', fontSize: 13, lineHeight: 19, marginTop: 6, textAlign: 'center' },
  secondaryFullBtn: { width: '100%', minHeight: 46, borderRadius: 12, borderWidth: 1, borderColor: '#7c3aed77', backgroundColor: '#7c3aed22', alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  secondaryFullBtnText: { color: '#c8b8ff', fontSize: 14, fontWeight: '800' },
  warnCard: {
    backgroundColor: '#0d1030',
    borderWidth: 1,
    borderColor: '#1f254f',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 8,
  },
  warnLabel: { color: '#ffb830', fontSize: 11, fontWeight: '700', marginBottom: 6 },
  warnBody: { color: '#8c91b5', fontSize: 12, lineHeight: 18 },
  hubScroll: { padding: 20, paddingBottom: 36 },
  hubProgress: { color: '#c8b8ff', fontSize: 14, fontWeight: '700', marginBottom: 8 },
  progressBar: { height: 6, backgroundColor: '#1a1a40', borderRadius: 3, marginBottom: 20, overflow: 'hidden' },
  progressBarWide: { width: '100%', height: 6, backgroundColor: '#1a1a40', borderRadius: 3, marginBottom: 24, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: '#7c3aed', borderRadius: 3 },
  summaryCard: {
    backgroundColor: '#101538',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#1f254f',
    padding: 14,
    marginBottom: 16,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  summaryTitle: { color: '#fff', fontSize: 15, fontWeight: '800', marginBottom: 12 },
  summaryError: { color: '#ffb830', fontSize: 12, marginBottom: 10, lineHeight: 17 },
  bestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bestTile: {
    width: '48%',
    minHeight: 90,
    borderRadius: 12,
    backgroundColor: '#0d1030',
    borderWidth: 1,
    borderColor: '#1f254f',
    padding: 10,
  },
  bestLabel: { color: '#8c91b5', fontSize: 10, fontWeight: '700', marginTop: 8, minHeight: 28 },
  bestValue: { color: '#fff', fontSize: 15, fontWeight: '800', marginTop: 4 },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1f254f',
  },
  resultIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  resultTextWrap: { flex: 1 },
  resultLabel: { color: '#e5e7ff', fontSize: 13, fontWeight: '700' },
  resultDate: { color: '#6c7094', fontSize: 11, marginTop: 2 },
  resultScore: { color: '#c8b8ff', fontSize: 13, fontWeight: '800' },
  emptyResultsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  emptyResultsText: { color: '#6c7094', fontSize: 12, lineHeight: 18 },
  testCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#161b3d',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#1f254f',
  },
  testCardDone: { opacity: 0.7, borderColor: '#00c9b1' },
  testIcon: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  testCardContent: { flex: 1 },
  testLabel: { color: '#fff', fontSize: 15, fontWeight: '700' },
  testDesc: { color: '#6c7094', fontSize: 12, marginTop: 2 },
  testBody: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  testStage: { color: '#fff', fontSize: 18, fontWeight: '800', textAlign: 'center', marginBottom: 6 },
  testCounter: { color: '#6c7094', fontSize: 13, marginBottom: 30 },
  helperText: { color: '#8c91b5', fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 8, marginBottom: 6 },
  pairBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: '#161b3d',
    borderRadius: 16,
    paddingVertical: 30,
    paddingHorizontal: 24,
    marginBottom: 30,
  },
  pairWord: { color: '#c8b8ff', fontSize: 26, fontWeight: '800' },
  cueWord: { color: '#fff', fontSize: 30, fontWeight: '900', marginBottom: 24, textAlign: 'center' },
  input: {
    width: '100%',
    backgroundColor: '#0d1030',
    borderWidth: 1.5,
    borderColor: '#7c3aed',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    textAlign: 'center',
  },
  stroopWord: { fontSize: 52, fontWeight: '900', marginBottom: 40, letterSpacing: 0 },
  stroopBtns: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 12 },
  stroopBtn: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 12, minWidth: 100, alignItems: 'center' },
  stroopBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  digitBox: { alignItems: 'center', marginBottom: 30 },
  digitBig: { color: '#7c3aed', fontSize: 80, fontWeight: '900', marginBottom: 12 },
  reactionArea: {
    width: '100%',
    height: 260,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#d8ddf0',
  },
  reactionText: { color: '#161b3d', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  reactionBall: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#ff5c9a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reactionBallText: { color: '#fff', fontSize: 16, fontWeight: '900' },
  primaryBtn: {
    width: '100%',
    backgroundColor: '#7c3aed',
    borderRadius: 12,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  primaryBtnDisabled: { backgroundColor: '#3a2070', opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#7c3aed55',
    backgroundColor: '#161b3d',
    marginTop: 8,
  },
  secondaryBtnText: { color: '#c8b8ff', fontSize: 13, fontWeight: '700' },
  linkText: { color: '#6c7094', fontSize: 13, textAlign: 'center', marginTop: 8 },
});
