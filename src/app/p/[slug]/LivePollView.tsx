"use client"

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLiveQuestion } from '@/hooks/useRealtime'
import { useVotes, type VoteWithProfile } from '@/hooks/useVotes'
import { VoteButtons } from '@/components/VoteButtons'
import { LiveResults } from '@/components/LiveResults'
import { AvatarWall } from '@/components/AvatarWall'
import type { Option, OAuthUserMetadata } from '@/lib/types'

interface LivePollViewProps {
  pollId: string
  pollSlug: string
  pollStatus: string
}

export function LivePollView({ pollId, pollStatus }: LivePollViewProps) {
  const liveQuestion = useLiveQuestion(pollId)
  const votes = useVotes(liveQuestion?.id)
  const [options, setOptions] = useState<Option[]>([])
  const [userVote, setUserVote] = useState<string | null>(null)
  const [optimisticVote, setOptimisticVote] = useState<VoteWithProfile | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (!liveQuestion?.id) {
      setOptions([])
      setUserVote(null)
      return
    }

    // Fetch options for the live question
    const fetchOptions = async () => {
      const { data } = await supabase
        .from('options')
        .select('*')
        .eq('question_id', liveQuestion.id)
        .order('key')

      if (data) {
        setOptions(data)
      }

      // Check if user has already voted
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: vote } = await supabase
          .from('votes')
          .select('option_key')
          .eq('question_id', liveQuestion.id)
          .eq('user_id', user.id)
          .maybeSingle()

        setUserVote(vote?.option_key ?? null)
      }
    }

    fetchOptions()
  }, [liveQuestion?.id])

  // Handle optimistic vote
  const handleOptimisticVote = async (optionKey: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const metadata = user.user_metadata as OAuthUserMetadata

    // Create optimistic vote to show immediately
    setOptimisticVote({
      id: Date.now() + Math.random(), // Unique temporary ID
      option_key: optionKey,
      user_id: user.id,
      created_at: new Date().toISOString(),
      profiles: {
        handle: metadata?.user_name || metadata?.name || metadata?.preferred_username || null,
        avatar_url: metadata?.avatar_url || metadata?.picture || null,
      }
    })
    setUserVote(optionKey)
  }

  // Handle vote error - clear optimistic vote
  const handleVoteError = () => {
    setOptimisticVote(null)
    setUserVote(null)
  }

  // Merge optimistic vote with real votes for display
  const displayVotes = optimisticVote 
    ? [...votes, optimisticVote]
    : votes

  // Clear optimistic vote once real vote arrives
  useEffect(() => {
    if (optimisticVote && votes.some(v => v.user_id === optimisticVote.user_id)) {
      setOptimisticVote(null)
    }
  }, [votes, optimisticVote])

  // Draft status - show preview message
  if (pollStatus === 'draft') {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          This poll is in draft mode. No questions are live yet.
        </p>
      </div>
    )
  }

  // No live question (either not started yet or all questions closed)
  if (!liveQuestion) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground text-lg">
          {pollStatus === 'closed' 
            ? 'This poll has ended.'
            : 'Waiting for the next question...'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold mb-6">{liveQuestion.prompt}</h2>
        {!userVote && (
          <VoteButtons 
            questionId={liveQuestion.id} 
            options={options}
            onOptimisticVote={handleOptimisticVote}
            onVoteError={handleVoteError}
          />
        )}
        {userVote && (
          <div className="bg-primary/10 border-2 border-primary rounded-lg p-4 mb-4">
            <p className="text-sm font-medium">
              ✓ You voted: <strong>{options.find(o => o.key === userVote)?.label}</strong>
            </p>
          </div>
        )}
      </div>

      {displayVotes.length > 0 && (
        <LiveResults options={options} votes={displayVotes} />
      )}

      <AvatarWall pollId={pollId} />
    </div>
  )
}

