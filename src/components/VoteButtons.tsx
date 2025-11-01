"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import type { Option } from '@/lib/types'

interface VoteButtonsProps {
  questionId: string
  options: Option[]
  userVote?: string | null
  onOptimisticVote?: (optionKey: string) => void
  onVoteError?: () => void
}

export function VoteButtons({ questionId, options, userVote, onOptimisticVote, onVoteError }: VoteButtonsProps) {
  const [votingFor, setVotingFor] = useState<string | null>(null)
  const [hasVoted, setHasVoted] = useState(!!userVote)
  const supabase = createClient()
  const { toast } = useToast()

  // FIX: Sync hasVoted state with userVote prop changes
  useEffect(() => {
    setHasVoted(!!userVote)
  }, [userVote])

  const handleVote = async (optionKey: string) => {
    // Prevent double-clicks
    if (votingFor || hasVoted) return
    
    setVotingFor(optionKey)
    
    // Call optimistic update IMMEDIATELY
    onOptimisticVote?.(optionKey)
    
    try {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // Redirect to login
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'twitter',
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        })
        if (error) throw error
        return
      }

      // Call edge function
      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/cast_vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          question_id: questionId,
          option_key: optionKey,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to record vote')
      }

      setHasVoted(true)
      toast({
        title: "Vote recorded!",
        description: `You voted for ${options.find(o => o.key === optionKey)?.label}`,
      })
    } catch (error) {
      console.error('Vote error:', error)
      
      // Clear optimistic vote on error
      onVoteError?.()
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to record vote",
        variant: "destructive",
      })
    } finally {
      setVotingFor(null)
    }
  }

  return (
    <div className="flex flex-wrap gap-3">
      {options.map((option) => (
        <Button
          key={option.key}
          onClick={() => handleVote(option.key)}
          disabled={votingFor !== null || hasVoted}
          variant={userVote === option.key ? "default" : "outline"}
          size="lg"
          className="flex-1 text-lg px-8"
        >
          {votingFor === option.key && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          {option.label}
        </Button>
      ))}
    </div>
  )
}

