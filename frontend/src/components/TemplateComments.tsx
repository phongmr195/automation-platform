import React, { memo, useState, useEffect } from 'react';
import { marketplaceApi } from '../services/marketplaceApi';
import type { Comment } from '../services/marketplaceApi';
import { useAuth } from '../contexts/AuthContext';

interface TemplateCommentsProps {
  templateId: string;
}

const TemplateComments: React.FC<TemplateCommentsProps> = ({ templateId }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Comment form
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [templateId, page]);

  const loadComments = async () => {
    try {
      setLoading(true);
      const response = await marketplaceApi.getComments(templateId, {
        page,
        limit: 20,
        includeReplies: true,
      });
      setComments(response.comments);
      setTotalPages(response.pagination.totalPages);
    } catch (error) {
      console.error('Failed to load comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    
    if (!user) {
      alert('Please login to comment');
      return;
    }

    const content = parentId ? newComment : newComment;
    if (!content.trim()) return;

    try {
      setSubmitting(true);
      await marketplaceApi.createComment(templateId, {
        userId: user.id,
        content: content.trim(),
        parentId,
      });
      
      setNewComment('');
      setReplyTo(null);
      loadComments();
    } catch (error) {
      console.error('Failed to submit comment:', error);
      alert('Failed to submit comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateComment = async (commentId: string) => {
    if (!user || !editContent.trim()) return;

    try {
      await marketplaceApi.updateComment(commentId, user.id, editContent.trim());
      setEditingId(null);
      setEditContent('');
      loadComments();
    } catch (error) {
      console.error('Failed to update comment:', error);
      alert('Failed to update comment.');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!user || !confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      await marketplaceApi.deleteComment(commentId, user.id);
      loadComments();
    } catch (error) {
      console.error('Failed to delete comment:', error);
      alert('Failed to delete comment. You can only delete your own comments.');
    }
  };

  const handleUpvote = async (commentId: string) => {
    try {
      await marketplaceApi.upvoteComment(commentId);
      loadComments();
    } catch (error) {
      console.error('Failed to upvote comment:', error);
    }
  };

  const startEdit = (comment: Comment) => {
    setEditingId(comment.id);
    setEditContent(comment.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const renderComment = (comment: Comment, isReply: boolean = false) => {
    const isEditing = editingId === comment.id;
    const isAuthor = user && user.id === comment.userId;

    return (
      <div
        key={comment.id}
        className={`${isReply ? 'ml-12 mt-3' : ''} bg-white p-4 rounded-lg border border-gray-200`}
      >
        {/* Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-semibold">
              {comment.user.name?.charAt(0).toUpperCase() || comment.user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="font-medium text-sm">{comment.user.name || comment.user.email}</div>
              <div className="text-xs text-gray-500">
                {new Date(comment.createdAt).toLocaleString()}
                {comment.edited && <span className="ml-2">(edited)</span>}
              </div>
            </div>
          </div>

          {isAuthor && !comment.deleted && (
            <div className="flex gap-2">
              {!isEditing && (
                <>
                  <button
                    onClick={() => startEdit(comment)}
                    className="text-sm text-gray-600 hover:text-indigo-600"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="text-sm text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => handleUpdateComment(comment.id)}
                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
              >
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-700 mb-3">{comment.content}</p>
        )}

        {/* Actions */}
        {!comment.deleted && !isEditing && (
          <div className="flex items-center gap-4 text-sm">
            <button
              onClick={() => handleUpvote(comment.id)}
              className="text-gray-600 hover:text-indigo-600 flex items-center gap-1"
            >
              ⬆️ {comment.upvotes}
            </button>
            {!isReply && user && (
              <button
                onClick={() => setReplyTo(comment.id)}
                className="text-gray-600 hover:text-indigo-600"
              >
                Reply
              </button>
            )}
          </div>
        )}

        {/* Reply Form */}
        {replyTo === comment.id && (
          <div className="mt-3 ml-12">
            <form onSubmit={(e) => handleSubmitComment(e, comment.id)} className="space-y-2">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Write a reply..."
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={submitting || !newComment.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Posting...' : 'Post Reply'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setReplyTo(null);
                    setNewComment('');
                  }}
                  className="px-4 py-2 border rounded text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Replies */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3">
            {comment.replies.map(reply => renderComment(reply, true))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">
        Discussion ({comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0)})
      </h3>

      {/* New Comment Form */}
      {user && !replyTo && (
        <form onSubmit={(e) => handleSubmitComment(e)} className="bg-white p-4 rounded-lg border border-gray-200">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Share your thoughts or ask a question..."
          />
          <div className="mt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </div>
        </form>
      )}

      {!user && (
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-center text-gray-600">
          Please login to join the discussion
        </div>
      )}

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading comments...</div>
      ) : comments.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No comments yet. Start the conversation!
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map(comment => renderComment(comment))}
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

export default memo(TemplateComments);
