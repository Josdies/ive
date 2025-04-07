import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { chromeLocalStorage } from '../../shared/util/chromeLocalStorage'

export type Haptic = 'handy' | 'intiface'

export type HandyConfig = {
  connectionKey: string
  offset: number
  stroke: {
    min: number
    max: number
  }
}

export type IntifaceConfig = {
  ws: string
}

export type HapticStore = {
  haptic: Haptic | null
  setHaptic: (haptic: Haptic | null) => void
  config: {
    handy: HandyConfig
    intiface: IntifaceConfig
  }
  setConfig: (type: Haptic, config: HandyConfig | IntifaceConfig | null) => void
}

export const useHapticStore = create<HapticStore>()(
  persist(
    (set) => ({
      haptic: null,
      setHaptic: (haptic) => set({ haptic }),
      config: {
        handy: {
          connectionKey: '',
          offset: 0,
          stroke: {
            min: 0,
            max: 0,
          },
        },
        intiface: {
          ws: '',
        },
      },
      setConfig: (type, config) =>
        set((state) => ({
          config: { ...state.config, [type]: config },
        })),
    }),
    {
      name: 'haptic-storage',
      storage: createJSONStorage(() => chromeLocalStorage),
    },
  ),
)
