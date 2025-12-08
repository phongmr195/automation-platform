import { useState, useRef } from 'react';
import { MessageSquare, Send, Smile, Check, MoreVertical, Reply, Trash2, Edit2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useComments } from '../../hooks/collaboration/useComments';
import { MentionAutocomplete } from './MentionAutocomplete';
import type { WorkflowComment } from '../../services/collaborationApi';

interface CommentsPanelProps {
  workflowId: string;
  currentUserId: string;
  nodeId?: string;
  position?: { x: number; y: number };
  onClose?: () => void;
}

const COMMON_EMOJIS = ['👍', '❤️', '😊', '🎉', '🚀', '👏', '🔥', '✅'];

export const CommentsPanel = ({ 
  workflowId, 
  currentUserId, 
  nodeId, 
  position,
  onClose 
}: CommentsPanelProps) => {
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<string | null>(null);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [cursorPosition, setCursorPosition] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  const { 
    comments, 
    isLoading, 
    createComment, 
    updateComment,
    deleteComment,
    resolveComment,
    addReaction,
    isCreating 
  } = useComments(workflowId);

  // Filter comments by nodeId if provided
  const filteredComments = nodeId 
    ? comments.filter(c => c.nodeId === nodeId && !c.parentId)
    : comments.filter(c => !c.parentId);

  const handleInputChange = (value: string, cursorPos?: number) => {
    setNewComment(value);
    
    // Get cursor position
    const cursor = cursorPos ?? inputRef.current?.selectionStart ?? value.length;
    setCursorPosition(cursor);

    // Check for @ mention trigger
    const textBeforeCursor = value.substring(0, cursor);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.substring(lastAtIndex + 1);
      
      // Only show mention menu if @ is at start, after space, or after newline
      const charBeforeAt = lastAtIndex > 0 ? textBeforeCursor[lastAtIndex - 1] : ' ';
      const isValidTrigger = charBeforeAt === ' ' || charBeforeAt === '\n' || lastAtIndex === 0;
      
      // Check if there's no space after @
      const hasSpace = textAfterAt.includes(' ') || textAfterAt.includes('\n');
      
      if (isValidTrigger && !hasSpace) {
        setMentionSearch(textAfterAt);
        setShowMentionMenu(true);
        
        // Calculate position for mention menu - show ABOVE textarea
        if (inputRef.current) {
          const rect = inputRef.current.getBoundingClientRect();
          // Position above the textarea with some spacing
          setMentionPosition({
            top: rect.top + window.scrollY - 10, // 10px above textarea
            left: rect.left + window.scrollX,
          });
        }
      } else {
        setShowMentionMenu(false);
      }
    } else {
      setShowMentionMenu(false);
    }
  };

  const handleMentionSelect = (username: string, userEmail: string) => {
    if (!inputRef.current) return;

    const textBeforeCursor = newComment.substring(0, cursorPosition);
    const textAfterCursor = newComment.substring(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIndex !== -1) {
      const beforeAt = newComment.substring(0, lastAtIndex);
      const mention = `@${username}`;
      const newText = beforeAt + mention + ' ' + textAfterCursor;
      
      setNewComment(newText);
      setShowMentionMenu(false);
      
      // Set cursor position after the mention
      setTimeout(() => {
        const newCursorPos = lastAtIndex + mention.length + 1;
        inputRef.current?.setSelectionRange(newCursorPos, newCursorPos);
        inputRef.current?.focus();
      }, 0);
    }
  };

  const handleSubmit = (parentId?: string) => {
    const content = parentId ? newComment : newComment;
    if (!content.trim()) return;

    createComment({
      content: content.trim(),
      nodeId,
      position,
      parentId,
    });

    setNewComment('');
    setReplyingTo(null);
    setShowMentionMenu(false);
  };

  const handleEdit = (commentId: string) => {
    if (!editContent.trim()) return;
    
    updateComment({ commentId, content: editContent.trim() });
    setEditingComment(null);
    setEditContent('');
  };

  const handleReaction = (commentId: string, emoji: string) => {
    addReaction({ commentId, emoji });
    setShowEmojiPicker(null);
  };

  const startEdit = (comment: WorkflowComment) => {
    setEditingComment(comment.id);
    setEditContent(comment.content);
  };

  const renderComment = (comment: WorkflowComment, isReply = false) => {
    const isEditing = editingComment === comment.id;
    const isAuthor = comment.userId === currentUserId;

    return (
      <div 
        key={comment.id} 
        id={`comment-${comment.id}`}
        className={`${isReply ? 'ml-10 mt-2' : 'mt-4'} transition-all duration-300`}
      >
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="flex-shrink-0">
            {comment.user.avatar ? (
              <img
                src={comment.user.avatar}
                alt={comment.user.name || comment.user.email}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                {(comment.user.name || comment.user.email).charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Comment content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-medium text-sm text-gray-900">
                  {comment.user.name || comment.user.email}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                </span>
                {comment.resolved && (
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                    <Check className="w-3 h-3" />
                    Resolved
                  </span>
                )}
              </div>

              {/* Actions dropdown */}
              {isAuthor && !isEditing && (
                <div className="relative group">
                  <button className="p-1 hover:bg-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                  <div className="absolute right-0 mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto z-10">
                    <button
                      onClick={() => startEdit(comment)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      <Edit2 className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => deleteComment(comment.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Content or edit form */}
            {isEditing ? (
              <div className="mt-2">
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleEdit(comment.id)}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setEditingComment(null);
                      setEditContent('');
                    }}
                    className="px-3 py-1 text-gray-600 text-sm rounded hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                  {comment.content.split(/(@\w+)/g).map((part, i) => 
                    part.startsWith('@') ? (
                      <span key={i} className="text-blue-600 font-medium">
                        {part}
                      </span>
                    ) : (
                      part
                    )
                  )}
                </p>

                {/* Reactions */}
                {comment.reactions && comment.reactions.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {comment.reactions.map((reaction, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleReaction(comment.id, reaction.emoji)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${
                          reaction.userIds.includes(currentUserId)
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-200 hover:bg-gray-200'
                        }`}
                      >
                        <span>{reaction.emoji}</span>
                        <span>{reaction.userIds.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex items-center gap-3 mt-2">
                  <button
                    onClick={() => setReplyingTo(comment.id)}
                    className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600"
                  >
                    <Reply className="w-3 h-3" />
                    Reply
                  </button>
                  
                  <div className="relative">
                    <button
                      onClick={() => setShowEmojiPicker(showEmojiPicker === comment.id ? null : comment.id)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-blue-600"
                    >
                      <Smile className="w-3 h-3" />
                      React
                    </button>
                    
                    {showEmojiPicker === comment.id && (
                      <div className="absolute left-0 mt-1 p-2 bg-white border border-gray-200 rounded-lg shadow-lg flex gap-1 z-10">
                        {COMMON_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            onClick={() => handleReaction(comment.id, emoji)}
                            className="w-8 h-8 hover:bg-gray-100 rounded flex items-center justify-center"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {!comment.resolved && (
                    <button
                      onClick={() => resolveComment(comment.id)}
                      className="flex items-center gap-1 text-xs text-gray-600 hover:text-green-600"
                    >
                      <Check className="w-3 h-3" />
                      Resolve
                    </button>
                  )}
                </div>

                {/* Reply form */}
                {replyingTo === comment.id && (
                  <div className="mt-3 relative">
                    <textarea
                      value={newComment}
                      onChange={(e) => {
                        handleInputChange(e.target.value, e.target.selectionStart);
                      }}
                      placeholder="Write a reply... (type @ to mention)"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleSubmit(comment.id)}
                        disabled={!newComment.trim()}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Reply
                      </button>
                      <button
                        onClick={() => {
                          setReplyingTo(null);
                          setNewComment('');
                          setShowMentionMenu(false);
                        }}
                        className="px-3 py-1 text-gray-600 text-sm rounded hover:bg-gray-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Nested replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-3">
                    {comment.replies.map((reply) => renderComment(reply, true))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-gray-200">
      {/* Header */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-gray-500" />
          <h3 className="font-semibold text-gray-900">
            Comments {filteredComments.length > 0 && `(${filteredComments.length})`}
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        )}
      </div>

      {/* Comments list - Scrollable area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredComments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <MessageSquare className="w-12 h-12 mb-2 opacity-20" />
            <p className="text-sm">No comments yet</p>
            <p className="text-xs mt-1">Be the first to comment!</p>
          </div>
        ) : (
          filteredComments.map((comment) => renderComment(comment))
        )}
      </div>

      {/* New comment form - Fixed at bottom */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200">
        <div className="relative">
          <textarea
            ref={inputRef}
            value={newComment}
            onChange={(e) => {
              handleInputChange(e.target.value, e.target.selectionStart);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !showMentionMenu) {
                handleSubmit();
              }
            }}
            placeholder="Add a comment... (type @ to mention)"
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
          <button
            onClick={() => handleSubmit()}
            disabled={!newComment.trim() || isCreating}
            className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
          
          {/* Mention autocomplete */}
          {showMentionMenu && (
            <MentionAutocomplete
              workflowId={workflowId}
              searchQuery={mentionSearch}
              position={mentionPosition}
              onSelect={handleMentionSelect}
              onClose={() => setShowMentionMenu(false)}
            />
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Press Cmd+Enter to send • Type @ to mention someone
        </p>
      </div>
    </div>
  );
};
