"use client"

import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import type { VoteWithProfile } from '@/hooks/useVotes'

interface VoterAvatarsProps {
  votes: VoteWithProfile[]
  optionKey: string
  optionLabel: string
  totalVotes: number
  expandedMode?: boolean
}

export function VoterAvatars({ votes, optionKey, optionLabel, totalVotes, expandedMode = false }: VoterAvatarsProps) {
  const [showAll, setShowAll] = useState(false)
  
  const optionVotes = votes.filter(v => v.option_key === optionKey)
  const count = optionVotes.length
  const percentage = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0

  const displayLimit = showAll ? optionVotes.length : Math.min(12, optionVotes.length)
  const hasMore = optionVotes.length > displayLimit

  return (
    <motion.div
      layout
      className="border-2 rounded-xl p-6 bg-card hover:border-primary/50 transition-colors"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold">{optionLabel}</h3>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary">{count}</div>
          <div className="text-sm text-muted-foreground">{percentage}%</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-secondary rounded-full overflow-hidden mb-6">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Avatars */}
      {count > 0 ? (
        <>
          <div className="flex flex-wrap gap-3">
            <AnimatePresence mode="popLayout">
              {optionVotes.slice(0, displayLimit).map((vote, index) => (
                <motion.div
                  key={vote.id}
                  layout
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.03,
                    layout: { duration: 0.3 }
                  }}
                  className={expandedMode ? "flex items-center gap-2 bg-secondary/50 rounded-full pr-3" : ""}
                >
                  <Avatar className="h-12 w-12 border-2 border-background shadow-lg">
                    <AvatarImage src={vote.profiles?.avatar_url ?? undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/5">
                      {vote.profiles?.handle?.charAt(0).toUpperCase() ?? '?'}
                    </AvatarFallback>
                  </Avatar>
                  {expandedMode && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="text-sm font-medium whitespace-nowrap"
                    >
                      {vote.profiles?.handle ?? 'Anonymous'}
                    </motion.span>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {hasMore && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAll(!showAll)}
              className="mt-4 w-full"
            >
              {showAll ? 'Show less' : `Show ${optionVotes.length - displayLimit} more`}
            </Button>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          No votes yet
        </div>
      )}
    </motion.div>
  )
}

