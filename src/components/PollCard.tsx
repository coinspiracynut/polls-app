import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import type { PollWithOwner } from '@/lib/types'

export function PollCard({ poll }: { poll: PollWithOwner }) {
  const wasEdited = poll.edited_at && poll.published_at && 
    new Date(poll.edited_at) > new Date(poll.published_at)

  return (
    <Link href={`/p/${poll.slug}`}>
      <Card className="hover:border-primary transition-colors cursor-pointer">
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex-1">{poll.title}</CardTitle>
            {wasEdited && (
              <Badge variant="outline" className="text-xs">Edited</Badge>
            )}
          </div>
          {poll.description && (
            <CardDescription className="line-clamp-2">{poll.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={poll.profiles?.avatar_url ?? undefined} />
              <AvatarFallback>
                {poll.profiles?.handle?.charAt(0).toUpperCase() ?? '?'}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm text-muted-foreground">
              @{poll.profiles?.handle ?? 'anonymous'}
            </span>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

