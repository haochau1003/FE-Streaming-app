/**
 * Extra design tokens used across the Content Library, in addition to the
 * existing `Colors` / `Fonts` in `constants/theme.ts`. Light values come from
 * the Figma file; dark values are derived to maintain contrast against the
 * existing app dark mode.
 */
export const ContentLibraryTokens = {
  light: {
    bgPage: '#f0f0f0',
    bgCard: '#ffffff',
    tilePlaceholder: '#d9d9d9',
    accentDanger: '#f54040',
    accentUpload: '#a259ff',
    avatarBg: '#EADDFF',
    avatarFg: '#4F378A',
    textPrimary: '#000000',
    textSecondary: 'rgba(0,0,0,0.65)',
    textTertiary: 'rgba(0,0,0,0.44)',
    border: 'rgba(0,0,0,0.08)',
    chipPublic: '#22c55e',
    chipUnlisted: '#eab308',
    chipPrivate: '#64748b',
    overlay: 'rgba(0,0,0,0.45)',
  },
  dark: {
    bgPage: '#101113',
    bgCard: '#1c1f22',
    tilePlaceholder: '#2a2d31',
    accentDanger: '#ff6363',
    accentUpload: '#bd8bff',
    avatarBg: '#2a1f47',
    avatarFg: '#e4d6ff',
    textPrimary: '#ffffff',
    textSecondary: 'rgba(255,255,255,0.72)',
    textTertiary: 'rgba(255,255,255,0.48)',
    border: 'rgba(255,255,255,0.08)',
    chipPublic: '#34d399',
    chipUnlisted: '#facc15',
    chipPrivate: '#94a3b8',
    overlay: 'rgba(0,0,0,0.65)',
  },
};

export type ContentLibraryTokenName = keyof typeof ContentLibraryTokens.light;

export function getToken(
  scheme: 'light' | 'dark',
  name: ContentLibraryTokenName,
): string {
  return ContentLibraryTokens[scheme][name];
}
