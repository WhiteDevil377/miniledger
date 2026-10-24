import React, { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Redirect, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ImagePlus,
  LockKeyhole,
  Paperclip,
  Plus,
  X,
} from 'lucide-react-native';
import { api, ApiError, errorMessage } from '../api';
import { Brand, Button, ErrorBanner, Field, IconButton } from '../components/ui';
import { useSession } from '../session';
import { colors as c, fonts as f, localDate } from '../theme';

export default function AddEntry() {
  const { user, token } = useSession();
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(localDate(7));
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const close = () => {
    if (!loading) {
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }
  };
  if (!user) return <Redirect href="/login" />;

  async function pickReceipt() {
    setError('');
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError('Allow photo access to attach a receipt, or continue without one.');
          return;
        }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });
      if (!result.canceled) {
        if ((result.assets[0].fileSize ?? 0) > 5 * 1024 * 1024) {
          setError('Choose a receipt smaller than 5 MB.');
          return;
        }
        setReceipt(result.assets[0]);
      }
    } catch (error) {
      setError(errorMessage(error));
    }
  }
  function validate() {
    const fields: Record<string, string> = {};
    if (friendName.trim().length < 2 || friendName.trim().length > 80)
      fields.friendName = 'Enter a name between 2 and 80 characters.';
    if (
      !/^\d{1,9}(\.\d{1,2})?$/.test(amount) ||
      Number(amount) <= 0 ||
      Number(amount) > 999999999.99
    )
      fields.amount = 'Enter a positive amount with up to 2 decimal places.';
    const parsedDate = new Date(`${dueDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) ||
      Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== dueDate ||
      dueDate < '2000-01-01' ||
      dueDate > '2100-12-31'
    )
      fields.dueDate = 'Enter a real date as YYYY-MM-DD (2000–2100).';
    setErrors(fields);
    return !Object.keys(fields).length;
  }
  async function save() {
    setError('');
    if (!validate() || !token) return;
    setLoading(true);
    try {
      const data = new FormData();
      data.append('friendName', friendName.trim());
      data.append('amount', amount);
      data.append('dueDate', dueDate);
      data.append('note', note.trim());
      if (receipt) {
        if (Platform.OS === 'web') {
          const blob = await (await fetch(receipt.uri)).blob();
          data.append('receipt', blob, receipt.fileName || 'receipt.jpg');
        } else {
          // React Native's FormData accepts a URI descriptor instead of a browser Blob.
          data.append('receipt', {
            uri: receipt.uri,
            name: receipt.fileName || 'receipt.jpg',
            type: receipt.mimeType || 'image/jpeg',
          } as unknown as Blob);
        }
      }
      await api('/entries', { method: 'POST', body: data }, token);
      if (router.canGoBack()) router.back();
      else router.replace('/');
    } catch (error) {
      setError(errorMessage(error));
      if (error instanceof ApiError && error.fields)
        setErrors(
          Object.fromEntries(Object.entries(error.fields).map(([key, value]) => [key, value[0]])),
        );
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.nav}>
            <Brand small />
            <IconButton label="Back to ledger" onPress={close}>
              <X size={21} color={c.muted} />
            </IconButton>
          </View>
          <Pressable accessibilityRole="button" onPress={close} style={styles.back}>
            <ArrowLeft size={16} color={c.muted} />
            <Text style={styles.backText}>Back to your ledger</Text>
          </Pressable>
          <View style={styles.intro}>
            <View style={styles.entryIcon}>
              <ArrowUpRight size={25} color={c.purple} strokeWidth={1.7} />
            </View>
            <Text style={styles.title}>A little loan.{'\n'}One less thing to remember.</Text>
            <Text style={styles.subtitle}>Put it on the ledger. Keep the good times going.</Text>
          </View>
          <View style={styles.form}>
            <Field
              label="Friend’s name"
              placeholder="Who did you lend to?"
              value={friendName}
              onChangeText={setFriendName}
              maxLength={80}
              autoCapitalize="words"
              error={errors.friendName}
            />
            <Field
              label="Amount lent (₹)"
              placeholder="0.00"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              maxLength={12}
              error={errors.amount}
              style={{ fontFamily: f.display, fontSize: 27 }}
            />
            <View style={{ gap: 10 }}>
              <Field
                label="Due date"
                placeholder="YYYY-MM-DD"
                value={dueDate}
                onChangeText={setDueDate}
                maxLength={10}
                autoCapitalize="none"
                error={errors.dueDate}
              />
              <View style={styles.quickDates}>
                {[
                  ['Tomorrow', 1],
                  ['In a week', 7],
                  ['In 30 days', 30],
                ].map(([label, days]) => (
                  <Pressable
                    key={label}
                    accessibilityRole="button"
                    onPress={() => setDueDate(localDate(Number(days)))}
                    style={[
                      styles.quickDate,
                      dueDate === localDate(Number(days)) && {
                        backgroundColor: c.purpleSoft,
                        borderColor: '#DCD5F5',
                      },
                    ]}
                  >
                    <CalendarDays size={12} color={c.purple} />
                    <Text style={styles.quickDateText}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={styles.hint}>
                Use YYYY-MM-DD. Past dates are welcome for older loans.
              </Text>
            </View>
            <Field
              label="A little note (optional)"
              placeholder="Dinner, concert tickets, weekend plans..."
              value={note}
              onChangeText={setNote}
              multiline
              maxLength={240}
            />
            <View style={styles.receiptBlock}>
              <View style={styles.receiptHeading}>
                <Paperclip size={15} color={c.ink} />
                <Text style={styles.label}>Receipt</Text>
                <Text style={styles.optional}>OPTIONAL</Text>
              </View>
              {receipt ? (
                <View style={styles.attached}>
                  <Image source={{ uri: receipt.uri }} style={styles.thumbnail} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.receiptName} numberOfLines={1}>
                      {receipt.fileName || 'Your receipt'}
                    </Text>
                    <Text style={styles.hint}>Ready to attach to this entry</Text>
                  </View>
                  <IconButton label="Remove receipt" onPress={() => setReceipt(null)}>
                    <X size={17} color={c.muted} />
                  </IconButton>
                </View>
              ) : (
                <Pressable accessibilityRole="button" onPress={pickReceipt} style={styles.upload}>
                  <View style={styles.uploadIcon}>
                    <ImagePlus size={23} color={c.purple} strokeWidth={1.6} />
                  </View>
                  <View>
                    <Text style={styles.uploadTitle}>Add a photo of the receipt</Text>
                    <Text style={styles.uploadHint}>JPEG, PNG, or WebP · up to 5 MB</Text>
                  </View>
                  <Plus size={18} color={c.purple} />
                </Pressable>
              )}
            </View>
            <ErrorBanner message={error} />
            <Button
              label="Save to my ledger"
              onPress={save}
              loading={loading}
              icon={<Plus size={17} color="#fff" />}
            />
            <View style={styles.private}>
              <LockKeyhole size={12} color={c.muted} />
              <Text style={styles.privateText}>
                Just for your records. We won’t contact your friend.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  scroll: {
    padding: 24,
    maxWidth: 590,
    width: '100%',
    alignSelf: 'center',
    flexGrow: 1,
    paddingBottom: 40,
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 18,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  back: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 24,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  backText: { color: c.muted, fontFamily: f.medium, fontSize: 11 },
  intro: { marginTop: 24, marginBottom: 25 },
  entryIcon: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: c.purpleSoft,
    alignSelf: 'flex-start',
    marginBottom: 15,
  },
  title: { color: c.ink, fontFamily: f.display, fontSize: 31, lineHeight: 37, letterSpacing: -1.4 },
  subtitle: { color: c.muted, fontFamily: f.regular, fontSize: 12, marginTop: 10, lineHeight: 20 },
  form: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 20,
    backgroundColor: 'white',
    padding: 22,
    gap: 22,
  },
  quickDates: { flexDirection: 'row', gap: 7, flexWrap: 'wrap' },
  quickDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 7,
    paddingVertical: 7,
    paddingHorizontal: 9,
  },
  quickDateText: { color: c.purple, fontFamily: f.medium, fontSize: 10 },
  hint: { color: c.muted, fontFamily: f.regular, fontSize: 10, marginTop: 2, lineHeight: 16 },
  receiptBlock: { gap: 12 },
  receiptHeading: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  label: { fontFamily: f.semi, fontSize: 13, color: c.ink },
  optional: {
    marginLeft: 'auto',
    color: c.muted,
    fontFamily: f.bold,
    fontSize: 8,
    letterSpacing: 1,
  },
  upload: {
    padding: 15,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: '#D9D2EF',
    borderStyle: 'dashed',
    backgroundColor: '#FCFBFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 7,
  },
  uploadIcon: { backgroundColor: c.purpleSoft, padding: 10, borderRadius: 11 },
  uploadTitle: { fontFamily: f.semi, color: c.ink, fontSize: 11 },
  uploadHint: { fontFamily: f.regular, color: c.muted, fontSize: 9, marginTop: 5 },
  attached: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    backgroundColor: c.bg,
    padding: 10,
  },
  thumbnail: { height: 48, width: 48, borderRadius: 8 },
  receiptName: { fontFamily: f.semi, color: c.ink, fontSize: 12 },
  private: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  privateText: { fontFamily: f.regular, fontSize: 9, color: c.muted, flexShrink: 1 },
});
