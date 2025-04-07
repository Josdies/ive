import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { chromeLocalStorage } from '../../shared/util/chromeLocalStorage'

export type Pages = 'scripts' | 'connect' | 'test'

export type NavigationStore = {
  page: Pages
  setPage: (page: Pages) => void
  isDevelopmentMode: boolean
}

export const useNavigationStore = create<NavigationStore>()(
  persist(
    (set) => ({
      page: 'connect',
      setPage: (page: Pages) => set({ page }),
      isDevelopmentMode: import.meta.env.DEV,
    }),
    {
      name: 'navigation-storage',
      storage: createJSONStorage(() => chromeLocalStorage),
      partialize: (state) => ({
        page: state.page,
      }),
    },
  ),
)
