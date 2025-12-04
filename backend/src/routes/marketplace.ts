import { Hono } from 'hono';
import { marketplaceService } from '../services/marketplaceService';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';

const app = new Hono();

// =========================================
// REVIEWS
// =========================================

/**
 * GET /marketplace/templates/:id/reviews
 * Get all reviews for a template
 */
app.get('/templates/:id/reviews', async (c) => {
  try {
    const templateId = c.req.param('id');
    const page = Number.parseInt(c.req.query('page') || '1');
    const limit = Number.parseInt(c.req.query('limit') || '10');
    const sort = c.req.query('sort') as 'recent' | 'helpful' | 'rating' || 'recent';

    const result = await marketplaceService.getTemplateReviews(templateId, {
      page,
      limit,
      sort,
    });

    return c.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

/**
 * POST /marketplace/templates/:id/reviews
 * Create or update a review
 */
app.post(
  '/templates/:id/reviews',
  zValidator(
    'json',
    z.object({
      userId: z.string(),
      rating: z.number().min(1).max(5),
      title: z.string().optional(),
      content: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const templateId = c.req.param('id');
      const body = c.req.valid('json');

      const review = await marketplaceService.createOrUpdateReview({
        templateId,
        ...body,
      });

      return c.json(review, 201);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return c.json({ error: errorMessage }, 500);
    }
  }
);

/**
 * DELETE /marketplace/reviews/:id
 * Delete a review
 */
app.delete('/reviews/:id', async (c) => {
  try {
    const reviewId = c.req.param('id');
    const body = await c.req.json();
    const userId = body.userId;

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const result = await marketplaceService.deleteReview(reviewId, userId);
    return c.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500);
  }
});

/**
 * POST /marketplace/reviews/:id/helpful
 * Mark a review as helpful
 */
app.post('/reviews/:id/helpful', async (c) => {
  try {
    const reviewId = c.req.param('id');
    const review = await marketplaceService.markReviewHelpful(reviewId);
    return c.json(review);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

/**
 * GET /marketplace/templates/:id/review-stats
 * Get review statistics for a template
 */
app.get('/templates/:id/review-stats', async (c) => {
  try {
    const templateId = c.req.param('id');
    const stats = await marketplaceService.getReviewStats(templateId);
    return c.json(stats);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

// =========================================
// COMMENTS
// =========================================

/**
 * GET /marketplace/templates/:id/comments
 * Get all comments for a template
 */
app.get('/templates/:id/comments', async (c) => {
  try {
    const templateId = c.req.param('id');
    const page = Number.parseInt(c.req.query('page') || '1');
    const limit = Number.parseInt(c.req.query('limit') || '20');
    const includeReplies = c.req.query('includeReplies') === 'true';

    const result = await marketplaceService.getTemplateComments(templateId, {
      page,
      limit,
      includeReplies,
    });

    return c.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

/**
 * POST /marketplace/templates/:id/comments
 * Create a comment or reply
 */
app.post(
  '/templates/:id/comments',
  zValidator(
    'json',
    z.object({
      userId: z.string(),
      content: z.string().min(1),
      parentId: z.string().optional(),
    })
  ),
  async (c) => {
    try {
      const templateId = c.req.param('id');
      const body = c.req.valid('json');

      const comment = await marketplaceService.createComment({
        templateId,
        ...body,
      });

      return c.json(comment, 201);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return c.json({ error: errorMessage }, 500);
    }
  }
);

/**
 * PUT /marketplace/comments/:id
 * Update a comment
 */
app.put(
  '/comments/:id',
  zValidator(
    'json',
    z.object({
      userId: z.string(),
      content: z.string().min(1),
    })
  ),
  async (c) => {
    try {
      const commentId = c.req.param('id');
      const body = c.req.valid('json');

      const comment = await marketplaceService.updateComment(
        commentId,
        body.userId,
        body.content
      );

      return c.json(comment);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return c.json({ error: errorMessage }, error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500);
    }
  }
);

/**
 * DELETE /marketplace/comments/:id
 * Delete a comment (soft delete)
 */
app.delete('/comments/:id', async (c) => {
  try {
    const commentId = c.req.param('id');
    const body = await c.req.json();
    const userId = body.userId;

    if (!userId) {
      return c.json({ error: 'userId is required' }, 400);
    }

    const result = await marketplaceService.deleteComment(commentId, userId);
    return c.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, error instanceof Error && error.message.includes('Unauthorized') ? 403 : 500);
  }
});

/**
 * POST /marketplace/comments/:id/upvote
 * Upvote a comment
 */
app.post('/comments/:id/upvote', async (c) => {
  try {
    const commentId = c.req.param('id');
    const comment = await marketplaceService.upvoteComment(commentId);
    return c.json(comment);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

// =========================================
// ANALYTICS
// =========================================

/**
 * GET /marketplace/analytics
 * Get marketplace-wide analytics
 */
app.get('/analytics', async (c) => {
  try {
    const analytics = await marketplaceService.getMarketplaceAnalytics();
    return c.json(analytics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

/**
 * GET /marketplace/templates/:id/analytics
 * Get analytics for a specific template
 */
app.get('/templates/:id/analytics', async (c) => {
  try {
    const templateId = c.req.param('id');
    const analytics = await marketplaceService.getTemplateAnalytics(templateId);
    return c.json(analytics);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json({ error: errorMessage }, 500);
  }
});

export default app;
