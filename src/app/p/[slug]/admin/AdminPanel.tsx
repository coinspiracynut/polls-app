"use client"

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import type { Poll, Question, Option } from '@/lib/types'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { X, Plus } from 'lucide-react'

interface AdminPanelProps {
  poll: Poll
  questions: Question[]
  options: Option[]
}

export function AdminPanel({ poll: initialPoll, questions: initialQuestions, options: initialOptions }: AdminPanelProps) {
  const [poll, setPoll] = useState(initialPoll)
  const [questions, setQuestions] = useState(initialQuestions)
  const [options, setOptions] = useState(initialOptions)
  const [loading, setLoading] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(poll.status === 'draft')
  
  // Edit form state
  const [editedPrompt, setEditedPrompt] = useState(questions[0]?.prompt || '')
  const [editedOptions, setEditedOptions] = useState<string[]>(
    initialOptions.map(o => o.label)
  )
  
  const supabase = createClient()
  const { toast } = useToast()
  const router = useRouter()

  const publishPoll = async () => {
    setLoading('publish')
    try {
      const now = new Date().toISOString()
      
      // Update poll to live status
      const { error: pollError } = await supabase
        .from('polls')
        .update({ status: 'live', published_at: now })
        .eq('id', poll.id)

      if (pollError) throw pollError

      // Set first question live
      const { error: qError } = await supabase
        .from('questions')
        .update({ is_live: true })
        .eq('poll_id', poll.id)
        .eq('idx', 1)

      if (qError) throw qError

      // Initialize tally
      if (questions[0]) {
        await supabase.from('tallies').insert({
          question_id: questions[0].id,
          counts: {},
        })
      }

      toast({
        title: "Poll published!",
        description: "Your poll is now live and accepting votes",
      })

      router.push(`/p/${poll.slug}`)
    } catch (error) {
      console.error('Publish error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to publish poll",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const closePoll = async () => {
    setLoading('close')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')

      const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/close_question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          poll_id: poll.id,
        }),
      })

      if (!res.ok) {
        const error = await res.text()
        throw new Error(error)
      }

      // Update poll status
      await supabase
        .from('polls')
        .update({ status: 'closed' })
        .eq('id', poll.id)

      toast({
        title: "Poll closed",
        description: "This poll is no longer accepting votes",
      })

      router.push(`/p/${poll.slug}`)
    } catch (error) {
      console.error('Close error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to close poll",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const saveEdits = async () => {
    setLoading('save')
    try {
      const question = questions[0]
      if (!question) throw new Error('No question found')

      // Update question prompt
      const { error: qError } = await supabase
        .from('questions')
        .update({ prompt: editedPrompt })
        .eq('id', question.id)

      if (qError) throw qError

      // Update options (simple approach: delete and recreate)
      const { error: delError } = await supabase
        .from('options')
        .delete()
        .eq('question_id', question.id)

      if (delError) throw delError

      const { error: optError } = await supabase
        .from('options')
        .insert(
          editedOptions
            .filter(o => o.trim())
            .map((opt, i) => ({
              question_id: question.id,
              key: String.fromCharCode(65 + i), // A, B, C...
              label: opt,
            }))
        )

      if (optError) throw optError

      // Update poll edited_at
      const { error: pollError } = await supabase
        .from('polls')
        .update({ 
          title: editedPrompt, // Keep title in sync with prompt
          edited_at: new Date().toISOString() 
        })
        .eq('id', poll.id)

      if (pollError) throw pollError

      toast({
        title: "Changes saved!",
        description: "Poll has been updated",
      })

      setEditMode(false)
      router.refresh()
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save changes",
        variant: "destructive",
      })
    } finally {
      setLoading(null)
    }
  }

  const addOption = () => {
    setEditedOptions([...editedOptions, ''])
  }

  const removeOption = (index: number) => {
    if (editedOptions.length <= 2) return
    setEditedOptions(editedOptions.filter((_, i) => i !== index))
  }

  const updateOption = (index: number, value: string) => {
    const newOptions = [...editedOptions]
    newOptions[index] = value
    setEditedOptions(newOptions)
  }

  const getStatusBadge = () => {
    switch (poll.status) {
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>
      case 'live':
        return <Badge className="bg-green-500">Live</Badge>
      case 'closed':
        return <Badge variant="outline">Closed</Badge>
    }
  }

  const wasEdited = poll.edited_at && poll.published_at && 
    new Date(poll.edited_at) > new Date(poll.published_at)

  return (
    <div className="space-y-6">
      {/* Poll Status Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <CardTitle>Poll Management</CardTitle>
                {getStatusBadge()}
                {wasEdited && <Badge variant="outline" className="text-xs">Edited</Badge>}
              </div>
              <CardDescription>
                {poll.status === 'draft' && 'Publish your poll to make it live'}
                {poll.status === 'live' && 'Your poll is live and accepting votes'}
                {poll.status === 'closed' && 'This poll is closed'}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {poll.status === 'draft' && (
                <Button
                  onClick={publishPoll}
                  disabled={loading === 'publish'}
                >
                  {loading === 'publish' ? 'Publishing...' : 'Publish Poll'}
                </Button>
              )}
              {poll.status === 'live' && (
                <>
                  {!editMode && (
                    <Button
                      onClick={() => setEditMode(true)}
                      variant="outline"
                    >
                      Edit Poll
                    </Button>
                  )}
                  <Button
                    onClick={closePoll}
                    disabled={loading === 'close'}
                    variant="destructive"
                  >
                    {loading === 'close' ? 'Closing...' : 'Close Poll'}
                  </Button>
                </>
              )}
              {poll.status === 'closed' && (
                <Button
                  onClick={() => router.push(`/p/${poll.slug}`)}
                  variant="outline"
                >
                  View Results
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Edit Form (for draft or edit mode) */}
      {editMode ? (
        <Card>
          <CardHeader>
            <CardTitle>Edit Poll</CardTitle>
            <CardDescription>Make changes to your poll</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Question */}
            <div className="space-y-2">
              <Label htmlFor="prompt">Question</Label>
              <Input
                id="prompt"
                value={editedPrompt}
                onChange={(e) => setEditedPrompt(e.target.value)}
                className="text-lg"
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              <Label>Answer Options (minimum 2)</Label>
              {editedOptions.map((option, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <span className="text-sm font-medium text-muted-foreground w-6">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                  {editedOptions.length > 2 && (
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

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={() => {
                  setEditMode(false)
                  setEditedPrompt(questions[0]?.prompt || '')
                  setEditedOptions(options.map(o => o.label))
                }}
                variant="outline"
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={saveEdits}
                disabled={loading === 'save'}
                className="flex-1"
              >
                {loading === 'save' ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* View Mode */
        <Card>
          <CardHeader>
            <CardTitle>Current Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-muted-foreground">Question</Label>
              <p className="text-lg font-medium mt-1">{questions[0]?.prompt}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Answer Options</Label>
              <div className="mt-2 space-y-2">
                {options.map((option, index) => (
                  <div key={option.key} className="flex items-center gap-2">
                    <span className="font-medium text-muted-foreground">
                      {option.key}.
                    </span>
                    <span>{option.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
