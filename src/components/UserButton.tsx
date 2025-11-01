"use client"

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import type { OAuthUserMetadata } from '@/lib/types'

export function UserButton({ user }: { user: User }) {
  const supabase = createClient()
  const router = useRouter()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.refresh()
  }

  const metadata = user.user_metadata as OAuthUserMetadata
  const avatarUrl = metadata?.avatar_url || metadata?.picture
  const handle = metadata?.user_name || metadata?.name || metadata?.preferred_username || user.email?.split('@')[0]

  return (
    <div className="flex items-center gap-4">
      <Avatar>
        <AvatarImage src={avatarUrl} alt={handle} />
        <AvatarFallback>{handle?.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="text-sm font-medium">{handle}</span>
      <Button variant="ghost" onClick={handleLogout}>
        Logout
      </Button>
    </div>
  )
}

