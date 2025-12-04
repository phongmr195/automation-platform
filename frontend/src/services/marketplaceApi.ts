import api from './api';

export interface Review {
  id: string;
  templateId: string;
  userId: string;
  rating: number;
  title?: string;
  content?: string;
  helpfulCount: number;
  verified: boolean;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

export interface Comment {
  id: string;
  templateId: string;
  userId: string;
  content: string;
  parentId?: string | null;
  upvotes: number;
  edited: boolean;
  deleted: boolean;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  replies?: Comment[];
}

export interface ReviewStats {
  total: number;
  average: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface MarketplaceAnalytics {
  overview: {
    totalTemplates: number;
    totalReviews: number;
    totalComments: number;
  };
  topRated: any[];
  mostInstalled: any[];
  recentlyPublished: any[];
}

class MarketplaceAPI {
  // =========================================
  // REVIEWS
  // =========================================

  async getReviews(templateId: string, params?: {
    page?: number;
    limit?: number;
    sort?: 'recent' | 'helpful' | 'rating';
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.sort) searchParams.append('sort', params.sort);

    const response = await api.get(
      `/marketplace/templates/${templateId}/reviews?${searchParams.toString()}`
    );
    return response.data as {
      reviews: Review[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }

  async createReview(templateId: string, data: {
    userId: string;
    rating: number;
    title?: string;
    content?: string;
  }) {
    const response = await api.post(
      `/marketplace/templates/${templateId}/reviews`,
      data
    );
    return response.data as Review;
  }

  async deleteReview(reviewId: string, userId: string) {
    const response = await api.delete(`/marketplace/reviews/${reviewId}`, {
      data: { userId },
    });
    return response.data;
  }

  async markReviewHelpful(reviewId: string) {
    const response = await api.post(`/marketplace/reviews/${reviewId}/helpful`);
    return response.data as Review;
  }

  async getReviewStats(templateId: string) {
    const response = await api.get(`/marketplace/templates/${templateId}/review-stats`);
    return response.data as ReviewStats;
  }

  // =========================================
  // COMMENTS
  // =========================================

  async getComments(templateId: string, params?: {
    page?: number;
    limit?: number;
    includeReplies?: boolean;
  }) {
    const searchParams = new URLSearchParams();
    if (params?.page) searchParams.append('page', params.page.toString());
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.includeReplies) searchParams.append('includeReplies', 'true');

    const response = await api.get(
      `/marketplace/templates/${templateId}/comments?${searchParams.toString()}`
    );
    return response.data as {
      comments: Comment[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    };
  }

  async createComment(templateId: string, data: {
    userId: string;
    content: string;
    parentId?: string;
  }) {
    const response = await api.post(
      `/marketplace/templates/${templateId}/comments`,
      data
    );
    return response.data as Comment;
  }

  async updateComment(commentId: string, userId: string, content: string) {
    const response = await api.put(`/marketplace/comments/${commentId}`, {
      userId,
      content,
    });
    return response.data as Comment;
  }

  async deleteComment(commentId: string, userId: string) {
    const response = await api.delete(`/marketplace/comments/${commentId}`, {
      data: { userId },
    });
    return response.data;
  }

  async upvoteComment(commentId: string) {
    const response = await api.post(`/marketplace/comments/${commentId}/upvote`);
    return response.data as Comment;
  }

  // =========================================
  // ANALYTICS
  // =========================================

  async getMarketplaceAnalytics() {
    const response = await api.get('/marketplace/analytics');
    return response.data as MarketplaceAnalytics;
  }

  async getTemplateAnalytics(templateId: string) {
    const response = await api.get(`/marketplace/templates/${templateId}/analytics`);
    return response.data;
  }
}

export const marketplaceApi = new MarketplaceAPI();
