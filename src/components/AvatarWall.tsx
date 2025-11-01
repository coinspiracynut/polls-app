"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Participant, OAuthUserMetadata } from '@/lib/types'

interface AvatarWallProps {
  pollId: string
}

export function AvatarWall({ pollId }: AvatarWallProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const supabase = createClient()

  useEffect(() => {
    let mounted = true

    // Initial fetch
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from('participants')
        .select('*')
        .eq('poll_id', pollId)
        .order('last_seen', { ascending: false })
        .limit(20)

      if (mounted && data) {
        setParticipants(data)
      }
    }

    fetchParticipants()

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`participants-${pollId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'participants',
          filter: `poll_id=eq.${pollId}`,
        },
        () => {
          // Refetch on any change
          fetchParticipants()
        }
      )
      .subscribe()

    // Update own presence heartbeat (30 seconds, only when tab is visible)
    const updatePresence = async () => {
      // Only update if tab is visible (saves writes on background tabs)
      // SSR-safe check
      if (typeof document !== 'undefined' && document.hidden) return
      
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const metadata = user.user_metadata as OAuthUserMetadata
        await supabase.from('participants').upsert({
          poll_id: pollId,
          user_id: user.id,
          handle: metadata?.user_name || metadata?.name || metadata?.preferred_username,
          avatar_url: metadata?.avatar_url || metadata?.picture,
          last_seen: new Date().toISOString(),
        })
      }
    }

    // Initial presence update
    updatePresence()
    
    // Update every 30 seconds
    const interval = setInterval(updatePresence, 30000)

    // Update immediately when user returns to tab
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        updatePresence()
      }
    }
    
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange)
    }

    return () => {
      mounted = false
      clearInterval(interval)
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange)
      }
      supabase.removeChannel(channel)
    }
  }, [pollId])

  if (participants.length === 0) return null

  return (
    <div className="border-t pt-4">
      <h3 className="text-sm font-medium mb-3">Active participants ({participants.length})</h3>
      <div className="flex flex-wrap gap-2">
        {participants.map((p) => (
          <Avatar key={p.user_id} className="h-10 w-10">
            <AvatarImage src={p.avatar_url ?? undefined} alt={p.handle ?? undefined} />
            <AvatarFallback>
              {p.handle?.charAt(0).toUpperCase() ?? '?'}
            </AvatarFallback>
          </Avatar>
        ))}
      </div>
    </div>
  )
}

