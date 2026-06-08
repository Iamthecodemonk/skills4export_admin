import { apiRequest } from '../composables/useApi'

export type PostUser = {
  id: string
  name: string | null
  email: string | null
  avatar: string | null
}

export type PostCommunity = {
  id: string
  name: string | null
  description: string | null
  is_active: number
  default_post_visibility: string | null
}

export type PostMediaAsset = {
  id?: string
  url?: string
  media_type?: string
  thumbnail_url?: string
  display_order?: number
  created_at?: string
  [key: string]: unknown
}

export type Post = {
  id: string
  user_id: string
  community_id: string | null
  page_id: string | null
  parent_post_id: string | null
  visibility: string
  title: string
  content: string
  file_path: PostMediaAsset[]
  media_path: PostMediaAsset[]
  images_count: number
  comment_count: number
  score: number
  is_follow: boolean
  is_liked: boolean
  is_saved: boolean
  is_report: boolean
  status?: string | null
  type: string
  user: PostUser
  community: PostCommunity | null
  page: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type ListPostsResponse = {
  current_page: number
  data: Post[]
  first_page_url: string | null
  from: number | null
  last_page: number
  last_page_url: string | null
  links: Array<Record<string, unknown>>
  next_page_url: string | null
  path: string
  per_page: number
  prev_page_url: string | null
  to: number | null
  total: number
}

export type CreatePostPayload = {
  userId?: string
  communityId?: string | null
  pageId?: string
  title: string
  content: string
  mediaAssetIds?: string[]
}

export type CreatePostResponse = {
  success: boolean
  data: Post
}

export type DeletePostResponse = {
  success: boolean
  message: string
  data: unknown[]
}

export type PostComment = {
  id: string
  post_id?: string
  postId?: string
  user_id?: string
  userId?: string
  content?: string
  body?: string
  status?: string | null
  is_report?: boolean
  isReport?: boolean
  user?: PostUser | null
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
  [key: string]: unknown
}

export type PostStatusResponse = {
  success: boolean
  message?: string
  data: Post
}

export type ListPostCommentsResponse = {
  current_page?: number
  data: PostComment[]
  from?: number | null
  last_page?: number
  per_page?: number
  to?: number | null
  total?: number
  [key: string]: unknown
}

export type CommentStatusResponse = {
  success: boolean
  message?: string
  data: PostComment
}

export async function listPosts(params: { page?: number; per_page?: number; is_report?: boolean | number; reported?: boolean | number } = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      search.set(key, String(value))
    }
  })

  const path = `/api/posts${search.toString() ? `?${search.toString()}` : ''}`
  return apiRequest<ListPostsResponse>(path)
}

export async function createPost(payload: CreatePostPayload) {
  return apiRequest<CreatePostResponse>('/api/posts', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function deletePost(id: string, userId: string) {
  return apiRequest<DeletePostResponse>(`/api/posts/${id}`, {
    method: 'DELETE',
    body: JSON.stringify({ userId }),
  })
}

export async function updatePostStatus(id: string, status: string) {
  return apiRequest<PostStatusResponse>(`/api/posts/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function listPostComments(postId: string, params: { page?: number; per_page?: number } = {}) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value) !== '') {
      search.set(key, String(value))
    }
  })

  const path = `/api/posts/${postId}/comments${search.toString() ? `?${search.toString()}` : ''}`
  return apiRequest<ListPostCommentsResponse>(path)
}

export async function updatePostCommentStatus(postId: string, commentId: string, status: string) {
  return apiRequest<CommentStatusResponse>(`/api/posts/${postId}/comments/${commentId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

export async function deletePostComment(postId: string, commentId: string) {
  return apiRequest<CommentStatusResponse>(`/api/posts/${postId}/comments/${commentId}`, {
    method: 'DELETE',
  })
}

export default {
  listPosts,
  createPost,
  deletePost,
  updatePostStatus,
  listPostComments,
  updatePostCommentStatus,
  deletePostComment,
}
