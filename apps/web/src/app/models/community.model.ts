export interface CommunityAuthor {
  id: number;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface Category {
  id: number;
  name: string;
  description: string | null;
  icon: string | null;
  createdAt: string;
  _count?: { threads: number };
}

export interface ThreadImage {
  id: number;
  imageUrl: string;
}

export interface ThreadCategoryRef {
  id: number;
  name: string;
  icon: string | null;
}

export interface Thread {
  id: number;
  title: string;
  content: string;
  authorId: number;
  categoryId: number;
  viewsCount: number;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  author: CommunityAuthor;
  category: ThreadCategoryRef;
  images: ThreadImage[];
  commentsCount: number;
  likesCount: number;
  comments?: Comment[];
  isLiked?: boolean;
}

export interface Comment {
  id: number;
  content: string | null;
  imageUrl: string | null;
  deleted: boolean;
  authorId: number;
  threadId: number;
  parentCommentId: number | null;
  createdAt: string;
  author: CommunityAuthor;
  likesCount: number;
  isLiked: boolean;
}

export interface ThreadComment extends Comment {
  replies: ThreadComment[];
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
