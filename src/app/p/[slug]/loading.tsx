import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function PollLoading() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <Skeleton className="h-10 w-96 mb-2" />
        <Skeleton className="h-5 w-64" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <Skeleton className="h-8 w-full mb-6" />
          <div className="flex gap-3 mb-8">
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
            <Skeleton className="h-12 w-32" />
          </div>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    </div>
  )
}

