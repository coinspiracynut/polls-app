"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { X, Plus } from 'lucide-react'
import type { PollStatus } from '@/lib/types'

export function NewPollForm() {
  const [prompt, setPrompt] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [isPublic, setIsPublic] = useState(true)
  const [creating, setCreating] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const addOption = () => {
    setOptions([...options, ''])
  }

  const removeOption = (index: number) => {
    if (options.length <= 2) return // Minimum 2 options
    setOptions(options.filter((_, i) => i !== index))
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options]
    newOptions[index] = value
    setOptions(newOptions)
  }

  const handleCreate = async (status: PollStatus) => {
    // Validation
    if (!prompt.trim()) {
      toast({
        title: "Error",
        description: "Please enter a question",
        variant: "destructive",
      })
      return
    }

    const filledOptions = options.filter(o => o.trim())
    if (filledOptions.length < 2) {
      toast({
        title: "Error",
        description: "Please provide at least 2 answer options",
        variant: "destructive",
      })
      return
    }

    setCreating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast({
          title: "Error",
          description: "You must be logged in to create a poll",
          variant: "destructive",
        })
        return
      }

      // Generate unique slug from prompt
      const { data: slug, error: slugError } = await supabase.rpc('generate_unique_slug', { 
        p_title: prompt 
      })

      if (slugError) {
        console.error('Slug generation error:', slugError)
        throw new Error(`Failed to generate slug: ${slugError.message}`)
      }

      if (!slug) {
        throw new Error('Slug generation returned null')
      }

      const now = new Date().toISOString()

      // Create poll with status
      const { data: poll, error: pollError } = await supabase
        .from('polls')
        .insert({
          slug,
          title: prompt, // Use prompt as title for simplicity
          description: null,
          is_public: isPublic,
          owner_id: user.id,
          status,
          published_at: status === 'live' ? now : null,
        })
        .select()
        .single()

      if (pollError) {
        console.error('Poll creation error:', pollError)
        throw pollError
      }

      // Create single question (idx: 1)
      const { data: question, error: qError } = await supabase
        .from('questions')
        .insert({
          poll_id: poll.id,
          idx: 1,
          prompt: prompt,
          is_live: status === 'live', // Auto-live if published
        })
        .select()
        .single()

      if (qError) throw qError

      // Create options
      const { error: optError } = await supabase
        .from('options')
        .insert(
          filledOptions.map((opt, i) => ({
            question_id: question.id,
            key: String.fromCharCode(65 + i), // A, B, C, D...
            label: opt,
          }))
        )

      if (optError) throw optError

      // Initialize tally if published
      if (status === 'live') {
        await supabase.from('tallies').insert({
          question_id: question.id,
          counts: {},
        })
      }

      toast({
        title: status === 'live' ? "Poll published!" : "Draft saved!",
        description: status === 'live' 
          ? "Your poll is now live and accepting votes" 
          : "You can publish it later from My Polls",
      })

      // Redirect based on status
      if (status === 'live') {
        router.push(`/p/${poll.slug}`)
      } else {
        router.push('/my-polls')
      }
    } catch (error) {
      console.error('Create poll error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create poll",
        variant: "destructive",
      })
    } finally {
      setCreating(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Create a Poll</CardTitle>
        <CardDescription>
          Ask a question and add answer options
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question */}
        <div className="space-y-2">
          <Label htmlFor="prompt">Your Question</Label>
          <Input
            id="prompt"
            placeholder="What should we build next?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="text-lg"
          />
        </div>

        {/* Options */}
        <div className="space-y-3">
          <Label>Answer Options (minimum 2)</Label>
          {options.map((option, index) => (
            <div key={index} className="flex gap-2 items-center">
              <span className="text-sm font-medium text-muted-foreground w-6">
                {String.fromCharCode(65 + index)}.
              </span>
              <Input
                placeholder={`Option ${index + 1}`}
                value={option}
                onChange={(e) => updateOption(index, e.target.value)}
              />
              {options.length > 2 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addOption}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add another option
          </Button>
        </div>

        {/* Privacy */}
        <div className="flex items-center space-x-2">
          <input
            type="checkbox"
            id="is_public"
            checked={!isPublic}
            onChange={(e) => setIsPublic(!e.target.checked)}
            className="rounded"
          />
          <Label htmlFor="is_public" className="font-normal cursor-pointer">
            Make this poll private (only you and invited admins can see it)
          </Label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={() => handleCreate('draft')}
            disabled={creating}
            variant="outline"
            className="flex-1"
          >
            {creating ? 'Saving...' : 'Save as Draft'}
          </Button>
          <Button
            onClick={() => handleCreate('live')}
            disabled={creating}
            className="flex-1"
          >
            {creating ? 'Publishing...' : 'Publish Now'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

