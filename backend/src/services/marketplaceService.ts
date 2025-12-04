import { prisma } from '../lib/prisma';
import type { Prisma } from '@prisma/client';

/**
 * Marketplace Service - Handles template reviews, comments, and community features
 */
export class MarketplaceService {
  // =========================================
  // REVIEWS
  // =========================================

  /**
   * Get all reviews for a template
   */
  async getTemplateReviews(templateId: string, options: {
    page?: number;
    limit?: number;
    sort?: 'recent' | 'helpful' | 'rating';
  } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const skip = (page - 1) * limit;

    let orderBy: Prisma.TemplateReviewOrderByWithRelationInput = { createdAt: 'desc' };
    
    if (options.sort === 'helpful') {
      orderBy = { helpfulCount: 'desc' };
    } else if (options.sort === 'rating') {
      orderBy = { rating: 'desc' };
    }

    const [reviews, total] = await Promise.all([
      prisma.templateReview.findMany({
        where: { templateId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.templateReview.count({ where: { templateId } }),
    ]);

    return {
      reviews,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create or update a review
   */
  async createOrUpdateReview(data: {
    templateId: string;
    userId: string;
    rating: number;
    title?: string;
    content?: string;
  }) {
    // Validate rating
    if (data.rating < 1 || data.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    // Upsert review (create or update)
    const review = await prisma.templateReview.upsert({
      where: {
        templateId_userId: {
          templateId: data.templateId,
          userId: data.userId,
        },
      },
      create: {
        templateId: data.templateId,
        userId: data.userId,
        rating: data.rating,
        title: data.title,
        content: data.content,
      },
      update: {
        rating: data.rating,
        title: data.title,
        content: data.content,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Update template average rating
    await this.updateTemplateRating(data.templateId);

    return review;
  }

  /**
   * Delete a review
   */
  async deleteReview(reviewId: string, userId: string) {
    const review = await prisma.templateReview.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new Error('Review not found');
    }

    if (review.userId !== userId) {
      throw new Error('Unauthorized to delete this review');
    }

    await prisma.templateReview.delete({
      where: { id: reviewId },
    });

    // Update template average rating
    await this.updateTemplateRating(review.templateId);

    return { success: true };
  }

  /**
   * Mark review as helpful
   */
  async markReviewHelpful(reviewId: string) {
    const review = await prisma.templateReview.update({
      where: { id: reviewId },
      data: {
        helpfulCount: {
          increment: 1,
        },
      },
    });

    return review;
  }

  /**
   * Update template's average rating
   */
  private async updateTemplateRating(templateId: string) {
    const reviews = await prisma.templateReview.findMany({
      where: { templateId },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      await prisma.workflowTemplate.update({
        where: { id: templateId },
        data: { rating: 0 },
      });
      return;
    }

    const averageRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;

    await prisma.workflowTemplate.update({
      where: { id: templateId },
      data: { rating: averageRating },
    });
  }

  /**
   * Get review statistics for a template
   */
  async getReviewStats(templateId: string) {
    const reviews = await prisma.templateReview.findMany({
      where: { templateId },
      select: { rating: true },
    });

    const total = reviews.length;
    
    if (total === 0) {
      return {
        total: 0,
        average: 0,
        distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    }

    const distribution = reviews.reduce((acc, r) => {
      acc[r.rating] = (acc[r.rating] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const average = reviews.reduce((sum, r) => sum + r.rating, 0) / total;

    return {
      total,
      average: Math.round(average * 10) / 10,
      distribution: {
        1: distribution[1] || 0,
        2: distribution[2] || 0,
        3: distribution[3] || 0,
        4: distribution[4] || 0,
        5: distribution[5] || 0,
      },
    };
  }

  // =========================================
  // COMMENTS
  // =========================================

  /**
   * Get all comments for a template (with threading)
   */
  async getTemplateComments(templateId: string, options: {
    page?: number;
    limit?: number;
    includeReplies?: boolean;
  } = {}) {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const skip = (page - 1) * limit;

    // Get top-level comments (no parent)
    const [comments, total] = await Promise.all([
      prisma.templateComment.findMany({
        where: {
          templateId,
          parentId: null,
          deleted: false,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          replies: options.includeReplies ? {
            where: { deleted: false },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          } : false,
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.templateComment.count({
        where: {
          templateId,
          parentId: null,
          deleted: false,
        },
      }),
    ]);

    return {
      comments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a comment or reply
   */
  async createComment(data: {
    templateId: string;
    userId: string;
    content: string;
    parentId?: string;
  }) {
    // Validate parent comment exists if this is a reply
    if (data.parentId) {
      const parentComment = await prisma.templateComment.findUnique({
        where: { id: data.parentId },
      });

      if (!parentComment || parentComment.templateId !== data.templateId) {
        throw new Error('Parent comment not found or belongs to different template');
      }
    }

    const comment = await prisma.templateComment.create({
      data: {
        templateId: data.templateId,
        userId: data.userId,
        content: data.content,
        parentId: data.parentId,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return comment;
  }

  /**
   * Update a comment
   */
  async updateComment(commentId: string, userId: string, content: string) {
    const comment = await prisma.templateComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new Error('Unauthorized to update this comment');
    }

    const updated = await prisma.templateComment.update({
      where: { id: commentId },
      data: {
        content,
        edited: true,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return updated;
  }

  /**
   * Delete a comment (soft delete)
   */
  async deleteComment(commentId: string, userId: string) {
    const comment = await prisma.templateComment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new Error('Comment not found');
    }

    if (comment.userId !== userId) {
      throw new Error('Unauthorized to delete this comment');
    }

    await prisma.templateComment.update({
      where: { id: commentId },
      data: {
        deleted: true,
        content: '[Comment deleted]',
        updatedAt: new Date(),
      },
    });

    return { success: true };
  }

  /**
   * Upvote a comment
   */
  async upvoteComment(commentId: string) {
    const comment = await prisma.templateComment.update({
      where: { id: commentId },
      data: {
        upvotes: {
          increment: 1,
        },
      },
    });

    return comment;
  }

  // =========================================
  // ANALYTICS
  // =========================================

  /**
   * Get marketplace analytics
   */
  async getMarketplaceAnalytics() {
    const [
      totalTemplates,
      totalReviews,
      totalComments,
      topRatedTemplates,
      mostInstalledTemplates,
      recentlyPublished,
    ] = await Promise.all([
      prisma.workflowTemplate.count({ where: { published: true } }),
      prisma.templateReview.count(),
      prisma.templateComment.count({ where: { deleted: false } }),
      
      // Top rated templates (min 5 reviews)
      prisma.workflowTemplate.findMany({
        where: {
          published: true,
          reviews: {
            some: {},
          },
        },
        include: {
          _count: {
            select: { reviews: true },
          },
        },
        orderBy: { rating: 'desc' },
        take: 10,
      }).then(templates => 
        templates.filter(t => t._count.reviews >= 5)
      ),
      
      // Most installed templates
      prisma.workflowTemplate.findMany({
        where: { published: true },
        orderBy: { installCount: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          category: true,
          installCount: true,
          rating: true,
        },
      }),
      
      // Recently published
      prisma.workflowTemplate.findMany({
        where: { published: true },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          name: true,
          category: true,
          publishedAt: true,
          installCount: true,
        },
      }),
    ]);

    return {
      overview: {
        totalTemplates,
        totalReviews,
        totalComments,
      },
      topRated: topRatedTemplates,
      mostInstalled: mostInstalledTemplates,
      recentlyPublished,
    };
  }

  /**
   * Get template analytics
   */
  async getTemplateAnalytics(templateId: string) {
    const [template, reviewStats, commentCount] = await Promise.all([
      prisma.workflowTemplate.findUnique({
        where: { id: templateId },
        include: {
          _count: {
            select: {
              reviews: true,
              comments: true,
            },
          },
        },
      }),
      this.getReviewStats(templateId),
      prisma.templateComment.count({
        where: { templateId, deleted: false },
      }),
    ]);

    if (!template) {
      throw new Error('Template not found');
    }

    return {
      template: {
        id: template.id,
        name: template.name,
        category: template.category,
        installCount: template.installCount,
        rating: template.rating,
      },
      reviews: reviewStats,
      comments: {
        total: commentCount,
      },
    };
  }
}

export const marketplaceService = new MarketplaceService();
