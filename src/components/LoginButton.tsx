"use client"

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export function LoginButton() {
  const supabase = createClient()
  const router = useRouter()

  const handleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'twitter',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      console.error('Login error:', error)
    }
  }

  return (
    <Button onClick={handleLogin}>
      Login with Twitter
    </Button>
  )
}

