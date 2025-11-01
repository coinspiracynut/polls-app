"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Question, Tally } from '@/lib/types'

const isDevelopment = process.env.NODE_ENV === 'development'

export function useLiveQuestion(pollId: string | undefined) {
  const [question, setQuestion] = useState<Question | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!pollId) {
      setQuestion(null)
      return
    }

    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    // Initial fetch
    const fetchLiveQuestion = async () => {
      if (!mounted) return

      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .eq('poll_id', pollId)
        .eq('is_live', true)
        .maybeSingle()

      if (error) {
        console.error('Error fetching live question:', error)
        return
      }

      if (mounted) {
        setQuestion(data ?? null)
      }
    }

    fetchLiveQuestion()

    // Subscribe to realtime changes
    channel = supabase
      .channel(`questions-${pollId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `poll_id=eq.${pollId}`,
        },
        (payload) => {
          if (!mounted) return

          const row = payload.new as Question
          
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            if (row?.is_live) {
              setQuestion(row)
            } else if (payload.old && 'is_live' in payload.old && (payload.old as any).is_live) {
              // This question was live but now isn't
              setQuestion(null)
            }
          } else if (payload.eventType === 'DELETE') {
            setQuestion(null)
          }
        }
      )
      .subscribe((status) => {
        if (isDevelopment) {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to live question:', pollId)
          }
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('Question subscription closed/errored:', status)
          }
        }
      })

    return () => {
      mounted = false
      if (channel) {
        supabase.removeChannel(channel).then(() => {
          if (isDevelopment) {
            console.log('Unsubscribed from live question:', pollId)
          }
        })
      }
    }
  }, [pollId]) // Removed supabase from deps - it's stable by design

  return question
}

export function useTallies(questionId: string | undefined) {
  const [counts, setCounts] = useState<Record<string, number>>({})
  const supabase = createClient()

  useEffect(() => {
    if (!questionId) {
      setCounts({})
      return
    }

    let mounted = true
    let channel: ReturnType<typeof supabase.channel> | null = null

    // Initial fetch
    const fetchTallies = async () => {
      if (!mounted) return

      const { data, error } = await supabase
        .from('tallies')
        .select('counts')
        .eq('question_id', questionId)
        .maybeSingle()

      if (error) {
        console.error('Error fetching tallies:', error)
        return
      }

      if (mounted && data?.counts) {
        setCounts(data.counts as Record<string, number>)
      }
    }

    fetchTallies()

    // Subscribe to realtime changes
    channel = supabase
      .channel(`tallies-${questionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tallies',
          filter: `question_id=eq.${questionId}`,
        },
        (payload) => {
          if (!mounted) return
          const row = payload.new as Tally
          if (row?.counts) {
            setCounts(row.counts)
          }
        }
      )
      .subscribe((status) => {
        if (isDevelopment) {
          if (status === 'SUBSCRIBED') {
            console.log('Subscribed to tallies:', questionId)
          }
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.warn('Tallies subscription closed/errored:', status)
          }
        }
      })

    return () => {
      mounted = false
      if (channel) {
        supabase.removeChannel(channel).then(() => {
          if (isDevelopment) {
            console.log('Unsubscribed from tallies:', questionId)
          }
        })
      }
    }
  }, [questionId]) // Removed supabase from deps - it's stable by design

  return counts
}

