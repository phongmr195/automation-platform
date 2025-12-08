import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { collaborationApi } from '../../services/collaborationApi';
import { toast } from 'sonner';

export const useComments = (workflowId: string) => {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['comments', workflowId],
    queryFn: () => collaborationApi.getComments(workflowId, { includeReplies: true }),
    enabled: !!workflowId,
  });

  const comments = data?.comments || [];

  const createCommentMutation = useMutation({
    mutationFn: (data: { content: string; nodeId?: string; position?: { x: number; y: number }; parentId?: string }) =>
      collaborationApi.createComment(workflowId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', workflowId] });
      toast.success('Comment added');
    },
    onError: () => {
      toast.error('Failed to add comment');
    },
  });

  const updateCommentMutation = useMutation({
    mutationFn: ({ commentId, content }: { commentId: string; content: string }) =>
      collaborationApi.updateComment(commentId, content),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', workflowId] });
      toast.success('Comment updated');
    },
    onError: () => {
      toast.error('Failed to update comment');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      collaborationApi.deleteComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', workflowId] });
      toast.success('Comment deleted');
    },
    onError: () => {
      toast.error('Failed to delete comment');
    },
  });

  const resolveCommentMutation = useMutation({
    mutationFn: (commentId: string) =>
      collaborationApi.resolveComment(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', workflowId] });
      toast.success('Comment resolved');
    },
    onError: () => {
      toast.error('Failed to resolve comment');
    },
  });

  const addReactionMutation = useMutation({
    mutationFn: ({ commentId, emoji }: { commentId: string; emoji: string }) =>
      collaborationApi.addReaction(commentId, emoji),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', workflowId] });
    },
    onError: () => {
      toast.error('Failed to add reaction');
    },
  });

  return {
    comments,
    isLoading,
    createComment: createCommentMutation.mutate,
    updateComment: updateCommentMutation.mutate,
    deleteComment: deleteCommentMutation.mutate,
    resolveComment: resolveCommentMutation.mutate,
    addReaction: addReactionMutation.mutate,
    isCreating: createCommentMutation.isPending,
  };
};
