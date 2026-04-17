'use client'
import { useEffect } from 'react'
import { useUser } from '@clerk/nextjs'
import { useAuthStore } from '@/stores/auth-store'

export function useUserData() {
  const { user, isLoaded: clerkLoaded } = useUser()
  const { setProfile, setSubscription, setMetrics, setPrefs, setLoaded, reset } = useAuthStore()

  useEffect(() => {
    if (!clerkLoaded) return

    if (!user) {
      reset()
      return
    }

    fetch('/api/auth/profile')
      .then(r => r.json())
      .then(data => {
        if (data.profile)      setProfile(data.profile)
        if (data.subscription) setSubscription(data.subscription)
        if (data.metrics)      setMetrics(data.metrics)
        if (data.prefs)        setPrefs(data.prefs)
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [clerkLoaded, user?.id])
}
