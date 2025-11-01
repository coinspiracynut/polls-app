import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { LivePollView } from './LivePollView'

export const dynamic = 'force-dynamic'

export default async function PollPage({ params }: { params: { slug: string } }) {
  const supabase = await createClient()

  const { data: poll } = await supabase
    .from('polls')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!poll) {
    notFound()
  }

  const { data: { user } } = await supabase.auth.getUser()

  // Check if user is owner or admin
  const isOwner = user?.id === poll.owner_id
  let isAdmin = false
  if (user && !isOwner) {
    const { data: adminData } = await supabase
      .from('poll_admins')
      .select('user_id')
      .eq('poll_id', poll.id)
      .eq('user_id', user.id)
      .single()
    isAdmin = !!adminData
  }

  // If poll is draft and user is not owner/admin, show 404
  if (poll.status === 'draft' && !isOwner && !isAdmin) {
    notFound()
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2">{poll.title}</h1>
          {poll.description && (
            <p className="text-muted-foreground">{poll.description}</p>
          )}
        </div>
        {(isOwner || isAdmin) && (
          <Link href={`/p/${params.slug}/admin`}>
            <Button variant="outline">Admin Panel</Button>
          </Link>
        )}
      </div>

      {/* Draft Notice */}
      {poll.status === 'draft' && (isOwner || isAdmin) && (
        <Card className="mb-6 border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                  This poll is in draft mode
                </p>
                <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                  Only you can see this poll. Publish it to make it live.
                </p>
              </div>
              <Link href={`/p/${params.slug}/admin`}>
                <Button>Publish</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Closed Notice */}
      {poll.status === 'closed' && (
        <Card className="mb-6 border-gray-500 bg-gray-50 dark:bg-gray-950">
          <CardContent className="pt-6">
            <p className="font-semibold text-gray-900 dark:text-gray-100">
              This poll is closed
            </p>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              Voting has ended. Viewing final results.
            </p>
          </CardContent>
        </Card>
      )}

      <ErrorBoundary>
        <Card>
          <CardContent className="pt-6">
            <LivePollView pollId={poll.id} pollSlug={params.slug} pollStatus={poll.status} />
          </CardContent>
        </Card>
      </ErrorBoundary>
    </div>
  )
}

