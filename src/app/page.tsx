import { createClient } from '@/lib/supabase/server'
import { PollCard } from '@/components/PollCard'
import type { PollWithOwner } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()

  // Fetch polls
  const { data: pollsData } = await supabase
    .from('polls')
    .select('*')
    .eq('is_public', true)
    .eq('status', 'live') // Only show live polls in discovery
    .order('published_at', { ascending: false })
    .limit(50)

  // Fetch profiles for poll owners
  const ownerIds = pollsData?.map(p => p.owner_id) ?? []
  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, handle, avatar_url')
    .in('id', ownerIds)

  // Combine polls with their owner profiles
  const polls = pollsData?.map(poll => ({
    ...poll,
    profiles: profilesData?.find(p => p.id === poll.owner_id) ?? null
  }))

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Discover Public Polls</h1>
        <p className="text-muted-foreground">
          Explore live polls and participate in real-time discussions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {polls?.map((poll) => (
          <PollCard key={poll.id} poll={poll as PollWithOwner} />
        ))}
      </div>

      {(!polls || polls.length === 0) && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No public polls yet. Be the first to create one!</p>
        </div>
      )}
    </div>
  )
}

