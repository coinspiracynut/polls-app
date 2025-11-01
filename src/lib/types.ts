export interface Profile {
  id: string
  handle: string | null
  avatar_url: string | null
  created_at: string
}

export type PollStatus = 'draft' | 'live' | 'closed'

export interface Poll {
  id: string
  slug: string
  title: string
  description: string | null
  is_public: boolean
  owner_id: string
  status: PollStatus
  published_at: string | null
  edited_at: string | null
  created_at: string
  profiles?: Profile
}

export interface Question {
  id: string
  poll_id: string
  idx: number
  prompt: string
  is_live: boolean
  closed_at: string | null
  created_at: string
}

export interface Option {
  id: string
  question_id: string
  key: string
  label: string
}

export interface Vote {
  id: number
  question_id: string
  user_id: string
  option_key: string
  created_at: string
}

export interface Tally {
  question_id: string
  counts: Record<string, number>
}

export interface Participant {
  poll_id: string
  user_id: string
  handle: string | null
  avatar_url: string | null
  last_seen: string
}

export interface PollWithOwner extends Poll {
  profiles: Profile
}

export interface QuestionWithOptions extends Question {
  options: Option[]
}

// OAuth User Metadata Types
export interface TwitterUserMetadata {
  user_name?: string
  name?: string
  preferred_username?: string
  avatar_url?: string
  picture?: string
}

export interface OAuthUserMetadata extends TwitterUserMetadata {
  // Can extend for other providers
}
