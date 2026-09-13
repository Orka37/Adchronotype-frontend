import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Linking, Modal, Platform, SafeAreaView, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import ConfirmationModal from '../components/ConfirmationModal';
import { useAuth } from '../context/AuthContext';
import { useCaregiverRequestCount } from '../hooks/useCaregiverRequestCount';
import {
  acceptCarePatientInvitation, cancelCarePatientInvitation, createCarePatient,
  createCarePatientEvent, createCarePatientHandoffNote, declineCarePatientInvitation,
  deleteCarePatientHandoffNote, getCarePatientEvents, getCarePatientHandoffNotes,
  getCarePatientDailySummaries, getCarePatientInvitations, getCarePatientMembers, getCarePatients,
  getCarePatientRoutine, getIncomingCarePatientInvitations, inviteCarePatientHelper,
  revokeCarePatientMember, saveCarePatientRoutine, updateCarePatient,
  updateCarePatientHandoffNote,
  createCaregiverWellnessCheckIn, getCaregiverWellnessSummary,
  createCarePatientMedicationSchedule, getCarePatientMedicationSchedules,
  createCarePatientMedicationLog, getCarePatientMedicationLogs,
} from '../api/caregivers';

const EVENT_TYPES = [
  { key: 'slept', label: 'Slept', icon: 'moon', tint: '#E07B3C' },
  { key: 'woke', label: 'Woke', icon: 'sunrise', tint: '#f3aa3d' },
  { key: 'napped', label: 'Napped', icon: 'cloud', tint: '#57a7d9' },
  { key: 'agitated', label: 'Agitated', icon: 'alert-circle', tint: '#ef776d' },
];
const HANDOFF_TAGS = ['calm', 'agitated', 'ate well', 'slept', 'music helped', 'refused meal'];

const messageFrom = error => error?.response?.data?.detail || error?.message || 'Something went wrong. Please try again.';
const eventLabel = key => [...EVENT_TYPES, { key: 'other', label: 'Other' }].find(item => item.key === key)?.label || 'Event';
const timeLabel = value => new Date(value).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

function tonightWindow(now = new Date()) {
  const start = new Date(now);
  if (start.getHours() < 18) start.setDate(start.getDate() - 1);
  start.setHours(18, 0, 0, 0);
  return { start, end: now };
}

export default function CaregiverScreen({ navigation }) {
  const { user } = useAuth();
  const [patients, setPatients] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [members, setMembers] = useState([]);
  const [pending, setPending] = useState([]);
  const [events, setEvents] = useState([]);
  const [routine, setRoutine] = useState(null);
  const [handoffNotes, setHandoffNotes] = useState([]);
  const [dailySummaries, setDailySummaries] = useState(null);
  const [wellness, setWellness] = useState(null);
  const [medications, setMedications] = useState([]);
  const [medicationLogs, setMedicationLogs] = useState([]);
  const [wellnessForm, setWellnessForm] = useState({ feeling: 'okay', sleepHours: '', broken_night: false, note: '' });
  const [medicationOpen, setMedicationOpen] = useState(false);
  const [medicationForm, setMedicationForm] = useState({ name: '', instructions: '', window_start: '08:00', window_end: '09:00', clinician_confirmed: false });
  const [routineForm, setRoutineForm] = useState({ usual_bedtime: '22:00', usual_wake_time: '07:00', nap_start_time: '', nap_end_time: '', notes: '' });
  const [view, setView] = useState('log');
  const [newPatientName, setNewPatientName] = useState('');
  const [patientName, setPatientName] = useState('');
  const [inviteTarget, setInviteTarget] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [customType, setCustomType] = useState('other');
  const [customTime, setCustomTime] = useState(new Date());
  const [customNote, setCustomNote] = useState('');
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffTags, setHandoffTags] = useState([]);
  const [handoffText, setHandoffText] = useState('');
  const [editingHandoff, setEditingHandoff] = useState(null);
  const [deleteHandoff, setDeleteHandoff] = useState(null);
  const requestCount = useCaregiverRequestCount();

  const selected = patients.find(item => item.id === selectedId);
  const isPrimary = selected?.my_role === 'primary';
  const tonightEvents = useMemo(() => {
    const { start, end } = tonightWindow();
    return events.filter(item => {
      const time = new Date(item.event_time);
      return time >= start && time <= end;
    }).sort((a, b) => new Date(a.event_time) - new Date(b.event_time));
  }, [events]);

  const loadPatientDetails = useCallback(async patient => {
    if (!patient) {
      setMembers([]); setPending([]); setEvents([]); setRoutine(null); setHandoffNotes([]); setDailySummaries(null); setWellness(null); setMedications([]); setMedicationLogs([]); setPatientName('');
      return;
    }
    const [memberRows, eventRows, routineRow, handoffRows, summaryRows, wellnessRow, medicationRows, medicationLogRows] = await Promise.all([
      getCarePatientMembers(patient.id), getCarePatientEvents(patient.id, { limit: 250 }),
      getCarePatientRoutine(patient.id), getCarePatientHandoffNotes(patient.id, { limit: 250 }),
      getCarePatientDailySummaries(patient.id, 7),
      getCaregiverWellnessSummary(7), getCarePatientMedicationSchedules(patient.id),
      getCarePatientMedicationLogs(patient.id, 100),
    ]);
    setMembers(memberRows);
    setEvents(eventRows);
    setRoutine(routineRow);
    setHandoffNotes(handoffRows);
    setDailySummaries(summaryRows);
    setWellness(wellnessRow); setMedications(medicationRows); setMedicationLogs(medicationLogRows);
    setRoutineForm(routineRow ? {
      usual_bedtime: routineRow.usual_bedtime, usual_wake_time: routineRow.usual_wake_time,
      nap_start_time: routineRow.nap_start_time || '', nap_end_time: routineRow.nap_end_time || '', notes: routineRow.notes || '',
    } : { usual_bedtime: '22:00', usual_wake_time: '07:00', nap_start_time: '', nap_end_time: '', notes: '' });
    setPatientName(patient.display_name);
    setPending(patient.my_role === 'primary' ? await getCarePatientInvitations(patient.id) : []);
  }, []);

  const refresh = useCallback(async (showLoader = true, preferredId = selectedId) => {
    if (showLoader) setLoading(true);
    try {
      const [patientRows, invitationRows] = await Promise.all([getCarePatients(), getIncomingCarePatientInvitations()]);
      setPatients(patientRows); setIncoming(invitationRows);
      const next = patientRows.find(item => item.id === preferredId) || patientRows[0] || null;
      setSelectedId(next?.id || null);
      await loadPatientDetails(next);
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) });
    } finally { setLoading(false); }
  }, [loadPatientDetails, selectedId]);

  useEffect(() => { refresh(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function perform(action, successText, preferredId = selectedId) {
    setBusy(true); setNotice(null);
    try {
      await action();
      setNotice({ type: 'success', text: successText });
      await refresh(false, preferredId);
      return true;
    } catch (error) {
      setNotice({ type: 'error', text: messageFrom(error) });
      return false;
    } finally { setBusy(false); }
  }

  async function createPatient() {
    const name = newPatientName.trim();
    if (!name) return setNotice({ type: 'error', text: 'Enter a name for the care record.' });
    setBusy(true); setNotice(null);
    try {
      const patient = await createCarePatient(name);
      setNewPatientName(''); setView('log');
      setNotice({ type: 'success', text: 'Care record created.' });
      await refresh(false, patient.id);
    } catch (error) { setNotice({ type: 'error', text: messageFrom(error) }); }
    finally { setBusy(false); }
  }

  async function selectPatient(patient) {
    setSelectedId(patient.id); setLoading(true); setNotice(null); setView('log');
    try { await loadPatientDetails(patient); }
    catch (error) { setNotice({ type: 'error', text: messageFrom(error) }); }
    finally { setLoading(false); }
  }

  async function logNow(type) {
    const when = new Date();
    await perform(
      () => createCarePatientEvent(selectedId, type, when.toISOString()),
      `${eventLabel(type)} logged at ${timeLabel(when)}.`,
    );
  }

  async function saveCustomEvent() {
    if (customTime > new Date()) return setNotice({ type: 'error', text: 'Choose a time that is not in the future.' });
    const ok = await perform(
      () => createCarePatientEvent(selectedId, customType, customTime.toISOString(), customNote),
      `${eventLabel(customType)} logged at ${timeLabel(customTime)}.`,
    );
    if (ok) { setCustomOpen(false); setCustomType('other'); setCustomTime(new Date()); setCustomNote(''); }
  }

  async function inviteHelper() {
    const target = inviteTarget.trim();
    if (!target) return setNotice({ type: 'error', text: 'Enter a username or email address.' });
    const ok = await perform(() => inviteCarePatientHelper(selectedId, target), 'Helper invitation sent.');
    if (ok) setInviteTarget('');
  }

  async function saveRoutine() {
    const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timePattern.test(routineForm.usual_bedtime) || !timePattern.test(routineForm.usual_wake_time)) {
      return setNotice({ type: 'error', text: 'Enter bedtime and wake time as HH:MM, for example 22:00.' });
    }
    if (Boolean(routineForm.nap_start_time) !== Boolean(routineForm.nap_end_time)) {
      return setNotice({ type: 'error', text: 'Enter both nap times, or leave both blank.' });
    }
    if ((routineForm.nap_start_time && !timePattern.test(routineForm.nap_start_time)) || (routineForm.nap_end_time && !timePattern.test(routineForm.nap_end_time))) {
      return setNotice({ type: 'error', text: 'Enter nap times as HH:MM.' });
    }
    await perform(() => saveCarePatientRoutine(selectedId, {
      ...routineForm,
      nap_start_time: routineForm.nap_start_time || null,
      nap_end_time: routineForm.nap_end_time || null,
      notes: routineForm.notes.trim() || null,
    }), 'Routine saved.');
  }

  function openHandoff(note = null) {
    setEditingHandoff(note);
    setHandoffTags(note?.tags || []);
    setHandoffText(note?.note || '');
    setHandoffOpen(true);
  }

  async function saveHandoff() {
    if (!handoffTags.length && !handoffText.trim()) return setNotice({ type: 'error', text: 'Choose a tag or add a short note.' });
    const action = editingHandoff
      ? () => updateCarePatientHandoffNote(selectedId, editingHandoff.id, handoffTags, handoffText)
      : () => createCarePatientHandoffNote(selectedId, handoffTags, handoffText);
    const ok = await perform(action, editingHandoff ? 'Handoff note updated.' : 'Handoff note shared with the care team.');
    if (ok) { setHandoffOpen(false); setEditingHandoff(null); setHandoffTags([]); setHandoffText(''); }
  }

  async function saveWellness() {
    const hours = wellnessForm.sleepHours.trim() === '' ? null : Number(wellnessForm.sleepHours);
    if (hours != null && (!Number.isFinite(hours) || hours < 0 || hours > 24)) return setNotice({ type: 'error', text: 'Sleep must be between 0 and 24 hours.' });
    const ok = await perform(() => createCaregiverWellnessCheckIn({
      feeling: wellnessForm.feeling, sleep_minutes: hours == null ? null : Math.round(hours * 60),
      broken_night: wellnessForm.broken_night, note: wellnessForm.note.trim() || null,
    }), 'Your private check-in was saved.');
    if (ok) setWellnessForm({ feeling: 'okay', sleepHours: '', broken_night: false, note: '' });
  }

  async function saveMedication() {
    if (!medicationForm.name.trim()) return setNotice({ type: 'error', text: 'Enter the medication name from the clinician-set schedule.' });
    if (!medicationForm.clinician_confirmed) return setNotice({ type: 'error', text: 'Confirm that a clinician established this schedule.' });
    const ok = await perform(() => createCarePatientMedicationSchedule(selectedId, medicationForm), 'Medication timing added.');
    if (ok) { setMedicationOpen(false); setMedicationForm({ name: '', instructions: '', window_start: '08:00', window_end: '09:00', clinician_confirmed: false }); }
  }

  async function markMedication(schedule, status) {
    await perform(() => createCarePatientMedicationLog(selectedId, schedule.id, status), `${schedule.name} marked ${status}.`);
  }

  return <>
    <SafeAreaView style={styles.safeTop} />
    <SafeAreaView style={styles.safeBottom}>
      <View style={styles.root}>
        <LinearGradient colors={['#FDF6F0', '#FDF6F0']} style={StyleSheet.absoluteFillObject} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <TouchableOpacity accessibilityLabel="Back to home" style={styles.iconButton} onPress={() => navigation.navigate('Report')}><Feather name="chevron-left" size={26} color="#8A6A4E" /></TouchableOpacity>
            <View style={styles.headerText}><Text style={styles.heading}>{selected?.display_name || 'Caregiver'}</Text><Text style={styles.context}>{new Date().toLocaleDateString([], { weekday: 'long' })} · {new Date().getHours() < 18 ? 'day' : 'night'}</Text></View>
            <TouchableOpacity accessibilityLabel="Refresh caregiver data" style={styles.iconButton} onPress={() => refresh()} disabled={busy}><Feather name="refresh-cw" size={19} color="#F0955A" /></TouchableOpacity>
          </View>

          {notice && <View style={[styles.notice, notice.type === 'error' && styles.noticeError]}><Text style={styles.noticeText}>{notice.text}</Text></View>}

          {incoming.length > 0 && <Section title="Invitations for you">{incoming.map(invite => <View key={invite.id} style={styles.rowCard}><View style={styles.grow}><Text style={styles.rowTitle}>{invite.patient_name}</Text><Text style={styles.muted}>Helper access invitation</Text></View><SmallButton label="Decline" secondary disabled={busy} onPress={() => perform(() => declineCarePatientInvitation(invite.id), 'Invitation declined.')} /><SmallButton label="Accept" disabled={busy} onPress={() => perform(() => acceptCarePatientInvitation(invite.id), 'Invitation accepted.', invite.patient_id)} /></View>)}</Section>}

          {patients.length > 0 && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>{patients.map(patient => <TouchableOpacity key={patient.id} style={[styles.pill, patient.id === selectedId && styles.pillActive]} onPress={() => selectPatient(patient)}><Text style={[styles.pillText, patient.id === selectedId && styles.pillTextActive]}>{patient.display_name}</Text><Text style={styles.role}>{patient.my_role}</Text></TouchableOpacity>)}</ScrollView>}

          {loading ? <ActivityIndicator color="#E07B3C" style={styles.loader} /> : !selected ? <Section title="Set up a care record"><Text style={styles.mutedBlock}>Create the patient record that caregivers will use to log events and coordinate care.</Text><View style={styles.inputRow}><TextInput value={newPatientName} onChangeText={setNewPatientName} placeholder="Patient display name" placeholderTextColor="#8A6A4E" style={styles.input} editable={!busy} /><SmallButton label="Create" disabled={busy} onPress={createPatient} /></View></Section> : <>
            <View style={styles.sectionTabs}>
              <TouchableOpacity style={[styles.sectionTab, view === 'log' && styles.sectionTabActive]} onPress={() => setView('log')}><Feather name="edit-3" size={16} color={view === 'log' ? '#fff' : '#8A6A4E'} /><Text style={[styles.sectionTabText, view === 'log' && styles.sectionTabTextActive]}>Log</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.sectionTab, view === 'routine' && styles.sectionTabActive]} onPress={() => setView('routine')}><Feather name="moon" size={16} color={view === 'routine' ? '#fff' : '#8A6A4E'} /><Text style={[styles.sectionTabText, view === 'routine' && styles.sectionTabTextActive]}>Routine</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.sectionTab, view === 'shared' && styles.sectionTabActive]} onPress={() => setView('shared')}><Feather name="clipboard" size={16} color={view === 'shared' ? '#fff' : '#8A6A4E'} /><Text style={[styles.sectionTabText, view === 'shared' && styles.sectionTabTextActive]}>Shared</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.sectionTab, view === 'you' && styles.sectionTabActive]} onPress={() => setView('you')}><Feather name="heart" size={16} color={view === 'you' ? '#fff' : '#8A6A4E'} /><Text style={[styles.sectionTabText, view === 'you' && styles.sectionTabTextActive]}>You</Text></TouchableOpacity>
              <TouchableOpacity style={[styles.sectionTab, view === 'meds' && styles.sectionTabActive]} onPress={() => setView('meds')}><Feather name="clock" size={16} color={view === 'meds' ? '#fff' : '#8A6A4E'} /><Text style={[styles.sectionTabText, view === 'meds' && styles.sectionTabTextActive]}>Meds</Text></TouchableOpacity>
            </View>

            {view === 'log' ? <LogView busy={busy} events={tonightEvents} onLog={logNow} onCustom={() => { setCustomTime(new Date()); setCustomOpen(true); }} /> : view === 'routine' ? <RoutineView
              busy={busy} events={events} isPrimary={isPrimary} patientName={selected.display_name}
              routine={routine} summaries={dailySummaries} form={routineForm} setForm={setRoutineForm} onSave={saveRoutine}
            /> : view === 'shared' ? <SharedView
              events={events} isPrimary={isPrimary} members={members} notes={handoffNotes}
              userId={user?.id} onAdd={() => openHandoff()} onEdit={openHandoff} onDelete={setDeleteHandoff} onAccess={() => setView('access')}
            /> : view === 'you' ? <YouView busy={busy} summary={wellness} form={wellnessForm} setForm={setWellnessForm} onSave={saveWellness} /> : view === 'meds' ? <MedicationView
              busy={busy} isPrimary={isPrimary} schedules={medications} logs={medicationLogs} onAdd={() => setMedicationOpen(true)} onMark={markMedication}
            /> : <AccessView
              busy={busy} incoming={incoming} inviteTarget={inviteTarget} isPrimary={isPrimary} members={members}
              newPatientName={newPatientName} patientName={patientName} patients={patients} pending={pending}
              selected={selected} setInviteTarget={setInviteTarget} setNewPatientName={setNewPatientName}
              setPatientName={setPatientName} createPatient={createPatient} inviteHelper={inviteHelper}
              perform={perform} setRevokeTarget={setRevokeTarget}
            />}
          </>}
          <View style={{ height: 100 }} />
        </ScrollView>
        <BottomNav navigation={navigation} requestCount={requestCount} />
      </View>
    </SafeAreaView>

    <CustomEventModal visible={customOpen} busy={busy} eventType={customType} eventTime={customTime} note={customNote} onType={setCustomType} onTime={setCustomTime} onNote={setCustomNote} onCancel={() => setCustomOpen(false)} onSave={saveCustomEvent} />
    <HandoffNoteModal visible={handoffOpen} busy={busy} tags={handoffTags} note={handoffText} editing={Boolean(editingHandoff)} onTags={setHandoffTags} onNote={setHandoffText} onCancel={() => { setHandoffOpen(false); setEditingHandoff(null); }} onSave={saveHandoff} />
    <MedicationModal visible={medicationOpen} busy={busy} form={medicationForm} setForm={setMedicationForm} onCancel={() => setMedicationOpen(false)} onSave={saveMedication} />
    <ConfirmationModal visible={Boolean(revokeTarget)} danger busy={busy} title="Remove helper access?" message={`This will remove @${revokeTarget?.user?.username || 'this helper'} from ${selected?.display_name || 'this care record'}.`} confirmLabel="Remove" onCancel={() => setRevokeTarget(null)} onConfirm={async () => { const ok = await perform(() => revokeCarePatientMember(selectedId, revokeTarget.id), 'Helper access removed.'); if (ok) setRevokeTarget(null); }} />
    <ConfirmationModal visible={Boolean(deleteHandoff)} danger busy={busy} title="Delete handoff note?" message="This note will be removed from the shared care record for everyone." confirmLabel="Delete" onCancel={() => setDeleteHandoff(null)} onConfirm={async () => { const ok = await perform(() => deleteCarePatientHandoffNote(selectedId, deleteHandoff.id), 'Handoff note deleted.'); if (ok) setDeleteHandoff(null); }} />
  </>;
}

function LogView({ busy, events, onLog, onCustom }) {
  return <>
    <Text style={styles.prompt}>What happened?</Text>
    <View style={styles.eventGrid}>{EVENT_TYPES.map(item => <TouchableOpacity accessibilityLabel={`${item.label}, logs now`} disabled={busy} key={item.key} style={[styles.eventButton, busy && styles.disabled]} onPress={() => onLog(item.key)}><View style={[styles.eventIcon, { backgroundColor: `${item.tint}25` }]}><Feather name={item.icon} size={26} color={item.tint} /></View><Text style={styles.eventTitle}>{item.label}</Text><Text style={styles.eventHint}>logs now</Text></TouchableOpacity>)}</View>
    <TouchableOpacity style={styles.customButton} disabled={busy} onPress={onCustom}><Feather name="clock" size={18} color="#F0955A" /><Text style={styles.customButtonText}>Something else · set a different time</Text><Feather name="chevron-right" size={18} color="#8A6A4E" /></TouchableOpacity>
    <Section title="Tonight so far">
      {events.length === 0 ? <View style={styles.emptyState}><Feather name="moon" size={25} color="#8A6A4E" /><Text style={styles.empty}>No entries yet tonight — tap above when something happens.</Text></View> : events.map((event, index) => <View key={event.id} style={[styles.timelineRow, index === events.length - 1 && styles.timelineLast]}><View style={styles.timelineDot} /><Text style={styles.timelineTime}>{timeLabel(event.event_time)}</Text><View style={styles.grow}><Text style={styles.timelineTitle}>{eventLabel(event.event_type)}</Text>{event.note ? <Text style={styles.muted}>{event.note}</Text> : null}</View><Text style={styles.loggedBy}>{event.logged_by?.firstName || ''}</Text></View>)}
    </Section>
  </>;
}

function DailySummary({ patientName, summaries, routine }) {
  const days = summaries?.days || [];
  const latestSleep = days.find(day => day.sleep_minutes != null);
  const totalEvents = days.reduce((sum, day) => sum + day.event_count, 0);
  const describeDifference = (minutes, label) => {
    if (minutes == null) return null;
    if (Math.abs(minutes) <= 60) return `${label} was close to the caregiver-set routine`;
    return `${label} was ${Math.abs(minutes)} min ${minutes < 0 ? 'earlier' : 'later'} than the caregiver-set routine`;
  };
  const duration = minutes => `${Math.floor(minutes / 60)}h ${minutes % 60}m`;

  if (!summaries || totalEvents === 0) return <Section title="Daily summary"><View style={styles.summaryEmpty}><Feather name="bar-chart-2" size={24} color="#8A6A4E" /><View style={styles.grow}><Text style={styles.routineEmptyTitle}>No daily history yet</Text><Text style={styles.muted}>Log sleep, wake, nap, or agitation events to build a shared seven-day view.</Text></View></View></Section>;

  return <Section title={`${patientName}’s daily summary`}>
    <View style={styles.summaryHero}>
      <View style={styles.grow}><Text style={styles.summaryEyebrow}>LATEST COMPLETE NIGHT</Text><Text style={styles.summaryValue}>{latestSleep ? duration(latestSleep.sleep_minutes) : 'Still learning'}</Text><Text style={styles.summaryDetail}>{latestSleep ? `${new Date(`${latestSleep.date}T12:00:00`).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })} · calculated from logged sleep and wake times` : 'A sleep and following wake event are needed to calculate duration.'}</Text></View><Feather name="moon" size={27} color="#F0955A" />
    </View>
    {!summaries.sufficient_data && <View style={styles.learningBanner}><Feather name="info" size={16} color="#f3aa3d" /><Text style={styles.learningText}>Still learning: {summaries.learning_nights} of about 7 complete nights logged. Comparisons are descriptive, not medical advice.</Text></View>}
    <Text style={styles.historyTitle}>Last 7 days</Text>
    {days.map((day, index) => {
      const date = new Date(`${day.date}T12:00:00`);
      const comparison = day.routine_status === 'on_routine' ? 'On routine' : day.routine_status === 'outside_routine' ? 'Different from routine' : 'Not enough sleep data';
      return <View key={day.date} style={styles.summaryDay}><View style={styles.dayDate}><Text style={styles.dayName}>{index === 0 ? 'Today' : date.toLocaleDateString([], { weekday: 'short' })}</Text><Text style={styles.dayNumber}>{date.toLocaleDateString([], { month: 'short', day: 'numeric' })}</Text></View><View style={styles.grow}><Text style={styles.dayMetrics}>{day.sleep_minutes != null ? `${duration(day.sleep_minutes)} sleep` : 'No complete night'} · {day.nap_count} nap{day.nap_count === 1 ? '' : 's'} · {day.agitation_count} agitation event{day.agitation_count === 1 ? '' : 's'}</Text><Text style={[styles.dayStatus, day.routine_status === 'on_routine' && styles.dayStatusGood]}>{routine ? comparison : 'Routine not set'}</Text>{day.routine_status === 'outside_routine' && <Text style={styles.dayComparison}>{[describeDifference(day.bedtime_difference_minutes, 'Bedtime'), describeDifference(day.wake_difference_minutes, 'Wake time')].filter(Boolean).join(' · ')}</Text>}{day.handoff_note_count > 0 && <Text style={styles.dayNotes}>{day.handoff_note_count} shared handoff note{day.handoff_note_count === 1 ? '' : 's'}</Text>}</View></View>;
    })}
    <Text style={styles.generalDisclaimer}>This history summarizes caregiver-entered records and does not diagnose a condition or establish cause and effect.</Text>
  </Section>;
}

function RoutineView({ busy, events, form, isPrimary, onSave, patientName, routine, summaries, setForm }) {
  const sleepNights = new Set(events.filter(event => ['slept', 'woke'].includes(event.event_type)).map(event => new Date(event.event_time).toLocaleDateString())).size;
  const enoughData = sleepNights >= 7;
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const latest = events.slice().sort((a, b) => new Date(b.event_time) - new Date(a.event_time)).slice(0, 30);
  const comparisons = routine ? routineComparisons(latest, routine) : [];

  return <>
    <DailySummary patientName={patientName} summaries={summaries} routine={routine} />
    {!routine && <Section title={`${patientName}’s day · still learning`}><View style={styles.routineEmpty}><Feather name="moon" size={28} color="#F0955A" /><Text style={styles.routineEmptyTitle}>We’re still learning {patientName}’s rhythm</Text><Text style={styles.empty}>Log a few more nights and this becomes a routine tuned to them.</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.min(sleepNights / 7, 1) * 100}%` }]} /></View><Text style={styles.progressText}>{sleepNights} of ~7 nights in</Text></View></Section>}

    {routine && <Section title={`${patientName}’s routine`}>
      <RoutineCard icon="moon" title="Usual bedtime" detail="A consistent wind-down can support the sleep clock." time={routine.usual_bedtime} />
      <RoutineCard icon="sunrise" title="Usual wake time" detail="Keep the target visible after a rough night." time={routine.usual_wake_time} />
      {routine.nap_start_time && <RoutineCard icon="cloud" title="Usual nap window" detail="The planned daytime rest window." time={`${routine.nap_start_time}–${routine.nap_end_time}`} />}
      {routine.notes ? <Text style={styles.routineNotes}>{routine.notes}</Text> : null}
      <Text style={styles.guidanceNote}>{enoughData ? `Based on ${sleepNights} logged nights. Your logs can help the care team notice changes from this plan.` : `Still learning: ${sleepNights} of ~7 logged nights. This schedule was set by the Primary caregiver and is not an automated medical recommendation.`}</Text>
    </Section>}

    {routine && comparisons.length > 0 && <Section title="Recent changes from the routine">{comparisons.map((item, index) => <View key={`${item}-${index}`} style={styles.comparisonRow}><Feather name="info" size={16} color="#f3aa3d" /><Text style={styles.comparisonText}>{item}</Text></View>)}</Section>}

    {isPrimary ? <Section title={routine ? 'Edit routine' : 'Set a starting routine'}>
      <Text style={styles.mutedBlock}>Use 24-hour HH:MM times. This is a caregiver-set plan, not medical advice.</Text>
      <RoutineField label="Usual bedtime" value={form.usual_bedtime} onChange={value => update('usual_bedtime', value)} />
      <RoutineField label="Usual wake time" value={form.usual_wake_time} onChange={value => update('usual_wake_time', value)} />
      <View style={styles.twoFields}><View style={styles.fieldHalf}><RoutineField label="Nap starts (optional)" value={form.nap_start_time} onChange={value => update('nap_start_time', value)} /></View><View style={styles.fieldHalf}><RoutineField label="Nap ends (optional)" value={form.nap_end_time} onChange={value => update('nap_end_time', value)} /></View></View>
      <Text style={styles.fieldLabel}>Routine notes (optional)</Text><TextInput value={form.notes} onChangeText={value => update('notes', value)} maxLength={500} multiline placeholder="Comforting activities or other routine details" placeholderTextColor="#8A6A4E" style={[styles.input, styles.noteInput]} />
      <View style={styles.saveRoutine}><SmallButton label={routine ? 'Save changes' : 'Save routine'} disabled={busy} onPress={onSave} /></View>
    </Section> : !routine ? <Section title="Routine not set"><Text style={styles.readOnly}>The Primary caregiver has not created a routine yet. You can continue logging events while it is being set up.</Text></Section> : null}

    {!enoughData && <Section title="In the meantime · general guidance"><RoutineCard icon="sun" title="Morning light" detail="Often supports the sleep clock." time="AM" /><RoutineCard icon="clock" title="Consistent wake time" detail="Often useful even after a rough night." time="—" /><Text style={styles.generalDisclaimer}>General sleep-hygiene information—not personalized medical guidance.</Text></Section>}
  </>;
}

function RoutineField({ label, onChange, value }) { return <View style={styles.routineField}><Text style={styles.fieldLabel}>{label}</Text><TextInput autoCapitalize="none" keyboardType="numbers-and-punctuation" maxLength={5} onChangeText={onChange} placeholder="HH:MM" placeholderTextColor="#8A6A4E" style={styles.input} value={value} /></View>; }
function RoutineCard({ detail, icon, time, title }) { return <View style={styles.routineCard}><View style={styles.routineIcon}><Feather name={icon} size={18} color="#F0955A" /></View><View style={styles.grow}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.muted}>{detail}</Text></View><Text style={styles.routineTime}>{time}</Text></View>; }

function routineComparisons(events, routine) {
  const toMinutes = value => { const [hours, minutes] = value.split(':').map(Number); return hours * 60 + minutes; };
  const clockMinutes = value => { const date = new Date(value); return date.getHours() * 60 + date.getMinutes(); };
  const distance = (actual, target) => ((actual - target + 720) % 1440) - 720;
  const output = [];
  const slept = events.find(event => event.event_type === 'slept');
  const woke = events.find(event => event.event_type === 'woke');
  const nap = events.find(event => event.event_type === 'napped');
  if (slept && Math.abs(distance(clockMinutes(slept.event_time), toMinutes(routine.usual_bedtime))) >= 60) output.push(`Latest sleep time was ${timeLabel(slept.event_time)}, more than one hour from the ${routine.usual_bedtime} routine.`);
  if (woke && Math.abs(distance(clockMinutes(woke.event_time), toMinutes(routine.usual_wake_time))) >= 60) output.push(`Latest wake time was ${timeLabel(woke.event_time)}, more than one hour from the ${routine.usual_wake_time} routine.`);
  if (nap && routine.nap_end_time && clockMinutes(nap.event_time) > toMinutes(routine.nap_end_time)) output.push(`A nap was logged at ${timeLabel(nap.event_time)}, after the planned nap window.`);
  return output;
}

function SharedView({ events, isPrimary, members, notes, userId, onAdd, onEdit, onDelete, onAccess }) {
  const [range, setRange] = useState('7d');
  const [kind, setKind] = useState('all');
  const cutoff = range === 'today' ? new Date(new Date().setHours(0, 0, 0, 0)) : range === '7d' ? new Date(Date.now() - 7 * 86400000) : null;
  const noteItems = notes.map(note => ({ ...note, itemType: 'note', when: note.created_at }));
  const eventItems = events.map(event => ({ ...event, itemType: 'event', when: event.event_time }));
  const timeline = [...noteItems, ...eventItems]
    .filter(item => !cutoff || new Date(item.when) >= cutoff)
    .filter(item => kind === 'all' || (kind === 'notes' ? item.itemType === 'note' : item.itemType === 'event' && item.event_type === kind))
    .sort((a, b) => new Date(b.when) - new Date(a.when));
  const grouped = timeline.reduce((result, item) => {
    const day = new Date(item.when).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    (result[day] ||= []).push(item);
    return result;
  }, {});
  const recentPositive = notes
    .filter(note => new Date(note.created_at) >= new Date(Date.now() - 7 * 86400000))
    .flatMap(note => note.tags || [])
    .filter(tag => ['calm', 'ate well', 'slept', 'music helped'].includes(tag));
  const counts = recentPositive.reduce((all, tag) => ({ ...all, [tag]: (all[tag] || 0) + 1 }), {});
  const working = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([tag]) => tag);

  return <>
    <Section title={`Shared record · ${members.length} ${members.length === 1 ? 'person' : 'people'}`}>
      <View style={styles.workingCard}><Feather name="heart" size={20} color="#77d6b5" /><View style={styles.grow}><Text style={styles.workingTitle}>What’s working now</Text><Text style={styles.workingText}>{working.length ? `Recently logged by the care team: ${working.join(' and ')}.` : 'Add handoff notes to help the care team notice what is going well.'}</Text></View></View>
      <TouchableOpacity style={styles.leaveNoteButton} onPress={onAdd}><Feather name="plus" size={18} color="#8A6A4E" /><Text style={styles.leaveNoteText}>Leave end-of-shift note</Text></TouchableOpacity>
      <TouchableOpacity style={styles.manageAccessButton} onPress={onAccess}><Feather name="users" size={17} color="#F0955A" /><Text style={styles.manageAccessText}>{isPrimary ? 'Manage caregiver access' : 'View people with access'}</Text><Feather name="chevron-right" size={17} color="#8A6A4E" /></TouchableOpacity>
      <Text style={styles.generalDisclaimer}>Notes are shared with everyone who has access to this care record.</Text>
    </Section>

    <Section title="Recent handoff and activity">
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {[['all', 'All'], ['notes', 'Notes'], ...EVENT_TYPES.map(item => [item.key, item.label])].map(([key, label]) => <FilterChip key={key} active={kind === key} label={label} onPress={() => setKind(key)} />)}
      </ScrollView>
      <View style={styles.rangeRow}>{[['today', 'Today'], ['7d', '7 days'], ['all', 'All time']].map(([key, label]) => <FilterChip key={key} active={range === key} label={label} onPress={() => setRange(key)} />)}</View>
      {timeline.length === 0 ? <View style={styles.emptyState}><Feather name="clipboard" size={25} color="#8A6A4E" /><Text style={styles.empty}>No shared entries match these filters.</Text></View> : Object.entries(grouped).map(([day, items]) => <View key={day} style={styles.dayGroup}><Text style={styles.dayLabel}>{day}</Text>{items.map(item => item.itemType === 'note' ? <HandoffCard key={`note-${item.id}`} note={item} canManage={isPrimary || item.author_user_id === userId} onEdit={() => onEdit(item)} onDelete={() => onDelete(item)} /> : <SharedEventRow key={`event-${item.id}`} event={item} />)}</View>)}
    </Section>
  </>;
}

function YouView({ busy, summary, form, setForm, onSave }) {
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  const average = summary?.average_sleep_minutes;
  return <>
    <Section title="You · your sleep matters too">
      <View style={styles.wellnessStats}><View style={styles.wellnessStat}><Text style={styles.summaryEyebrow}>LAST 7 DAYS AVG</Text><Text style={styles.summaryValue}>{average == null ? '—' : `${Math.floor(average / 60)}h ${average % 60}m`}</Text></View><View style={styles.wellnessStat}><Text style={styles.summaryEyebrow}>BROKEN NIGHTS</Text><Text style={styles.summaryValue}>{summary?.broken_nights ?? 0}</Text></View></View>
      {summary?.hard_week && <View style={styles.hardWeek}><Feather name="heart" size={17} color="#f3aa3d" /><Text style={styles.hardWeekText}>Your recent check-ins suggest a hard week. Consider asking someone you trust for support or rest coverage.</Text></View>}
    </Section>
    <Section title="Private check-in">
      <Text style={styles.mutedBlock}>This check-in is private to your account and is not shared in the patient record.</Text>
      <View style={styles.typeWrap}>{[['okay', 'Okay'], ['tired', 'Tired'], ['overwhelmed', 'Overwhelmed']].map(([key, label]) => <FilterChip key={key} active={form.feeling === key} label={label} onPress={() => update('feeling', key)} />)}</View>
      <Text style={styles.fieldLabel}>Hours you slept (optional)</Text><TextInput keyboardType="decimal-pad" value={form.sleepHours} onChangeText={value => update('sleepHours', value)} placeholder="For example, 6.5" placeholderTextColor="#8A6A4E" style={styles.input} />
      <TouchableOpacity style={styles.checkRow} onPress={() => update('broken_night', !form.broken_night)}><Feather name={form.broken_night ? 'check-square' : 'square'} size={21} color="#F0955A" /><Text style={styles.checkText}>My sleep was interrupted</Text></TouchableOpacity>
      <Text style={styles.fieldLabel}>Private note (optional)</Text><TextInput multiline maxLength={500} value={form.note} onChangeText={value => update('note', value)} placeholder="Anything you want to remember" placeholderTextColor="#8A6A4E" style={[styles.input, styles.noteInput]} />
      <View style={styles.saveRoutine}><SmallButton label="Save check-in" disabled={busy} onPress={onSave} /></View>
    </Section>
    <Section title="Support when you need it">
      <RoutineCard icon="coffee" title="Plan a rest window" detail="If another caregiver is available, consider protecting a short rest period." time="Rest" />
      <TouchableOpacity style={styles.supportLink} onPress={() => Linking.openURL('tel:18002723900')}><Text style={styles.rowTitle}>Alzheimer’s Association 24/7 Helpline</Text><Text style={styles.supportLinkText}>800-272-3900</Text></TouchableOpacity>
      <TouchableOpacity style={styles.supportLink} onPress={() => Linking.openURL('https://www.alz.org/help-support/community/support-groups')}><Text style={styles.rowTitle}>Find a local support group</Text><Feather name="external-link" size={16} color="#F0955A" /></TouchableOpacity>
      <Text style={styles.generalDisclaimer}>General caregiver support information only—not medical or mental-health care. For an emergency, contact local emergency services.</Text>
    </Section>
  </>;
}

function MedicationView({ busy, isPrimary, schedules, logs, onAdd, onMark }) {
  const scheduleById = Object.fromEntries(schedules.map(item => [item.id, item]));
  return <>
    <View style={styles.medicationLock}><Feather name="lock" size={20} color="#f3aa3d" /><View style={styles.grow}><Text style={styles.medicationLockTitle}>Medication timing · clinician-set schedules only</Text><Text style={styles.medicationLockText}>ADChronotype records timing reminders and caregiver updates. It never recommends a medication or dose.</Text></View></View>
    <Section title="Timing schedule">
      {isPrimary && <View style={styles.saveRoutine}><SmallButton label="Add clinician-set timing" disabled={busy} onPress={onAdd} /></View>}
      {!schedules.length ? <Text style={styles.empty}>No clinician-set medication timing has been recorded.</Text> : schedules.map(schedule => <View key={schedule.id} style={styles.medicationCard}><View style={styles.medicationHeader}><View style={styles.grow}><Text style={styles.rowTitle}>{schedule.name}</Text><Text style={styles.muted}>{schedule.window_start}–{schedule.window_end}{schedule.instructions ? ` · ${schedule.instructions}` : ''}</Text></View><Feather name="check-circle" size={18} color="#77d6b5" /></View><Text style={styles.clinicianLabel}>Confirmed as set by a care professional</Text><View style={styles.medicationActions}><SmallButton label="Skipped" secondary disabled={busy} onPress={() => onMark(schedule, 'skipped')} /><SmallButton label="Taken" disabled={busy} onPress={() => onMark(schedule, 'taken')} /></View></View>)}
    </Section>
    <Section title="Recent medication updates">
      {!logs.length ? <Text style={styles.empty}>No medication updates yet.</Text> : logs.slice(0, 20).map(log => <View key={log.id} style={styles.medicationLog}><Feather name={log.status === 'taken' ? 'check-circle' : 'minus-circle'} size={18} color={log.status === 'taken' ? '#77d6b5' : '#f3aa3d'} /><View style={styles.grow}><Text style={styles.rowTitle}>{scheduleById[log.schedule_id]?.name || 'Medication'} · {log.status}</Text><Text style={styles.muted}>{new Date(log.occurred_at).toLocaleString()} · {log.logged_by?.firstName || log.logged_by?.username || 'Caregiver'}</Text></View></View>)}
      <Text style={styles.generalDisclaimer}>Never change a medication, dose, or clinician-set schedule without the prescribing clinician. For urgent concerns, contact the clinician, pharmacist, poison control, or emergency services as appropriate.</Text>
    </Section>
  </>;
}

function FilterChip({ active, label, onPress }) {
  return <TouchableOpacity style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}><Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text></TouchableOpacity>;
}

function HandoffCard({ note, canManage, onEdit, onDelete }) {
  const author = note.author?.firstName || note.author?.username || 'Caregiver';
  return <View style={styles.handoffCard}><View style={styles.handoffHeader}><View style={styles.avatarSmall}><Feather name="user" size={14} color="#F0B58F" /></View><View style={styles.grow}><Text style={styles.rowTitle}>{author}</Text><Text style={styles.muted}>{new Date(note.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text></View>{canManage && <View style={styles.noteActions}><TouchableOpacity accessibilityLabel="Edit handoff note" onPress={onEdit}><Feather name="edit-2" size={16} color="#8A6A4E" /></TouchableOpacity><TouchableOpacity accessibilityLabel="Delete handoff note" onPress={onDelete}><Feather name="trash-2" size={16} color="#ef776d" /></TouchableOpacity></View>}</View>{note.tags?.length > 0 && <View style={styles.noteTags}>{note.tags.map(tag => <View key={tag} style={styles.noteTag}><Text style={styles.noteTagText}>{tag}</Text></View>)}</View>}{note.note ? <Text style={styles.handoffText}>{note.note}</Text> : null}</View>;
}

function SharedEventRow({ event }) {
  const author = event.logged_by?.firstName || event.logged_by?.username || 'Caregiver';
  return <View style={styles.sharedEvent}><View style={styles.timelineDot} /><View style={styles.grow}><Text style={styles.timelineTitle}>{eventLabel(event.event_type)}</Text>{event.note ? <Text style={styles.muted}>{event.note}</Text> : null}</View><View><Text style={styles.sharedTime}>{timeLabel(event.event_time)}</Text><Text style={styles.loggedBy}>{author}</Text></View></View>;
}

function AccessView({ busy, inviteTarget, isPrimary, members, newPatientName, patientName, pending, selected, setInviteTarget, setNewPatientName, setPatientName, createPatient, inviteHelper, perform, setRevokeTarget }) {
  return <>
    <Section title="Care record">{isPrimary ? <View style={styles.inputRow}><TextInput value={patientName} onChangeText={setPatientName} style={styles.input} editable={!busy} /><SmallButton label="Save" disabled={busy || !patientName.trim()} onPress={() => perform(() => updateCarePatient(selected.id, patientName.trim()), 'Care record updated.')} /></View> : <Text style={styles.readOnly}>You have helper access. Only the primary caregiver can change this record or manage access.</Text>}</Section>
    {isPrimary && <Section title="Invite a helper"><Text style={styles.mutedBlock}>Invite someone by their ADChronotype username or account email.</Text><View style={styles.inputRow}><TextInput autoCapitalize="none" value={inviteTarget} onChangeText={setInviteTarget} placeholder="Username or email" placeholderTextColor="#8A6A4E" style={styles.input} editable={!busy} /><SmallButton label="Invite" disabled={busy} onPress={inviteHelper} /></View></Section>}
    <Section title="People with access">{members.map(member => <View key={member.id} style={styles.rowCard}><View style={styles.avatar}><Feather name="user" size={18} color="#F0B58F" /></View><View style={styles.grow}><Text style={styles.rowTitle}>{member.user?.firstName || member.user?.username || 'Member'}</Text><Text style={styles.muted}>@{member.user?.username} · {member.role}</Text></View>{isPrimary && member.role === 'helper' && <SmallButton label="Remove" danger onPress={() => setRevokeTarget(member)} />}</View>)}</Section>
    {isPrimary && pending.filter(item => item.status === 'pending').length > 0 && <Section title="Pending invitations">{pending.filter(item => item.status === 'pending').map(invite => <View key={invite.id} style={styles.rowCard}><View style={styles.grow}><Text style={styles.rowTitle}>{invite.invited_email || 'Pending helper'}</Text><Text style={styles.muted}>Waiting for acceptance</Text></View><SmallButton label="Cancel" secondary disabled={busy} onPress={() => perform(() => cancelCarePatientInvitation(invite.id), 'Invitation cancelled.')} /></View>)}</Section>}
    {isPrimary && <Section title="Create another care record"><View style={styles.inputRow}><TextInput value={newPatientName} onChangeText={setNewPatientName} placeholder="Patient display name" placeholderTextColor="#8A6A4E" style={styles.input} editable={!busy} /><SmallButton label="Create" disabled={busy} onPress={createPatient} /></View></Section>}
  </>;
}

function MedicationModal({ visible, busy, form, setForm, onCancel, onSave }) {
  const update = (key, value) => setForm(current => ({ ...current, [key]: value }));
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}><View style={styles.modalOverlay}><View style={styles.modalCard}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Add medication timing</Text><TouchableOpacity accessibilityLabel="Close" onPress={onCancel}><Feather name="x" size={24} color="#8A6A4E" /></TouchableOpacity></View><Text style={styles.modalSubtitle}>Record only a schedule already established by the prescribing clinician.</Text>
    <Text style={styles.fieldLabel}>Medication name</Text><TextInput value={form.name} onChangeText={value => update('name', value)} maxLength={100} placeholder="Name from clinician instructions" placeholderTextColor="#8A6A4E" style={styles.input} />
    <View style={styles.twoFields}><View style={styles.fieldHalf}><RoutineField label="Window starts" value={form.window_start} onChange={value => update('window_start', value)} /></View><View style={styles.fieldHalf}><RoutineField label="Window ends" value={form.window_end} onChange={value => update('window_end', value)} /></View></View>
    <Text style={styles.fieldLabel}>Clinician instructions (optional)</Text><TextInput value={form.instructions} onChangeText={value => update('instructions', value)} maxLength={255} placeholder="For example: with breakfast" placeholderTextColor="#8A6A4E" style={styles.input} />
    <TouchableOpacity style={styles.checkRow} onPress={() => update('clinician_confirmed', !form.clinician_confirmed)}><Feather name={form.clinician_confirmed ? 'check-square' : 'square'} size={21} color="#F0955A" /><Text style={styles.checkText}>I confirm this timing was established by a clinician.</Text></TouchableOpacity>
    <Text style={styles.generalDisclaimer}>No dose is collected. ADChronotype does not recommend medications, doses, or timing.</Text>
    <View style={styles.modalActions}><SmallButton label="Cancel" secondary disabled={busy} onPress={onCancel} /><SmallButton label="Add timing" disabled={busy || !form.clinician_confirmed} onPress={onSave} /></View>
  </View></View></Modal>;
}

function CustomEventModal({ visible, busy, eventType, eventTime, note, onType, onTime, onNote, onCancel, onSave }) {
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}><View style={styles.modalOverlay}><View style={styles.modalCard}><View style={styles.modalHeader}><Text style={styles.modalTitle}>Log another event</Text><TouchableOpacity accessibilityLabel="Close" style={styles.iconButton} onPress={onCancel}><Feather name="x" size={22} color="#8A6A4E" /></TouchableOpacity></View><Text style={styles.fieldLabel}>What happened?</Text><View style={styles.typeWrap}>{[...EVENT_TYPES, { key: 'other', label: 'Other' }].map(item => <TouchableOpacity key={item.key} style={[styles.typeChip, eventType === item.key && styles.typeChipActive]} onPress={() => onType(item.key)}><Text style={[styles.typeChipText, eventType === item.key && styles.typeChipTextActive]}>{item.label}</Text></TouchableOpacity>)}</View><Text style={styles.fieldLabel}>When?</Text><DateTimePicker value={eventTime} mode="datetime" display={Platform.OS === 'ios' ? 'spinner' : 'default'} maximumDate={new Date()} onChange={(_, value) => value && onTime(value)} themeVariant="light" /><Text style={styles.fieldLabel}>Optional note</Text><TextInput value={note} onChangeText={onNote} maxLength={255} multiline placeholder="Add a short detail" placeholderTextColor="#8A6A4E" style={[styles.input, styles.noteInput]} /><View style={styles.modalActions}><SmallButton label="Cancel" secondary disabled={busy} onPress={onCancel} /><SmallButton label="Log event" disabled={busy} onPress={onSave} /></View></View></View></Modal>;
}

function HandoffNoteModal({ visible, busy, tags, note, editing, onTags, onNote, onCancel, onSave }) {
  const toggle = tag => onTags(tags.includes(tag) ? tags.filter(item => item !== tag) : [...tags, tag]);
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}><View style={styles.modalOverlay}><View style={styles.modalCard}><View style={styles.modalHeader}><View><Text style={styles.modalTitle}>{editing ? 'Edit handoff note' : 'End-of-shift note'}</Text><Text style={styles.modalSubtitle}>A quick update for the whole care team</Text></View><TouchableOpacity accessibilityLabel="Close" style={styles.iconButton} onPress={onCancel}><Feather name="x" size={22} color="#8A6A4E" /></TouchableOpacity></View><Text style={styles.fieldLabel}>Quick tags</Text><View style={styles.typeWrap}>{HANDOFF_TAGS.map(tag => <TouchableOpacity key={tag} style={[styles.typeChip, tags.includes(tag) && styles.typeChipActive]} onPress={() => toggle(tag)}><Text style={[styles.typeChipText, tags.includes(tag) && styles.typeChipTextActive]}>{tag}</Text></TouchableOpacity>)}</View><Text style={styles.fieldLabel}>Optional note</Text><TextInput value={note} onChangeText={onNote} maxLength={500} multiline placeholder="Anything the next caregiver should know?" placeholderTextColor="#8A6A4E" style={[styles.input, styles.handoffInput]} /><Text style={styles.characterCount}>{note.length}/500</Text><View style={styles.modalActions}><SmallButton label="Cancel" secondary disabled={busy} onPress={onCancel} /><SmallButton label={editing ? 'Save note' : 'Share note'} disabled={busy || (!tags.length && !note.trim())} onPress={onSave} /></View></View></View></Modal>;
}

function Section({ title, children }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function SmallButton({ label, onPress, secondary, danger, disabled }) { return <TouchableOpacity disabled={disabled} onPress={onPress} style={[styles.smallButton, secondary && styles.secondaryButton, danger && styles.dangerButton, disabled && styles.disabled]}><Text style={styles.smallButtonText}>{label}</Text></TouchableOpacity>; }
function BottomNav({ navigation, requestCount }) { const tabs = [['Home', 'home', () => navigation.navigate('Report')], ['Sleep', 'moon', () => navigation.navigate('SleepLog')], ['Tips', 'book-open', () => navigation.navigate('Tips')], ['Caregiver', 'users', null], ['Profile', 'user', () => navigation.navigate('Profile')]]; return <View style={styles.navWrap}><View style={styles.nav}>{tabs.map(([label, icon, onPress]) => <TouchableOpacity key={label} style={styles.navItem} onPress={onPress} disabled={!onPress}>{label === 'Caregiver' && requestCount > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{requestCount > 9 ? '9+' : requestCount}</Text></View>}<Feather name={icon} size={22} color={label === 'Caregiver' ? '#F0955A' : '#8A6A4E'} /><Text style={[styles.navLabel, label === 'Caregiver' && styles.navActive]}>{label}</Text></TouchableOpacity>)}</View></View>; }

const styles = StyleSheet.create({
  safeTop: { flex: 0, backgroundColor: '#FDF6F0', paddingTop: Platform.OS === 'android' ? 25 : 0 }, safeBottom: { flex: 1, backgroundColor: '#FDF6F0' }, root: { flex: 1 }, scroll: { padding: 20, paddingTop: 24 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }, headerText: { alignItems: 'center', flex: 1 }, iconButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 }, heading: { color: '#3D2B1F', fontSize: 24, fontWeight: '800' }, context: { color: '#8A6A4E', fontSize: 11, marginTop: 3 },
  notice: { backgroundColor: '#E7F7EF', borderColor: '#B6E6CD', borderRadius: 12, borderWidth: 1, marginBottom: 14, padding: 12 }, noticeError: { backgroundColor: '#FFF1F2', borderColor: '#FECDD3' }, noticeText: { color: '#1F6B3A', fontSize: 13 },
  pills: { gap: 9, marginBottom: 15 }, pill: { backgroundColor: '#FFFFFF', borderColor: '#F0E2D4', borderRadius: 12, borderWidth: 1, minWidth: 112, padding: 10 }, pillActive: { backgroundColor: '#FBEADB', borderColor: '#E07B3C' }, pillText: { color: '#4B5563', fontSize: 13, fontWeight: '700' }, pillTextActive: { color: '#E07B3C' }, role: { color: '#8A6A4E', fontSize: 10, marginTop: 3, textTransform: 'capitalize' },
  sectionTabs: { backgroundColor: '#FBEADB', borderRadius: 13, flexDirection: 'row', marginBottom: 16, padding: 4 }, sectionTab: { alignItems: 'center', borderRadius: 10, flex: 1, gap: 3, justifyContent: 'center', minHeight: 50, paddingHorizontal: 3 }, sectionTabActive: { backgroundColor: '#E07B3C' }, sectionTabText: { color: '#8A6A4E', fontSize: 11, fontWeight: '700' }, sectionTabTextActive: { color: '#fff' },
  routineEmpty: { alignItems: 'center', paddingVertical: 10 }, routineEmptyTitle: { color: '#3D2B1F', fontSize: 16, fontWeight: '800', marginTop: 8 }, progressTrack: { backgroundColor: '#F0E2D4', borderRadius: 4, height: 7, marginTop: 14, overflow: 'hidden', width: '100%' }, progressFill: { backgroundColor: '#E07B3C', height: 7 }, progressText: { color: '#8A6A4E', fontSize: 11, marginTop: 7 }, routineCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, flexDirection: 'row', gap: 10, marginBottom: 8, padding: 12 }, routineIcon: { alignItems: 'center', backgroundColor: '#FBEADB', borderRadius: 18, height: 36, justifyContent: 'center', width: 36 }, routineTime: { color: '#3D2B1F', fontSize: 14, fontWeight: '800' }, routineNotes: { color: '#4B5563', fontSize: 12, lineHeight: 18, marginTop: 7 }, guidanceNote: { backgroundColor: '#FBEADB', borderRadius: 10, color: '#4B5563', fontSize: 11, lineHeight: 17, marginTop: 6, padding: 10 }, comparisonRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 9, marginBottom: 10 }, comparisonText: { color: '#374151', flex: 1, fontSize: 12, lineHeight: 18 }, routineField: { flex: 1, marginBottom: 4 }, twoFields: { flexDirection: 'row', gap: 10 }, fieldHalf: { flex: 1 }, saveRoutine: { alignItems: 'flex-end', marginTop: 14 }, generalDisclaimer: { color: '#8A6A4E', fontSize: 10, lineHeight: 15, marginTop: 5 },
  summaryEmpty: { alignItems: 'center', flexDirection: 'row', gap: 12, paddingVertical: 8 }, summaryHero: { alignItems: 'center', backgroundColor: '#FBEADB', borderColor: '#F0D9C5', borderRadius: 13, borderWidth: 1, flexDirection: 'row', padding: 13 }, summaryEyebrow: { color: '#9A6A1E', fontSize: 9, fontWeight: '800' }, summaryValue: { color: '#3D2B1F', fontSize: 22, fontWeight: '800', marginTop: 3 }, summaryDetail: { color: '#8A6A4E', fontSize: 10, lineHeight: 15, marginTop: 3 }, learningBanner: { alignItems: 'flex-start', backgroundColor: '#FBEED2', borderColor: '#F0D9A8', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 9, padding: 10 }, learningText: { color: '#9A6A1E', flex: 1, fontSize: 10, lineHeight: 15 }, historyTitle: { color: '#3D2B1F', fontSize: 13, fontWeight: '800', marginBottom: 5, marginTop: 14 }, summaryDay: { alignItems: 'flex-start', borderBottomColor: '#F0E2D4', borderBottomWidth: 1, flexDirection: 'row', paddingVertical: 10 }, dayDate: { width: 53 }, dayName: { color: '#374151', fontSize: 11, fontWeight: '800' }, dayNumber: { color: '#8A6A4E', fontSize: 9, marginTop: 2 }, dayMetrics: { color: '#3D2B1F', fontSize: 11, lineHeight: 16 }, dayStatus: { color: '#d6a957', fontSize: 9, fontWeight: '700', marginTop: 3 }, dayStatusGood: { color: '#77d6b5' }, dayComparison: { color: '#8A6A4E', fontSize: 9, lineHeight: 14, marginTop: 3 }, dayNotes: { color: '#F0955A', fontSize: 9, marginTop: 3 },
  workingCard: { alignItems: 'flex-start', backgroundColor: '#E7F7EF', borderColor: '#B6E6CD', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 11, padding: 12 }, workingTitle: { color: '#1F6B3A', fontSize: 13, fontWeight: '800' }, workingText: { color: '#397C55', fontSize: 11, lineHeight: 17, marginTop: 3 }, leaveNoteButton: { alignItems: 'center', backgroundColor: '#E07B3C', borderRadius: 11, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48 }, leaveNoteText: { color: '#fff', fontSize: 13, fontWeight: '800' }, filterRow: { gap: 7, paddingBottom: 10 }, rangeRow: { flexDirection: 'row', gap: 7, marginBottom: 8 }, filterChip: { backgroundColor: '#FBEADB', borderColor: '#F0E2D4', borderRadius: 16, borderWidth: 1, justifyContent: 'center', minHeight: 32, paddingHorizontal: 11 }, filterChipActive: { backgroundColor: '#E07B3C', borderColor: '#E07B3C' }, filterChipText: { color: '#8A6A4E', fontSize: 10, fontWeight: '700' }, filterChipTextActive: { color: '#fff' }, dayGroup: { borderTopColor: '#F0E2D4', borderTopWidth: 1, marginTop: 8, paddingTop: 10 }, dayLabel: { color: '#8A6A4E', fontSize: 10, fontWeight: '800', marginBottom: 8, textTransform: 'uppercase' }, handoffCard: { backgroundColor: '#FFFFFF', borderRadius: 12, marginBottom: 8, padding: 11 }, handoffHeader: { alignItems: 'center', flexDirection: 'row' }, avatarSmall: { alignItems: 'center', backgroundColor: '#FBEADB', borderRadius: 15, height: 30, justifyContent: 'center', marginRight: 8, width: 30 }, noteActions: { flexDirection: 'row', gap: 16, padding: 6 }, noteTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 9 }, noteTag: { backgroundColor: '#FBEADB', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 }, noteTagText: { color: '#9A6A1E', fontSize: 9, fontWeight: '700' }, handoffText: { color: '#3D2B1F', fontSize: 12, lineHeight: 18, marginTop: 9 }, sharedEvent: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 11, flexDirection: 'row', marginBottom: 7, minHeight: 54, padding: 10 }, sharedTime: { color: '#8A6A4E', fontSize: 10, fontWeight: '700', textAlign: 'right' }, modalSubtitle: { color: '#8A6A4E', fontSize: 11, marginTop: 3 }, handoffInput: { flex: 0, minHeight: 92, paddingTop: 12, textAlignVertical: 'top' }, characterCount: { color: '#8A6A4E', fontSize: 9, marginTop: 4, textAlign: 'right' },
  manageAccessButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, flexDirection: 'row', gap: 8, marginTop: 9, minHeight: 44, paddingHorizontal: 12 }, manageAccessText: { color: '#9A6A1E', flex: 1, fontSize: 12, fontWeight: '700' }, wellnessStats: { flexDirection: 'row', gap: 10 }, wellnessStat: { backgroundColor: '#FBEADB', borderRadius: 12, flex: 1, padding: 13 }, hardWeek: { alignItems: 'flex-start', backgroundColor: '#FBEED2', borderColor: '#F0D9A8', borderRadius: 10, borderWidth: 1, flexDirection: 'row', gap: 8, marginTop: 10, padding: 10 }, hardWeekText: { color: '#9A6A1E', flex: 1, fontSize: 11, lineHeight: 17 }, checkRow: { alignItems: 'center', flexDirection: 'row', gap: 9, marginTop: 14 }, checkText: { color: '#374151', flex: 1, fontSize: 12, lineHeight: 18 }, supportLink: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 11, flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, minHeight: 52, padding: 12 }, supportLinkText: { color: '#F0955A', fontSize: 13, fontWeight: '800' }, medicationLock: { alignItems: 'flex-start', backgroundColor: '#FBEED2', borderColor: '#F0D9A8', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 14, padding: 14 }, medicationLockTitle: { color: '#9A6A1E', fontSize: 13, fontWeight: '800' }, medicationLockText: { color: '#9A6A1E', fontSize: 11, lineHeight: 17, marginTop: 4 }, medicationCard: { backgroundColor: '#FFFFFF', borderRadius: 12, marginTop: 10, padding: 12 }, medicationHeader: { alignItems: 'center', flexDirection: 'row', gap: 8 }, clinicianLabel: { color: '#77d6b5', fontSize: 9, fontWeight: '700', marginTop: 7 }, medicationActions: { flexDirection: 'row', gap: 8, justifyContent: 'flex-end', marginTop: 10 }, medicationLog: { alignItems: 'center', borderBottomColor: '#F0E2D4', borderBottomWidth: 1, flexDirection: 'row', gap: 10, minHeight: 58 },
  prompt: { color: '#3D2B1F', fontSize: 20, fontWeight: '800', marginBottom: 12 }, eventGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 11, marginBottom: 12 }, eventButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#F0E2D4', borderRadius: 18, borderWidth: 1, minHeight: 132, justifyContent: 'center', padding: 15, width: '48%' }, eventIcon: { alignItems: 'center', borderRadius: 25, height: 50, justifyContent: 'center', marginBottom: 9, width: 50 }, eventTitle: { color: '#3D2B1F', fontSize: 17, fontWeight: '800' }, eventHint: { color: '#8A6A4E', fontSize: 11, marginTop: 3 },
  customButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#F0E2D4', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 10, marginBottom: 16, minHeight: 52, paddingHorizontal: 15 }, customButtonText: { color: '#4B5563', flex: 1, fontSize: 13, fontWeight: '700' },
  section: { backgroundColor: '#FFFFFF', borderColor: '#F0E2D4', borderRadius: 16, borderWidth: 1, marginBottom: 14, padding: 16 }, sectionTitle: { color: '#3D2B1F', fontSize: 16, fontWeight: '800', marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 18 }, empty: { color: '#8A6A4E', fontSize: 12, lineHeight: 18, marginTop: 9, textAlign: 'center' }, timelineRow: { alignItems: 'center', borderBottomColor: '#F0E2D4', borderBottomWidth: 1, flexDirection: 'row', minHeight: 55 }, timelineLast: { borderBottomWidth: 0 }, timelineDot: { backgroundColor: '#E07B3C', borderRadius: 5, height: 10, marginRight: 10, width: 10 }, timelineTime: { color: '#8A6A4E', fontSize: 12, fontWeight: '700', width: 78 }, timelineTitle: { color: '#3D2B1F', fontSize: 13, fontWeight: '700' }, loggedBy: { color: '#8A6A4E', fontSize: 10 },
  inputRow: { alignItems: 'center', flexDirection: 'row', gap: 10 }, input: { backgroundColor: '#FFFFFF', borderColor: '#F0E2D4', borderRadius: 11, borderWidth: 1, color: '#3D2B1F', flex: 1, fontSize: 14, minHeight: 46, paddingHorizontal: 13 }, noteInput: { flex: 0, minHeight: 72, paddingTop: 12, textAlignVertical: 'top' }, smallButton: { alignItems: 'center', backgroundColor: '#E07B3C', borderRadius: 10, justifyContent: 'center', minHeight: 44, paddingHorizontal: 14 }, secondaryButton: { backgroundColor: '#F0E2D4' }, dangerButton: { backgroundColor: '#9f2f43' }, disabled: { opacity: 0.45 }, smallButtonText: { color: '#fff', fontSize: 12, fontWeight: '800' },
  rowCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, flexDirection: 'row', gap: 9, marginBottom: 8, padding: 11 }, grow: { flex: 1 }, rowTitle: { color: '#3D2B1F', fontSize: 13, fontWeight: '700' }, muted: { color: '#8A6A4E', fontSize: 11, marginTop: 3 }, mutedBlock: { color: '#8A6A4E', fontSize: 12, lineHeight: 18, marginBottom: 11 }, avatar: { alignItems: 'center', backgroundColor: '#FBEADB', borderRadius: 19, height: 38, justifyContent: 'center', width: 38 }, readOnly: { color: '#8A6A4E', fontSize: 13, lineHeight: 20 }, loader: { marginVertical: 28 },
  modalOverlay: { alignItems: 'center', backgroundColor: 'rgba(0,0,0,.78)', flex: 1, justifyContent: 'center', padding: 20 }, modalCard: { backgroundColor: '#FFFFFF', borderColor: '#F0E2D4', borderRadius: 20, borderWidth: 1, maxWidth: 480, padding: 20, width: '100%' }, modalHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, modalTitle: { color: '#3D2B1F', fontSize: 20, fontWeight: '800' }, fieldLabel: { color: '#4B5563', fontSize: 12, fontWeight: '700', marginBottom: 8, marginTop: 13 }, typeWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, typeChip: { backgroundColor: '#FBEADB', borderRadius: 18, minHeight: 38, paddingHorizontal: 13, justifyContent: 'center' }, typeChipActive: { backgroundColor: '#E07B3C' }, typeChipText: { color: '#8A6A4E', fontSize: 12, fontWeight: '700' }, typeChipTextActive: { color: '#fff' }, modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end', marginTop: 18 },
  navWrap: { backgroundColor: '#FDF6F0', borderTopColor: '#F0E2D4', borderTopWidth: 1, bottom: 0, left: 0, position: 'absolute', right: 0 }, nav: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 }, navItem: { alignItems: 'center', minWidth: 54, position: 'relative' }, navLabel: { color: '#8A6A4E', fontSize: 10, marginTop: 4 }, navActive: { color: '#F0955A' }, badge: { alignItems: 'center', backgroundColor: '#D9694F', borderRadius: 9, height: 18, justifyContent: 'center', position: 'absolute', right: 5, top: -7, width: 18, zIndex: 2 }, badgeText: { color: '#fff', fontSize: 9, fontWeight: '800' },
});
