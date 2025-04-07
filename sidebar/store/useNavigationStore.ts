import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { chromeLocalStorage } from '../../shared/chromeLocalStorage'

export type Pages = 'scripts' | 'connect'

export type NavigationStore = {
  page: Pages
  setPage: (page: Pages) => void
}

export const useNavigationStore = create<NavigationStore>()(
  persist(
    (set) => ({
      page: 'connect',
      setPage: (page: Pages) => set({ page }),
    }),
    {
      name: 'navigation-storage',
      storage: createJSONStorage(() => chromeLocalStorage),
    },
  ),
)
