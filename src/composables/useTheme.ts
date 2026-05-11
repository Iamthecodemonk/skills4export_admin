import { computed, onMounted, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'Skills4Export-theme'
const theme = ref<ThemeMode>('system')

function systemPrefersDark() {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

function applyTheme(mode: ThemeMode) {
  const resolved = mode === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : mode
  document.documentElement.dataset.theme = resolved
}

export function useTheme() {
  const resolvedTheme = computed(() => {
    if (theme.value === 'system') return systemPrefersDark() ? 'dark' : 'light'
    return theme.value
  })

  function setTheme(mode: ThemeMode) {
    theme.value = mode
    localStorage.setItem(STORAGE_KEY, mode)
    applyTheme(mode)
  }

  onMounted(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
    theme.value = saved ?? 'system'
    applyTheme(theme.value)

    window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener('change', () => {
      if (theme.value === 'system') applyTheme('system')
    })
  })

  return { theme, resolvedTheme, setTheme }
}
