import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Haptic = 'handy' | 'intiface'
export type HandyConfig = {
  connectionKey: string
}

export type HapticStore = {
  haptic: Haptic | null
  setHaptic: (haptic: Haptic | null) => void
  config: { handy?: HandyConfig }
  setConfig: (type: Haptic, config: HandyConfig | null) => void
}

export const useHapticStore = create<HapticStore>()(
  persist(
    (set) => ({
      haptic: null,
      setHaptic: (haptic) => set({ haptic }),
      config: {},
      setConfig: (type, config) => set({ [type]: config }),
    }),
    {
      name: 'haptic-storage',
    },
  ),
)
