"use client"

import { useState } from 'react'
import { motion } from 'framer-motion'
import { VoterAvatars } from './VoterAvatars'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import type { Option } from '@/lib/types'
import type { VoteWithProfile } from '@/hooks/useVotes'

interface LiveResultsProps {
  options: Option[]
  votes: VoteWithProfile[]
}

export function LiveResults({ options, votes }: LiveResultsProps) {
  const [compactMode, setCompactMode] = useState(false)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">
          Live Results ({votes.length} {votes.length === 1 ? 'vote' : 'votes'})
        </h3>
        <div className="flex items-center gap-2">
          <Label htmlFor="compact-mode" className="text-sm cursor-pointer">
            {compactMode ? 'Compact' : 'Expanded'}
          </Label>
          <Switch
            id="compact-mode"
            checked={!compactMode}
            onCheckedChange={(checked) => setCompactMode(!checked)}
          />
        </div>
      </div>

      <motion.div
        layout
        className="grid gap-4 md:grid-cols-2"
      >
        {options.map((option) => (
          <VoterAvatars
            key={option.key}
            votes={votes}
            optionKey={option.key}
            optionLabel={option.label}
            totalVotes={votes.length}
            expandedMode={!compactMode}
          />
        ))}
      </motion.div>
    </div>
  )
}

