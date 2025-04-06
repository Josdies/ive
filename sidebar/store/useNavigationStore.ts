import { create } from 'zustand'

export type Pages = 'scripts' | 'connect'

export type NavigationStore = {
  page: Pages
  setPage: (page: Pages) => void
}

export const useNavigationStore = create<NavigationStore>((set) => ({
  page: 'scripts',
  setPage: (page: Pages) => set({ page }),
}))
