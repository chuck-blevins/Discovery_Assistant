import { useTheme } from 'next-themes'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { THEME_OPTIONS } from '@/lib/constants'

type ThemeValue = (typeof THEME_OPTIONS)[number]['value']

export function ThemeTab() {
  const { theme, setTheme, resolvedTheme } = useTheme()

  // theme can be undefined before hydration; treat as system for display
  const currentValue = (theme ?? 'system') as ThemeValue
  const effectiveTheme = resolvedTheme ?? 'light'

  return (
    <div className="space-y-6">
      <div>
        <label
          id="theme-label"
          className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1"
        >
          Appearance
        </label>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-2">
          Choose how the app looks. System follows your device or browser setting.
        </p>
        <Select
          value={currentValue}
          onValueChange={(value) => setTheme(value as ThemeValue)}
          aria-labelledby="theme-label"
        >
          <SelectTrigger className="w-72" aria-label="Appearance">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {THEME_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {currentValue === 'system' && (
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          Currently using: {effectiveTheme === 'dark' ? 'Dark' : 'Light'} (from system).
        </p>
      )}
    </div>
  )
}
