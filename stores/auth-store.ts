import { create } from 'zustand'
import type { Profile, Subscription, UserMetrics, DietaryPreferences } from '@/types/app'

interface AuthState {
  profile:      Profile | null
  subscription: Subscription | null
  metrics:      UserMetrics | null
  prefs:        DietaryPreferences | null
  loaded:       boolean
  setProfile:      (p: Profile | null) => void
  setSubscription: (s: Subscription | null) => void
  setMetrics:      (m: UserMetrics | null) => void
  setPrefs:        (p: DietaryPreferences | null) => void
  setLoaded:       (v: boolean) => void
  isPremium: () => boolean
  reset: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  profile:      null,
  subscription: null,
  metrics:      null,
  prefs:        null,
  loaded:       false,

  setProfile:      (p) => set({ profile: p }),
  setSubscription: (s) => set({ subscription: s }),
  setMetrics:      (m) => set({ metrics: m }),
  setPrefs:        (p) => set({ prefs: p }),
  setLoaded:       (v) => set({ loaded: v }),

  isPremium: () => {
    const s = get().subscription
    return s?.plan === 'premium' && s?.status === 'active'
  },

  reset: () => set({ profile: null, subscription: null, metrics: null, prefs: null, loaded: false }),
}))
