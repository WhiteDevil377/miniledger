import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Redirect, router, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Heart,
  LogOut,
  Paperclip,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Wallet,
} from 'lucide-react-native';
import { api, errorMessage } from '../api';
import { Brand, Button, Close, ErrorBanner, IconButton, Pill } from '../components/ui';
import { useSession } from '../session';
import { colors as c, fonts as f, money, prettyDate } from '../theme';
import type { Entry, Summary } from '../types';

type Filter = 'All' | 'Pending' | 'Repaid' | 'Overdue';
const avatarColors = [
  [c.purpleSoft, c.purple],
  ['#FBEBD8', '#A27536'],
  ['#E8EDF9', '#5E77AB'],
  ['#EAF2E5', '#66834D'],
  ['#F9E8E9', '#AC666A'],
];

export default function Ledger() {
  const { user, token, signOut } = useSession();
  const wide = useWindowDimensions().width >= 850;
  const [entries, setEntries] = useState<Entry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [search, setSearch] = useState('');
  const [confirm, setConfirm] = useState<Entry | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);
  const [receiptBusy, setReceiptBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [list, totals] = await Promise.all([
        api<{ entries: Entry[] }>('/entries', {}, token),
        api<Summary>('/summary', {}, token),
      ]);
      setEntries(list.entries);
      setSummary(totals);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [token]);
  useFocusEffect(
    useCallback(() => {
      void load();
      // Refresh calendar-derived overdue state while a ledger stays open overnight.
      const timer = setInterval(() => {
        void load();
      }, 60_000);
      return () => clearInterval(timer);
    }, [load]),
  );
  if (!user) return <Redirect href="/login" />;

  const filtered = entries.filter((entry) => {
    const match =
      filter === 'All' ||
      (filter === 'Repaid'
        ? !!entry.repaidAt
        : filter === 'Overdue'
          ? entry.isOverdue
          : !entry.repaidAt);
    return (
      match &&
      `${entry.friendName} ${entry.note}`.toLowerCase().includes(search.toLowerCase().trim())
    );
  });
  const recovered =
    summary && Number(summary.totalLent)
      ? Math.round((Number(summary.totalRepaid) / Number(summary.totalLent)) * 100)
      : 0;
  async function repay() {
    if (!confirm || !token) return;
    setBusy(true);
    setActionError('');
    try {
      await api(`/entries/${confirm.id}/repay`, { method: 'PATCH' }, token);
      setNotice(`${confirm.friendName.split(' ')[0]}'s loan is all settled.`);
      setConfirm(null);
      await load();
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }
  async function openReceipt(entry: Entry) {
    if (!token) return;
    setReceiptBusy(entry.id);
    try {
      const result = await api<{ dataUri: string }>(`/entries/${entry.id}/receipt`, {}, token);
      setReceipt(result.dataUri);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setReceiptBusy(null);
    }
  }
  async function logout() {
    setBusy(true);
    try {
      await signOut();
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.scroll, !wide && { padding: 20 }]}
        refreshControl={
          <RefreshControl refreshing={loading && !!summary} onRefresh={load} tintColor={c.purple} />
        }
      >
        <View style={styles.nav}>
          <Brand />
          <View style={styles.navRight}>
            {wide && (
              <View style={styles.private}>
                <ShieldCheck size={14} color={c.green} />
                <Text style={styles.privateText}>Your private ledger</Text>
              </View>
            )}
            <View style={styles.profile}>
              <Text style={styles.profileText}>{user.phone.slice(-2)}</Text>
            </View>
            <IconButton
              label="Sign out"
              onPress={() => {
                if (!busy) void logout();
              }}
            >
              <LogOut size={18} color={c.muted} />
            </IconButton>
          </View>
        </View>
        <View style={[styles.pageHeading, !wide && { marginTop: 29 }]}>
          <View style={{ flex: 1 }}>
            <View style={styles.kicker}>
              <View style={styles.kickerLine} />
              <Text style={styles.kickerText}>A LITTLE CLARITY GOES A LONG WAY</Text>
            </View>
            <Text style={[styles.pageTitle, !wide && { fontSize: 31 }]}>
              Your money. Your people.
            </Text>
            <Text style={styles.pageSubtitle}>
              A simple home for the money you lend to friends.
            </Text>
          </View>
          {wide && (
            <Button
              label="Add an entry"
              onPress={() => router.push('/add')}
              icon={<Plus size={18} color="#fff" />}
            />
          )}
        </View>
        <ErrorBanner message={error} />
        {!!notice && (
          <Pressable
            onPress={() => setNotice('')}
            style={styles.notice}
            accessibilityRole="button"
            accessibilityLabel="Dismiss success message"
          >
            <Check size={17} color={c.green} />
            <Text style={styles.noticeText}>{notice}</Text>
            <Text style={{ color: c.green }}>×</Text>
          </Pressable>
        )}
        {loading && !summary ? (
          <View style={{ padding: 70 }}>
            <ActivityIndicator color={c.purple} />
          </View>
        ) : !summary ? (
          <Button label="Try again" onPress={load} style={{ marginTop: 20 }} />
        ) : (
          <View
            style={[styles.columns, wide && { flexDirection: 'row', alignItems: 'flex-start' }]}
          >
            <View style={[styles.sidebar, wide && { width: 334 }]}>
              <View style={styles.balanceCard}>
                <View style={styles.balanceTop}>
                  <View style={styles.balanceLabel}>
                    <View style={styles.lightDot} />
                    <Text style={styles.balanceLabelText}>OUT WITH FRIENDS</Text>
                  </View>
                  <View style={styles.walletIcon}>
                    <Wallet size={21} color={c.lime} strokeWidth={1.5} />
                  </View>
                </View>
                <Text style={styles.balanceAmount} adjustsFontSizeToFit numberOfLines={1}>
                  {money(summary.outstanding)}
                </Text>
                <Text style={styles.balanceCaption}>to find its way back to you</Text>
                <View style={styles.balanceRule} />
                <View style={styles.stats}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.statLabel}>
                      <ArrowUpRight size={13} color="#B8BAC9" />
                      <Text style={styles.statLabelText}>Total lent</Text>
                    </View>
                    <Text style={styles.statValue} adjustsFontSizeToFit numberOfLines={1}>
                      {money(summary.totalLent)}
                    </Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.statLabel}>
                      <ArrowDownLeft size={13} color={c.lime} />
                      <Text style={styles.statLabelText}>Total repaid</Text>
                    </View>
                    <Text
                      style={[styles.statValue, { color: c.lime }]}
                      adjustsFontSizeToFit
                      numberOfLines={1}
                    >
                      {money(summary.totalRepaid)}
                    </Text>
                  </View>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${recovered}%` }]} />
                </View>
                <Text style={styles.progressCaption}>
                  {recovered}% returned, {summary.pendingCount}{' '}
                  {summary.pendingCount === 1 ? 'loan' : 'loans'} still out there
                </Text>
              </View>
              {summary.overdueCount > 0 ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Show overdue entries"
                  onPress={() => setFilter(filter === 'Overdue' ? 'All' : 'Overdue')}
                  style={styles.overdueCard}
                >
                  <View style={styles.overdueIcon}>
                    <Clock3 size={19} color={c.red} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.overdueTitle}>
                      {money(summary.overdueAmount)} is past due
                    </Text>
                    <Text style={styles.overdueCopy}>
                      {summary.overdueCount}{' '}
                      {summary.overdueCount === 1 ? 'entry could' : 'entries could'} use a friendly
                      nudge.
                    </Text>
                  </View>
                  <ChevronRight size={16} color={c.red} />
                </Pressable>
              ) : (
                <View
                  style={[
                    styles.overdueCard,
                    { backgroundColor: c.greenSoft, borderColor: '#DCE8D8' },
                  ]}
                >
                  <Check size={20} color={c.green} />
                  <View>
                    <Text style={[styles.overdueTitle, { color: c.green }]}>All looking good.</Text>
                    <Text style={styles.overdueCopy}>No overdue loans on your ledger.</Text>
                  </View>
                </View>
              )}
              {wide && (
                <View style={styles.friendCard}>
                  <View style={styles.friendCardTop}>
                    <Heart size={18} color={c.purple} />
                    <Text style={styles.friendEyebrow}>MONEY + FRIENDSHIP</Text>
                  </View>
                  <Text style={styles.friendTitle}>
                    Keep the friendship.{'\n'}Lose the mental maths.
                  </Text>
                  <Text style={styles.friendCopy}>
                    A clear ledger makes the next coffee together a little sweeter.
                  </Text>
                  <View style={styles.friendBottom}>
                    <View style={styles.avatarStack}>
                      {['A', 'P', 'R'].map((letter, i) => (
                        <View
                          key={letter}
                          style={[
                            styles.stackAvatar,
                            {
                              backgroundColor: avatarColors[i][0],
                              marginLeft: i ? -8 : 0,
                              transform: [{ rotate: `${i * 8 - 8}deg` }],
                            },
                          ]}
                        >
                          <Text
                            style={{
                              fontFamily: f.display,
                              color: avatarColors[i][1],
                              fontSize: 13,
                            }}
                          >
                            {letter}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Sparkles size={22} color={c.purple} strokeWidth={1.4} />
                  </View>
                </View>
              )}
            </View>
            <View style={{ flex: 1, minWidth: 0, gap: 18 }}>
              <View style={styles.listHeading}>
                <View style={styles.listTitleRow}>
                  <Text style={styles.listTitle}>The little loans</Text>
                  <Text style={styles.count}>{summary.entryCount}</Text>
                </View>
                <IconButton label="Refresh entries" onPress={load}>
                  <RefreshCw size={16} color={c.muted} />
                </IconButton>
              </View>
              {!wide && (
                <Button
                  label="Add an entry"
                  onPress={() => router.push('/add')}
                  icon={<Plus size={18} color="#fff" />}
                />
              )}
              <View style={styles.filterRow}>
                {(['All', 'Pending', 'Repaid'] as const).map((value) => (
                  <Pressable
                    key={value}
                    accessibilityRole="button"
                    accessibilityState={{ selected: filter === value }}
                    onPress={() => setFilter(value)}
                    style={[styles.filter, filter === value && styles.activeFilter]}
                  >
                    <Text style={[styles.filterText, filter === value && styles.activeFilterText]}>
                      {value}
                    </Text>
                  </Pressable>
                ))}
                {filter === 'Overdue' && (
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setFilter('All')}
                    style={[styles.filter, { backgroundColor: c.redSoft }]}
                  >
                    <Text style={[styles.filterText, { color: c.red }]}>Overdue ×</Text>
                  </Pressable>
                )}
              </View>
              <View style={styles.search}>
                <Search size={16} color={c.muted} />
                <TextInput
                  accessibilityLabel="Search friends or notes"
                  placeholder="Find a friend or a little loan..."
                  placeholderTextColor="#9A9DA4"
                  value={search}
                  onChangeText={setSearch}
                  style={styles.searchInput}
                />
              </View>
              <View style={styles.entries}>
                {filtered.map((entry, index) => {
                  const avatar = avatarColors[index % avatarColors.length];
                  return (
                    <View
                      key={entry.id}
                      style={[styles.entry, entry.isOverdue && styles.overdueEntry]}
                    >
                      <View style={styles.entryTop}>
                        <View style={[styles.avatar, { backgroundColor: avatar[0] }]}>
                          <Text style={[styles.initials, { color: avatar[1] }]}>
                            {entry.friendName
                              .split(/\s+/)
                              .slice(0, 2)
                              .map((part) => part[0])
                              .join('')
                              .toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <Text style={styles.friendName} numberOfLines={1}>
                            {entry.friendName}
                          </Text>
                          <Text style={styles.note} numberOfLines={1}>
                            {entry.note || 'A little help from a friend'}
                          </Text>
                        </View>
                        <Text
                          style={[styles.entryAmount, !!entry.repaidAt && { color: c.muted }]}
                          adjustsFontSizeToFit
                          numberOfLines={1}
                        >
                          {money(entry.amount)}
                        </Text>
                      </View>
                      <View style={styles.entryMeta}>
                        <View style={styles.entryDate}>
                          <Clock3 size={12} color={entry.isOverdue ? c.red : c.muted} />
                          <Text style={[styles.dateText, entry.isOverdue && { color: c.red }]}>
                            {entry.repaidAt
                              ? `Repaid ${prettyDate(entry.repaidAt)}`
                              : `Due ${prettyDate(entry.dueDate)}`}
                          </Text>
                        </View>
                        <Pill
                          text={entry.repaidAt ? 'Repaid' : entry.isOverdue ? 'Overdue' : 'Pending'}
                          color={entry.repaidAt ? c.green : entry.isOverdue ? c.red : c.purple}
                          background={
                            entry.repaidAt
                              ? c.greenSoft
                              : entry.isOverdue
                                ? c.redSoft
                                : c.purpleSoft
                          }
                        />
                      </View>
                      <View style={styles.entryActions}>
                        <View style={{ flex: 1 }}>
                          {entry.hasReceipt && (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel={`View receipt for ${entry.friendName}`}
                              onPress={() => openReceipt(entry)}
                              style={styles.receiptLink}
                            >
                              {receiptBusy === entry.id ? (
                                <ActivityIndicator size="small" color={c.muted} />
                              ) : (
                                <Paperclip size={13} color={c.muted} />
                              )}
                              <Text style={styles.receiptText}>Receipt attached</Text>
                            </Pressable>
                          )}
                        </View>
                        {entry.repaidAt ? (
                          <View style={styles.settled}>
                            <Check size={13} color={c.green} />
                            <Text style={styles.settledText}>All settled</Text>
                          </View>
                        ) : (
                          <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={`Mark ${entry.friendName} as repaid`}
                            onPress={() => {
                              setConfirm(entry);
                              setActionError('');
                            }}
                            style={styles.repayButton}
                          >
                            <Check size={14} color={c.purple} />
                            <Text style={styles.repayText}>Mark as repaid</Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
              {!filtered.length && (
                <View style={styles.empty}>
                  <View style={styles.emptyIcon}>
                    <Wallet size={28} color={c.purple} />
                  </View>
                  <Text style={styles.emptyTitle}>
                    {entries.length
                      ? 'No little loans here.'
                      : 'A fresh page for your friendships.'}
                  </Text>
                  <Text style={styles.emptyCopy}>
                    {entries.length
                      ? 'Try a different filter or search.'
                      : 'Lent a friend a little something?\nAdd your first entry and keep it all clear.'}
                  </Text>
                  {!entries.length && (
                    <Button
                      label="Add your first entry"
                      onPress={() => router.push('/add')}
                      style={{ marginTop: 6 }}
                    />
                  )}
                </View>
              )}
              <View style={styles.listFooter}>
                <ShieldCheck size={12} color={c.muted} />
                <Text style={styles.listFooterText}>
                  Only you can see these entries. A little peace of mind.
                </Text>
              </View>
            </View>
          </View>
        )}
        <View style={styles.footer}>
          <Text style={styles.footerBrand}>small loans. big peace of mind.</Text>
          <Text style={styles.footerText}>Made for real-life friendships.</Text>
        </View>
      </ScrollView>
      <Modal
        visible={!!confirm}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) setConfirm(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.confirmIcon}>
                <Check size={24} color={c.green} />
              </View>
              <Close
                onPress={() => {
                  if (!busy) setConfirm(null);
                }}
              />
            </View>
            <Text style={styles.modalTitle}>All square?</Text>
            <Text style={styles.modalCopy}>
              Confirm that {confirm?.friendName} has returned {money(confirm?.amount ?? 0)}. Your
              ledger will update right away.
            </Text>
            <ErrorBanner message={actionError} />
            <Button label="Yes, mark as repaid" onPress={repay} loading={busy} />
            <Button label="Not yet" secondary onPress={() => setConfirm(null)} disabled={busy} />
          </View>
        </View>
      </Modal>
      <Modal
        visible={!!receipt}
        transparent
        animationType="fade"
        onRequestClose={() => setReceipt(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { maxWidth: 650 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Your receipt</Text>
              <Close onPress={() => setReceipt(null)} />
            </View>
            {receipt && (
              <Image
                accessibilityLabel="Loan receipt"
                source={{ uri: receipt }}
                style={{ width: '100%', height: 400 }}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, padding: 36, maxWidth: 1100, width: '100%', alignSelf: 'center' },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 22,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  navRight: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  private: { flexDirection: 'row', gap: 5, alignItems: 'center', marginRight: 18 },
  privateText: { fontFamily: f.medium, fontSize: 11, color: c.muted },
  profile: {
    width: 33,
    height: 33,
    backgroundColor: c.purpleSoft,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileText: { fontFamily: f.bold, fontSize: 12, color: c.purple },
  pageHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginTop: 36,
    marginBottom: 29,
  },
  kicker: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  kickerLine: { width: 14, height: 2, backgroundColor: c.purple },
  kickerText: { fontFamily: f.bold, fontSize: 8, letterSpacing: 1.25, color: c.purple },
  pageTitle: { fontFamily: f.display, color: c.ink, fontSize: 36, letterSpacing: -1.6 },
  pageSubtitle: {
    fontFamily: f.regular,
    fontSize: 13,
    color: c.muted,
    marginTop: 8,
    lineHeight: 20,
  },
  columns: { gap: 29 },
  sidebar: { gap: 17 },
  balanceCard: { backgroundColor: c.navy, borderRadius: 22, padding: 24, overflow: 'hidden' },
  balanceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  balanceLabel: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  lightDot: { backgroundColor: c.lime, width: 5, height: 5, borderRadius: 3 },
  balanceLabelText: { color: '#D1D3DD', fontFamily: f.semi, letterSpacing: 1.2, fontSize: 9 },
  walletIcon: { backgroundColor: '#3A3F53', padding: 9, borderRadius: 12 },
  balanceAmount: {
    color: c.lime,
    fontFamily: f.display,
    fontSize: 49,
    letterSpacing: -2,
    marginTop: 17,
  },
  balanceCaption: { fontFamily: f.regular, color: '#B8BAC9', fontSize: 12, marginTop: 5 },
  balanceRule: { height: 1, backgroundColor: '#43465A', marginVertical: 22 },
  stats: { flexDirection: 'row', gap: 16 },
  statLabel: { flexDirection: 'row', gap: 3, alignItems: 'center' },
  statLabelText: { fontFamily: f.regular, color: '#B8BAC9', fontSize: 11 },
  statValue: {
    fontFamily: f.display,
    color: 'white',
    fontSize: 23,
    marginTop: 7,
    letterSpacing: -0.6,
  },
  statDivider: { width: 1, backgroundColor: '#43465A' },
  progressTrack: {
    height: 4,
    backgroundColor: '#494D60',
    borderRadius: 3,
    marginTop: 24,
    overflow: 'hidden',
  },
  progressFill: { backgroundColor: c.lime, height: '100%', borderRadius: 3 },
  progressCaption: { color: '#B8BAC9', fontFamily: f.regular, fontSize: 9, marginTop: 9 },
  overdueCard: {
    backgroundColor: c.redSoft,
    borderWidth: 1,
    borderColor: '#F1DACE',
    padding: 15,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  overdueIcon: {
    width: 35,
    height: 35,
    backgroundColor: '#FBE2D5',
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overdueTitle: { color: c.red, fontFamily: f.bold, fontSize: 12 },
  overdueCopy: { color: c.muted, fontFamily: f.regular, fontSize: 10, marginTop: 4 },
  friendCard: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 18,
    padding: 22,
    marginTop: 3,
  },
  friendCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  friendEyebrow: { fontFamily: f.bold, fontSize: 8, letterSpacing: 1.1, color: c.purple },
  friendTitle: {
    color: c.ink,
    fontFamily: f.display,
    fontSize: 23,
    lineHeight: 29,
    letterSpacing: -0.7,
    marginTop: 16,
  },
  friendCopy: {
    color: c.muted,
    fontFamily: f.regular,
    fontSize: 12,
    lineHeight: 20,
    marginTop: 11,
  },
  friendBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 25,
  },
  avatarStack: { flexDirection: 'row' },
  stackAvatar: {
    width: 35,
    height: 35,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: c.bg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: -7,
  },
  listTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  listTitle: { fontFamily: f.display, color: c.ink, fontSize: 22, letterSpacing: -0.8 },
  count: {
    backgroundColor: '#E9EBE2',
    color: c.muted,
    fontFamily: f.bold,
    fontSize: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  filterRow: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  filter: { paddingHorizontal: 17, paddingVertical: 9, borderRadius: 9 },
  activeFilter: { backgroundColor: c.ink },
  filterText: { color: c.muted, fontFamily: f.semi, fontSize: 12 },
  activeFilterText: { color: '#fff' },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 11,
    paddingHorizontal: 13,
    backgroundColor: '#fff',
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontFamily: f.regular,
    fontSize: 12,
    paddingVertical: 13,
    color: c.ink,
  },
  entries: { gap: 12 },
  entry: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 17,
  },
  overdueEntry: { borderLeftWidth: 3, borderLeftColor: '#D18C6C', backgroundColor: '#FFFCFA' },
  entryTop: { flexDirection: 'row', gap: 11, alignItems: 'center' },
  avatar: {
    width: 41,
    height: 41,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: { fontFamily: f.display, fontSize: 14 },
  friendName: { color: c.ink, fontFamily: f.bold, fontSize: 13 },
  note: { color: c.muted, fontFamily: f.regular, fontSize: 11, marginTop: 4 },
  entryAmount: {
    color: c.ink,
    fontFamily: f.display,
    fontSize: 24,
    maxWidth: '43%',
    letterSpacing: -0.6,
  },
  entryMeta: { marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  entryDate: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontFamily: f.medium, fontSize: 10, color: c.muted },
  entryActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0EB',
    paddingTop: 10,
    minHeight: 33,
  },
  repayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 7,
    backgroundColor: c.purpleSoft,
  },
  repayText: { fontFamily: f.semi, color: c.purple, fontSize: 10 },
  receiptLink: { flexDirection: 'row', gap: 4, alignItems: 'center', paddingVertical: 8 },
  receiptText: { fontFamily: f.medium, fontSize: 10, color: c.muted },
  settled: { flexDirection: 'row', gap: 5, alignItems: 'center', paddingVertical: 7 },
  settledText: { fontFamily: f.semi, color: c.green, fontSize: 10 },
  empty: {
    paddingVertical: 40,
    paddingHorizontal: 15,
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'white',
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.border,
  },
  emptyIcon: { padding: 19, backgroundColor: c.purpleSoft, borderRadius: 22 },
  emptyTitle: { color: c.ink, fontFamily: f.display, fontSize: 20, textAlign: 'center' },
  emptyCopy: {
    color: c.muted,
    fontFamily: f.regular,
    fontSize: 12,
    lineHeight: 20,
    textAlign: 'center',
  },
  listFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  listFooterText: { color: c.muted, fontFamily: f.regular, fontSize: 9, flexShrink: 1 },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 13,
    backgroundColor: c.greenSoft,
    borderRadius: 10,
    marginBottom: 18,
  },
  noticeText: { flex: 1, fontFamily: f.medium, color: c.green, fontSize: 12 },
  footer: {
    marginTop: 35,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: c.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  footerBrand: { fontFamily: f.display, color: c.muted, fontSize: 10 },
  footerText: { fontFamily: f.regular, color: c.muted, fontSize: 9 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,30,43,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 24,
    gap: 16,
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  confirmIcon: {
    width: 49,
    height: 49,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.greenSoft,
  },
  modalTitle: { color: c.ink, fontFamily: f.display, fontSize: 26, letterSpacing: -0.8 },
  modalCopy: { color: c.muted, fontFamily: f.regular, fontSize: 14, lineHeight: 23 },
});
