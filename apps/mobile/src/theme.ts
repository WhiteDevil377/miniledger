export const colors = {
  bg: '#F7F8F2',
  paper: '#FFFFFF',
  ink: '#252938',
  muted: '#747782',
  border: '#E5E7DF',
  purple: '#7160D3',
  purpleSoft: '#F0EDFC',
  lime: '#D9F59A',
  green: '#39745B',
  greenSoft: '#EDF5EC',
  red: '#B94E3C',
  redSoft: '#FFF0E9',
  navy: '#292D42',
};
export const fonts = {
  regular: 'DMSans_400Regular',
  medium: 'DMSans_500Medium',
  semi: 'DMSans_600SemiBold',
  bold: 'DMSans_700Bold',
  display: 'SpaceGrotesk_600SemiBold',
};
export const money = (value: string | number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: Number(value) % 1 ? 2 : 0,
  }).format(Number(value));
export const prettyDate = (value: string, timeZone = 'Asia/Kolkata') =>
  new Date(value.includes('T') ? value : `${value}T12:00:00Z`).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    timeZone: value.includes('T') ? timeZone : 'UTC',
  });
export function localDate(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
