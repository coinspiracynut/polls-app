"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface VoteWithProfile {
  id: number
  option_key: string
  user_id: string
  created_at: string
  profiles: {
    handle: string | null
    avatar_url: string | null
  }
}

const isDevelopment = process.env.NODE_ENV === 'development'

export function useVotes(questionId: string | undefined) {
  const [votes, setVotes] = useState<VoteWithProfile[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!questionId) {
      setVotes([])
      return
    }

    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    // Initial fetch
    const fetchVotes = async () => {
      if (!mounted) return
      
      // Fetch votes
      const { data: votesData, error: votesError } = await supabase
        .from('votes')
        .select('id, option_key, user_id, created_at')
        .eq('question_id', questionId)
        .order('created_at', { ascending: true })

      if (votesError) {
        console.error('Error fetching votes:', votesError)
        return
      }

      if (!votesData || votesData.length === 0) {
        if (mounted) setVotes([])
        return
      }

      // Fetch profiles for voters
      const userIds = votesData.map(v => v.user_id)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, handle, avatar_url')
        .in('id', userIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
      }

      // Combine votes with profiles
      const votesWithProfiles: VoteWithProfile[] = votesData.map(vote => ({
        ...vote,
        profiles: profilesData?.find(p => p.id === vote.user_id) ?? {
          handle: null,
          avatar_url: null
        }
      }))

      if (mounted) {
        setVotes(votesWithProfiles)
      }
    }

    fetchVotes()

    // Subscribe to realtime changes
    channel = supabase
      .channel(`votes-${questionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'votes',
          filter: `question_id=eq.${questionId}`,
        },
        () => {
          if (mounted) {
            fetchVotes()
          }
        }
      )
      .subscribe((status) => {
        if (isDevelopment) {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to votes:', questionId)
          }
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('Vote subscription closed/errored:', status)
          }
        }
      })

    // Cleanup function
    return () => {
      mounted = false
      if (channel) {
        supabase.removeChannel(channel).then(() => {
          if (isDevelopment) {
            console.log('Unsubscribed from votes:', questionId)
          }
        })
      }
    }
  }, [questionId]) // Removed supabase from deps - it's stable by design

  return votes
}

