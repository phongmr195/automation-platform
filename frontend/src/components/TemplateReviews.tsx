import React, { useState, useEffect } from 'react';
import { marketplaceApi } from '../services/marketplaceApi';
import type { Review, ReviewStats } from '../services/marketplaceApi';
import { useAuth } from '../contexts/AuthContext';

interface TemplateReviewsProps {
  templateId: string;
}

export const TemplateReviews: React.FC<TemplateReviewsProps> = ({ templateId }) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState<'recent' | 'helpful' | 'rating'>('recent');
  
  // Review form
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReviews();
    loadStats();
  }, [templateId, page, sortBy]);

  const loadReviews = async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.getReviews(templateId, {
        page,
        limit: 10,
        sort: sortBy,
      });
      setReviews(response.reviews);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const reviewStats = await marketplaceApi.getReviewStats(templateId);
      setStats(reviewStats);
    } catch (error) {
      console.error('Failed to load review stats:', error);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please login to submit a review');
      return;
    }

    try {
      setSubmitting(true);
      await marketplaceApi.createReview(templateId, {
        userId: user.id,
        rating,
        title: title.trim() || undefined,
        content: content.trim() || undefined,
      });
      
      // Reset form
      setRating(5);
      setTitle('');
      setContent('');
      setShowReviewForm(false);
      
      // Reload reviews and stats
      loadReviews();
      loadStats();
    } catch (error) {
      console.error('Failed to submit review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    try {
      await marketplaceApi.markReviewHelpful(reviewId);
      loadReviews(); // Reload to show updated count
    } catch (error) {
      console.error('Failed to mark review as helpful:', error);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (!user || !confirm('Are you sure you want to delete this review?')) {
      return;
    }

    try {
      await marketplaceApi.deleteReview(reviewId, user.id);
      loadReviews();
      loadStats();
    } catch (error) {
      console.error('Failed to delete review:', error);
      alert('Failed to delete review. You can only delete your own reviews.');
    }
  };

  const renderStars = (count: number, filled: boolean = true) => {
    return Array.from({ length: 5 }, (_, i) => (
      <span
        key={i}
        className={`text-xl ${i < count ? (filled ? 'text-yellow-500' : 'text-gray-300') : 'text-gray-300'}`}
      >
        ★
      </span>
    ));
  };

  const renderRatingBar = (star: number, count: number, total: number) => {
    const percentage = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-8">{star}★</span>
        <div className="flex-1 h-2 bg-gray-200 rounded overflow-hidden">
          <div
            className="h-full bg-yellow-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="w-8 text-gray-600">{count}</span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Rating Overview */}
      {stats && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Customer Reviews</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">{(stats.average || 0).toFixed(1)}</div>
              <div className="mb-2">{renderStars(Math.round(stats.average))}</div>
              <div className="text-sm text-gray-600">{stats.total} reviews</div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-1">
              {[5, 4, 3, 2, 1].map(star => (
                <div key={star}>
                  {renderRatingBar(star, stats.distribution[star as keyof typeof stats.distribution], stats.total)}
                </div>
              ))}
            </div>
          </div>

          {/* Write Review Button */}
          {user && !showReviewForm && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="mt-4 w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"
            >
              Write a Review
            </button>
          )}
        </div>
      )}

      {/* Review Form */}
      {showReviewForm && user && (
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Write Your Review</h3>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium mb-2">Rating</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className={`text-3xl ${star <= rating ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-400`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-2">Title (optional)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Summarize your experience"
              />
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium mb-2">Review (optional)</label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Share your thoughts about this template..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => setShowReviewForm(false)}
                className="px-4 py-2 border rounded hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Sort Options */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Reviews ({stats?.total || 0})</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-1 border rounded text-sm"
        >
          <option value="recent">Most Recent</option>
          <option value="helpful">Most Helpful</option>
          <option value="rating">Highest Rating</option>
        </select>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No reviews yet. Be the first to review this template!
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(review => (
            <div key={review.id} className="bg-white p-6 rounded-lg border border-gray-200">
              {/* Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {renderStars(review.rating)}
                    {review.verified && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                        Verified
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600">
                    by {review.user.name || review.user.email} • {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>
                {user && user.id === review.userId && (
                  <button
                    onClick={() => handleDeleteReview(review.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                )}
              </div>

              {/* Content */}
              {review.title && <h4 className="font-semibold mb-2">{review.title}</h4>}
              {review.content && <p className="text-gray-700 mb-3">{review.content}</p>}

              {/* Footer */}
              <div className="flex items-center gap-4 text-sm">
                <button
                  onClick={() => handleMarkHelpful(review.id)}
                  className="text-gray-600 hover:text-indigo-600 flex items-center gap-1"
                >
                  👍 Helpful ({review.helpfulCount})
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-4 py-2">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};
