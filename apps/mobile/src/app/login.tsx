import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Redirect } from 'expo-router';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  HeartHandshake,
  LockKeyhole,
  Sparkles,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, errorMessage } from '../api';
import { Brand, Button, ErrorBanner } from '../components/ui';
import { useSession } from '../session';
import { colors as c, fonts as f } from '../theme';
import type { User } from '../types';

export default function Login() {
  const { user, signIn } = useSession();
  const wide = useWindowDimensions().width >= 800;
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [seconds, setSeconds] = useState(0);
  const otpRef = useRef<TextInput>(null);
  const normalizedPhone = phone.trim().startsWith('+')
    ? phone.replace(/[\s()-]/g, '')
    : `+91${phone.replace(/\D/g, '')}`;
  useEffect(() => {
    if (!seconds) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);
  useEffect(() => {
    if (step === 'otp') otpRef.current?.focus();
  }, [step]);
  if (user) return <Redirect href="/" />;

  async function sendCode() {
    setError('');
    if (
      (!phone.trim().startsWith('+') && phone.replace(/\D/g, '').length !== 10) ||
      !/^\+[1-9]\d{7,14}$/.test(normalizedPhone)
    ) {
      setError(
        'Enter a 10-digit Indian mobile number, or include +country code for other numbers.',
      );
      return;
    }
    setLoading(true);
    try {
      await api('/auth/request-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: normalizedPhone }),
      });
      setStep('otp');
      setOtp('');
      setSeconds(30);
    } catch (error) {
      setError(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }
  async function verify() {
    setError('');
    if (!/^\d{6}$/.test(otp)) {
      setError('Enter the 6-digit code from the server log.');
      return;
    }
    setLoading(true);
    try {
      const result = await api<{ token: string; user: User }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone: normalizedPhone, otp }),
      });
      await signIn(result.token, result.user);
    } catch (error) {
      setError(errorMessage(error));
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
        <ScrollView
          contentContainerStyle={[styles.scroll, wide && { padding: 48 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.nav}>
            <Brand />
            <View style={styles.smallTag}>
              <View style={styles.tagDot} />
              <Text style={styles.smallTagText}>Little loans, lighter minds</Text>
            </View>
          </View>
          <View style={[styles.main, wide && styles.mainWide]}>
            <View style={[styles.story, wide && { flex: 1, paddingRight: 64 }]}>
              <View style={styles.eyebrow}>
                <Sparkles size={15} color={c.purple} />
                <Text style={styles.eyebrowText}>FOR THE FRIENDS WHO ALWAYS SPOT YOU</Text>
              </View>
              <Text style={[styles.headline, !wide && { fontSize: 43, lineHeight: 49 }]}>
                Good friends.{'\n'}
                <Text style={{ color: c.purple }}>Clear accounts.</Text>
              </Text>
              <Text style={styles.description}>
                Keep track of the little loans, so you can{wide ? '\n' : ' '}get back to the good
                times.
              </Text>
              {wide && (
                <View style={styles.illustration}>
                  <View style={styles.orbit} />
                  <View style={styles.orbitInner} />
                  <View style={styles.friendship}>
                    <HeartHandshake size={62} color={c.ink} strokeWidth={1.3} />
                  </View>
                  <View style={styles.miniCard}>
                    <View style={styles.miniAvatar}>
                      <Text style={styles.miniInitial}>P</Text>
                    </View>
                    <View>
                      <Text style={styles.miniName}>Weekend plans</Text>
                      <Text style={styles.miniMuted}>A little help from a friend</Text>
                    </View>
                    <Text style={styles.miniAmount}>₹1,800</Text>
                  </View>
                  <View style={styles.paidChip}>
                    <Check size={14} color={c.green} />
                    <Text style={styles.paidChipText}>All settled. Still friends.</Text>
                  </View>
                  <View style={styles.spark}>
                    <Sparkles size={25} color={c.purple} />
                  </View>
                </View>
              )}
            </View>
            <View style={[styles.loginCard, wide && { width: 390 }]}>
              {step === 'otp' && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Change phone number"
                  onPress={() => {
                    setStep('phone');
                    setError('');
                  }}
                  style={styles.back}
                >
                  <ArrowLeft size={17} color={c.muted} />
                  <Text style={styles.backText}>Change number</Text>
                </Pressable>
              )}
              <View style={styles.lock}>
                <LockKeyhole size={24} color={c.purple} strokeWidth={1.7} />
              </View>
              <Text style={styles.cardTitle}>
                {step === 'phone' ? 'Your ledger starts here.' : 'One quick check.'}
              </Text>
              <Text style={styles.cardDescription}>
                {step === 'phone'
                  ? 'Sign in with your mobile number.\nNo passwords to remember.'
                  : `Enter the 6-digit code for\n${normalizedPhone}`}
              </Text>
              {step === 'phone' ? (
                <View style={{ gap: 9 }}>
                  <Text style={styles.label}>Mobile number</Text>
                  <View style={styles.phoneField}>
                    <Text style={styles.country}>IN</Text>
                    <Text style={styles.countryCode}>{phone.startsWith('+') ? '↗' : '+91'}</Text>
                    <TextInput
                      accessibilityLabel="Mobile number"
                      placeholder="98765 43210"
                      placeholderTextColor="#A2A3AA"
                      value={phone}
                      onChangeText={setPhone}
                      keyboardType="phone-pad"
                      autoComplete="tel"
                      style={styles.phoneInput}
                      onSubmitEditing={sendCode}
                      returnKeyType="go"
                    />
                  </View>
                  <Text style={styles.hint}>Outside India? Include your +country code.</Text>
                </View>
              ) : (
                <View style={{ gap: 9 }}>
                  <Text style={styles.label}>Verification code</Text>
                  <TextInput
                    ref={otpRef}
                    accessibilityLabel="Verification code"
                    placeholder="000000"
                    placeholderTextColor="#CBC9D7"
                    value={otp}
                    onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="number-pad"
                    maxLength={6}
                    autoComplete="one-time-code"
                    textContentType="oneTimeCode"
                    onSubmitEditing={verify}
                    style={styles.otpInput}
                  />
                </View>
              )}
              <ErrorBanner message={error} />
              <Button
                label={step === 'phone' ? 'Send verification code' : 'Verify & open ledger'}
                loading={loading}
                onPress={step === 'phone' ? sendCode : verify}
                icon={<ArrowRight size={18} color="#fff" />}
              />
              {step === 'otp' && (
                <Pressable
                  accessibilityRole="button"
                  disabled={seconds > 0 || loading}
                  onPress={sendCode}
                  style={{ alignItems: 'center' }}
                >
                  <Text style={styles.resend}>
                    {seconds ? `Request another code in ${seconds}s` : 'Resend verification code'}
                  </Text>
                </Pressable>
              )}
              <View style={styles.demoNote}>
                <View style={styles.demoTag}>
                  <Text style={styles.demoTagText}>DEMO MODE</Text>
                </View>
                <Text style={styles.demoCopy}>
                  Your OTP appears in the backend terminal.{'\n'}No text message will be sent.
                </Text>
              </View>
            </View>
          </View>
          <View style={styles.footer}>
            <LockKeyhole size={13} color={c.muted} />
            <Text style={styles.footerText}>
              Your numbers stay in your ledger. Your friendships stay easy.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.bg },
  scroll: { flexGrow: 1, padding: 24, maxWidth: 1240, width: '100%', alignSelf: 'center' },
  nav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 32,
    gap: 10,
  },
  smallTag: { flexDirection: 'row', gap: 6, alignItems: 'center', flexShrink: 1 },
  smallTagText: { fontFamily: f.medium, color: c.muted, fontSize: 11 },
  tagDot: { backgroundColor: c.green, width: 5, height: 5, borderRadius: 3 },
  main: { flex: 1, justifyContent: 'center', gap: 32, paddingVertical: 20 },
  mainWide: { flexDirection: 'row', alignItems: 'center', gap: 28 },
  story: { justifyContent: 'center' },
  eyebrow: { flexDirection: 'row', gap: 7, alignItems: 'center', marginBottom: 19 },
  eyebrowText: { fontFamily: f.bold, fontSize: 9, color: c.purple, letterSpacing: 1.1 },
  headline: {
    fontFamily: f.display,
    fontSize: 61,
    lineHeight: 66,
    color: c.ink,
    letterSpacing: -2.8,
  },
  description: {
    fontFamily: f.regular,
    fontSize: 16,
    lineHeight: 26,
    color: c.muted,
    marginTop: 18,
  },
  illustration: { height: 230, marginTop: 30, justifyContent: 'center', alignItems: 'center' },
  orbit: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 110,
    borderWidth: 1,
    borderColor: '#E4E5DB',
  },
  orbitInner: {
    position: 'absolute',
    width: 158,
    height: 158,
    borderRadius: 90,
    borderWidth: 1,
    borderColor: '#E4E5DB',
  },
  friendship: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: c.lime,
    justifyContent: 'center',
    alignItems: 'center',
    top: -28,
    transform: [{ rotate: '-10deg' }],
  },
  miniCard: {
    position: 'absolute',
    bottom: 37,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 19,
    backgroundColor: 'white',
    borderRadius: 17,
    boxShadow: '0 8px 30px rgba(37,41,56,0.06)',
    transform: [{ rotate: '-3deg' }],
  },
  miniAvatar: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: c.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniInitial: { color: c.purple, fontSize: 18, fontFamily: f.display },
  miniName: { color: c.ink, fontSize: 13, fontFamily: f.bold },
  miniMuted: { color: c.muted, fontSize: 10, fontFamily: f.regular, marginTop: 4 },
  miniAmount: { marginLeft: 'auto', color: c.ink, fontSize: 22, fontFamily: f.display },
  paidChip: {
    position: 'absolute',
    bottom: 5,
    right: -5,
    backgroundColor: c.greenSoft,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 9,
    flexDirection: 'row',
    gap: 6,
    transform: [{ rotate: '3deg' }],
  },
  paidChipText: { fontFamily: f.semi, fontSize: 10, color: c.green },
  spark: { position: 'absolute', right: 20, top: 25 },
  loginCard: {
    backgroundColor: '#fff',
    padding: 29,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: c.border,
    gap: 19,
    boxShadow: '0 10px 35px rgba(37,41,56,0.03)',
  },
  lock: {
    width: 49,
    height: 49,
    borderRadius: 16,
    backgroundColor: c.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontFamily: f.display, fontSize: 25, color: c.ink, letterSpacing: -0.8 },
  cardDescription: {
    fontFamily: f.regular,
    fontSize: 14,
    color: c.muted,
    lineHeight: 22,
    marginTop: -10,
    marginBottom: 3,
  },
  label: { fontFamily: f.semi, fontSize: 12, color: c.ink },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    minHeight: 54,
    paddingHorizontal: 13,
    gap: 10,
  },
  country: {
    fontFamily: f.bold,
    fontSize: 10,
    color: c.green,
    backgroundColor: c.greenSoft,
    padding: 5,
    borderRadius: 4,
  },
  countryCode: {
    fontFamily: f.medium,
    fontSize: 14,
    color: c.ink,
    paddingRight: 10,
    borderRightWidth: 1,
    borderRightColor: c.border,
  },
  phoneInput: {
    flex: 1,
    fontFamily: f.regular,
    fontSize: 16,
    color: c.ink,
    paddingVertical: 14,
    minWidth: 0,
  },
  hint: { fontFamily: f.regular, fontSize: 10, color: c.muted },
  otpInput: {
    backgroundColor: c.bg,
    borderColor: c.border,
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    textAlign: 'center',
    fontSize: 28,
    fontFamily: f.display,
    letterSpacing: 10,
    color: c.ink,
  },
  demoNote: { borderTopWidth: 1, borderTopColor: c.border, paddingTop: 18, gap: 8 },
  demoTag: {
    backgroundColor: c.bg,
    borderRadius: 4,
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  demoTagText: { fontFamily: f.bold, fontSize: 8, letterSpacing: 1, color: c.muted },
  demoCopy: { fontFamily: f.regular, fontSize: 11, lineHeight: 18, color: c.muted },
  back: { flexDirection: 'row', gap: 7, alignItems: 'center' },
  backText: { fontFamily: f.medium, color: c.muted, fontSize: 12 },
  resend: { fontFamily: f.semi, fontSize: 12, color: c.purple },
  footer: {
    marginTop: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: 8,
  },
  footerText: {
    fontFamily: f.regular,
    fontSize: 10,
    color: c.muted,
    flexShrink: 1,
    textAlign: 'center',
  },
});
