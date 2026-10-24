import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { ArrowUpRight, BookOpen, CircleAlert, X } from 'lucide-react-native';
import { colors as c, fonts as f } from '../theme';

export function Brand({ small = false }: { small?: boolean }) {
  return (
    <View style={s.brand}>
      <View style={[s.brandIcon, small && { width: 32, height: 32 }]}>
        <BookOpen size={small ? 18 : 22} color={c.ink} strokeWidth={2.2} />
      </View>
      <Text style={[s.brandText, small && { fontSize: 21 }]}>
        mini<Text style={{ color: c.purple }}>ledger</Text>
        <Text style={{ color: c.purple }}>.</Text>
      </Text>
    </View>
  );
}
export function Button({
  label,
  onPress,
  loading,
  secondary,
  icon,
  style,
  disabled,
  testID,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  secondary?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  disabled?: boolean;
  testID?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      disabled={loading || disabled}
      style={({ pressed }) => [
        s.button,
        secondary && s.secondary,
        style,
        (pressed || disabled || loading) && { opacity: 0.65 },
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={secondary ? c.ink : '#fff'} />
      ) : (
        <>
          {icon}
          <Text style={[s.buttonText, secondary && { color: c.ink }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}
export function IconButton({
  label,
  onPress,
  children,
  style,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [s.iconButton, style, pressed && { opacity: 0.5 }]}
    >
      {children}
    </Pressable>
  );
}
export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput
        placeholderTextColor="#999AA2"
        {...props}
        accessibilityLabel={label}
        style={[
          s.input,
          props.multiline && { minHeight: 86, textAlignVertical: 'top' },
          error && { borderColor: c.red },
          props.style,
        ]}
      />
      {!!error && <Text style={s.fieldError}>{error}</Text>}
    </View>
  );
}
export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <View accessibilityRole="alert" style={s.error}>
      <CircleAlert size={18} color={c.red} />
      <Text style={s.errorText}>{message}</Text>
    </View>
  );
}
export function Pill({
  text,
  color = c.purple,
  background = c.purpleSoft,
}: {
  text: string;
  color?: string;
  background?: string;
}) {
  return (
    <View style={[s.pill, { backgroundColor: background }]}>
      <View style={[s.dot, { backgroundColor: color }]} />
      <Text style={[s.pillText, { color }]}>{text}</Text>
    </View>
  );
}
export function Close({ onPress }: { onPress: () => void }) {
  return (
    <IconButton label="Close" onPress={onPress}>
      <X size={21} color={c.ink} />
    </IconButton>
  );
}
export function LoadingScreen() {
  return (
    <View style={s.loading}>
      <Brand />
      <ActivityIndicator color={c.purple} style={{ marginTop: 25 }} />
    </View>
  );
}
export function Arrow({ color = c.ink }: { color?: string }) {
  return <ArrowUpRight size={18} color={color} />;
}

export const s = StyleSheet.create({
  brand: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    backgroundColor: c.lime,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-6deg' }],
  },
  brandText: { fontFamily: f.display, fontSize: 25, letterSpacing: -1.2, color: c.ink },
  button: {
    backgroundColor: c.purple,
    minHeight: 52,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
  },
  secondary: { backgroundColor: c.bg, borderWidth: 1, borderColor: c.border },
  buttonText: { fontFamily: f.bold, fontSize: 14, color: '#fff' },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  label: { color: c.ink, fontFamily: f.semi, fontSize: 13 },
  input: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 14,
    minHeight: 52,
    fontFamily: f.regular,
    fontSize: 15,
    color: c.ink,
    backgroundColor: '#fff',
  },
  fieldError: { fontFamily: f.regular, color: c.red, fontSize: 12 },
  error: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: c.redSoft,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  errorText: { color: c.red, fontFamily: f.medium, fontSize: 13, lineHeight: 20, flex: 1 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 7,
    paddingHorizontal: 8,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  pillText: { fontFamily: f.semi, fontSize: 10 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  loading: { flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center' },
});
