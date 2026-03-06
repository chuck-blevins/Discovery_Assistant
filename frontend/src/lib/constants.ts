export const OBJECTIVE_LABELS: Record<string, string> = {
  'problem-validation': 'Problem Validation',
  'positioning': 'Positioning',
  'persona-buildout': 'Persona Build-out',
  'icp-refinement': 'ICP Refinement',
}

/** Theme options for Appearance / theme toggle (next-themes: light | dark | system). */
export const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System (use OS/browser preference)' },
] as const
