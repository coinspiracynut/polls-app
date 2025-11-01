import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AdminPanel } from './AdminPanel'

export const dynamic = 'force-dynamic'

export default async function AdminPage({ params }: { params: { slug: string } }) {
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

  if (!user) {
    redirect(`/p/${params.slug}`)
  }

  // Check if user is owner or admin
  const isOwner = user.id === poll.owner_id
  let isAdmin = false
  if (!isOwner) {
    const { data: adminData } = await supabase
      .from('poll_admins')
      .select('user_id')
      .eq('poll_id', poll.id)
      .eq('user_id', user.id)
      .single()
    isAdmin = !!adminData
  }

  if (!isOwner && !isAdmin) {
    redirect(`/p/${params.slug}`)
  }

  // Fetch all questions
  const { data: questions } = await supabase
    .from('questions')
    .select('*')
    .eq('poll_id', poll.id)
    .order('idx')

  // Fetch options for the first question
  const firstQuestion = questions?.[0]
  let options: any[] = []
  if (firstQuestion) {
    const { data: optionsData } = await supabase
      .from('options')
      .select('*')
      .eq('question_id', firstQuestion.id)
      .order('key')
    options = optionsData ?? []
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-4xl font-bold mb-2">Admin: {poll.title}</h1>
          <p className="text-muted-foreground">Manage your poll</p>
        </div>
        <Link href={`/p/${params.slug}`}>
          <Button variant="outline">
            {poll.status === 'draft' ? 'Preview' : 'View Live Poll'}
          </Button>
        </Link>
      </div>

      <AdminPanel 
        poll={poll} 
        questions={questions ?? []} 
        options={options}
      />
    </div>
  )
}

