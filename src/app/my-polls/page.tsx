import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { Poll, PollStatus } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function MyPollsPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/')
  }

  const { data: polls } = await supabase
    .from('polls')
    .select('*')
    .eq('owner_id', user.id)
    .order('created_at', { ascending: false })

  const groupedPolls = {
    draft: polls?.filter(p => p.status === 'draft') || [],
    live: polls?.filter(p => p.status === 'live') || [],
    closed: polls?.filter(p => p.status === 'closed') || [],
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold mb-2">My Polls</h1>
          <p className="text-muted-foreground">
            Manage your polls and see how they&apos;re performing
          </p>
        </div>
        <Link href="/new">
          <Button>Create Poll</Button>
        </Link>
      </div>

      {/* Drafts */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Drafts ({groupedPolls.draft.length})</h2>
        {groupedPolls.draft.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No drafts</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {groupedPolls.draft.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        )}
      </section>

      {/* Live */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Live ({groupedPolls.live.length})</h2>
        {groupedPolls.live.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No live polls</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {groupedPolls.live.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        )}
      </section>

      {/* Closed */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Closed ({groupedPolls.closed.length})</h2>
        {groupedPolls.closed.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No closed polls</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {groupedPolls.closed.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function PollCard({ poll }: { poll: Poll }) {
  const getStatusBadge = (status: PollStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'live':
        return <Badge className="bg-green-500">Live</Badge>
      case 'closed':
        return <Badge variant="outline">Closed</Badge>
    }
  }

  const getActions = (poll: Poll) => {
    if (poll.status === 'draft') {
      return (
        <div className="flex gap-2">
          <Link href={`/p/${poll.slug}/admin`}>
            <Button size="sm" variant="outline">Edit</Button>
          </Link>
          <Link href={`/p/${poll.slug}/admin`}>
            <Button size="sm">Publish</Button>
          </Link>
        </div>
      )
    }
    if (poll.status === 'live') {
      return (
        <div className="flex gap-2">
          <Link href={`/p/${poll.slug}`}>
            <Button size="sm" variant="outline">View</Button>
          </Link>
          <Link href={`/p/${poll.slug}/admin`}>
            <Button size="sm">Manage</Button>
          </Link>
        </div>
      )
    }
    return (
      <Link href={`/p/${poll.slug}`}>
        <Button size="sm" variant="outline">View Results</Button>
      </Link>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-xl">{poll.title}</CardTitle>
              {getStatusBadge(poll.status)}
            </div>
            <CardDescription>
              {poll.is_public ? 'Public' : 'Private'} • 
              Created {new Date(poll.created_at).toLocaleDateString()}
              {poll.published_at && ` • Published ${new Date(poll.published_at).toLocaleDateString()}`}
            </CardDescription>
          </div>
          {getActions(poll)}
        </div>
      </CardHeader>
    </Card>
  )
}

