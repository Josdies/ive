import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { chromeLocalStorage } from '../../shared/util/chromeLocalStorage'

export type Haptic = 'handy' | 'intiface'

export type HapticStore = {
  haptic: Haptic | null
  setHaptic: (haptic: Haptic | null) => void
}

export const useHapticStore = create<HapticStore>()(
  persist(
    (set) => ({
      haptic: null,
      setHaptic: (haptic) => set({ haptic }),
    }),
    {
      name: 'haptic-storage',
      storage: createJSONStorage(() => chromeLocalStorage),
    },
  ),
)
