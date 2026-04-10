'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { create } from 'zustand'

interface AuthState {
  user: any | null
  loading: boolean
  setUser: (user: any | null) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
}))

export function useAuth() {
  const { data: session, status } = useSession()
  
  return {
    user: session?.user || null,
    loading: status === 'loading',
    signIn: (email: string, password: string) => 
      signIn('credentials', { email, password, callbackUrl: '/dashboard' }),
    signOut: () => signOut({ callbackUrl: '/login' }),
  }
}
