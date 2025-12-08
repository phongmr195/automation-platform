import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workflowApi } from "../services/api";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConfirmDialog } from "./ui/ConfirmDialog";
import { toast } from "../utils/alerts";
import { SearchBar } from "./WorkflowList/SearchBar";
import { FilterPanel } from "./WorkflowList/FilterPanel";
import { Pagination } from "./WorkflowList/Pagination";
import { WorkflowCard } from "./WorkflowList/WorkflowCard";
import { BulkActions } from "./WorkflowList/BulkActions";
import { ViewOptions } from "./WorkflowList/ViewOptions";
import { FolderList, type Folder } from "./WorkflowList/FolderList";

export default function WorkflowList() {
  const navigate = useNavigate();
  const { confirm } = useConfirmDialog();
  const queryClient = useQueryClient();

  // Search and filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "PUBLISHED" | "DRAFT">("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "name">(
    "updatedAt"
  );
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const limit = 12;

  // New features state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showFavorites, setShowFavorites] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);

  // Fetch folders
  const { data: foldersData } = useQuery({
    queryKey: ["folders"],
    queryFn: () => workflowApi.getFolders(),
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });

  const folders: Folder[] = foldersData || [];

  // Stable callback for search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
  }, []);

  // Build query parameters with useMemo to prevent unnecessary re-renders
  const queryKey = useMemo(
    () => ["workflows", search, status, sortBy, order, page, selectedFolder, showFavorites],
    [search, status, sortBy, order, page, selectedFolder, showFavorites]
  );

  const queryString = useMemo(() => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      sort: sortBy,
      order,
    });
    if (search) params.append("search", search);
    if (status !== "all") params.append("status", status);
    if (showFavorites) params.append("starred", "true");
    if (selectedFolder) params.append("folderId", selectedFolder);
    return params.toString();
  }, [search, status, sortBy, order, page, showFavorites, selectedFolder]);

  const { data, isLoading, refetch } = useQuery({
    queryKey,
    queryFn: async () => {
      const response = await fetch(
        `http://localhost:3000/workflows?${queryString}`
      );
      if (!response.ok) throw new Error("Failed to fetch workflows");
      return response.json();
    },
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
  });

  // Reset to page 1 when filters change (NOT search - search already handled by queryKey)
  useEffect(() => {
    setPage(1);
  }, [status, sortBy, order]); // Removed 'search' from dependencies!

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: "Xóa workflow?",
      description: `Bạn có chắc muốn xóa workflow "${name}"? Hành động này không thể hoàn tác.`,
      confirmText: "Xóa",
      cancelText: "Hủy",
    });

    if (confirmed) {
      try {
        await workflowApi.deleteWorkflow(id);
        toast.success("Workflow đã được xóa");
        refetch();
      } catch (error) {
        toast.error("Lỗi khi xóa workflow: " + String(error));
      }
    }
  };

  const handleRun = async (id: string, name: string) => {
    try {
      await workflowApi.executeWorkflow(id);
      toast.success(`Workflow "${name}" đang chạy`);
    } catch (error) {
      toast.error("Lỗi khi chạy workflow: " + String(error));
    }
  };

  // New feature handlers
  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleBulkExecute = async () => {
    const count = selectedIds.size;
    const confirmed = await confirm({
      title: "Execute workflows?",
      description: `Are you sure you want to execute ${count} workflow${count > 1 ? 's' : ''}?`,
      confirmText: "Execute",
      cancelText: "Cancel",
    });

    if (confirmed) {
      try {
        await Promise.all(
          Array.from(selectedIds).map((id) => workflowApi.executeWorkflow(id))
        );
        toast.success(`${count} workflow${count > 1 ? 's' : ''} started`);
        handleClearSelection();
      } catch (error) {
        toast.error("Error executing workflows: " + String(error));
      }
    }
  };

  const handleBulkDuplicate = async () => {
    const count = selectedIds.size;
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => workflowApi.duplicateWorkflow(id))
      );
      toast.success(`Duplicated ${count} workflow${count > 1 ? 's' : ''}`);
      handleClearSelection();
      refetch();
    } catch (error) {
      toast.error("Error duplicating workflows: " + String(error));
    }
  };

  const handleBulkExport = () => {
    const count = selectedIds.size;
    const selectedWorkflows = workflows.filter((w: any) =>
      selectedIds.has(w.id)
    );

    const exportData = {
      version: "1.0",
      exported: new Date().toISOString(),
      workflows: selectedWorkflows,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `workflows-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported ${count} workflow${count > 1 ? 's' : ''}`);
    handleClearSelection();
  };

  const handleBulkDelete = async () => {
    const count = selectedIds.size;
    const confirmed = await confirm({
      title: "Delete workflows?",
      description: `Are you sure you want to delete ${count} workflow${count > 1 ? 's' : ''}? This action cannot be undone.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    });

    if (confirmed) {
      try {
        await Promise.all(
          Array.from(selectedIds).map((id) => workflowApi.deleteWorkflow(id))
        );
        toast.success(`${count} workflow${count > 1 ? 's' : ''} deleted`);
        handleClearSelection();
        refetch();
      } catch (error) {
        toast.error("Error deleting workflows: " + String(error));
      }
    }
  };

  const handleToggleStar = async (id: string) => {
    try {
      await workflowApi.toggleStar(id);
      refetch();
    } catch (error) {
      toast.error("Error toggling star: " + String(error));
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      await workflowApi.duplicateWorkflow(id);
      toast.success("Workflow duplicated");
      refetch();
    } catch (error) {
      toast.error("Error duplicating workflow: " + String(error));
    }
  };

  const handleExport = (id: string) => {
    const workflow = workflows.find((w: any) => w.id === id);
    if (!workflow) return;

    const exportData = {
      version: "1.0",
      exported: new Date().toISOString(),
      workflows: [workflow],
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workflow.name.replace(/\s+/g, "-")}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success(`Exported workflow "${workflow.name}"`);
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.workflows || !Array.isArray(data.workflows)) {
        throw new Error("Invalid workflow export format");
      }

      const result = await workflowApi.importWorkflows(data);
      toast.success(`Imported ${result.imported} workflow(s)`);
      refetch();
    } catch (error) {
      toast.error("Error importing workflows: " + String(error));
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt("Enter folder name:");
    if (name) {
      try {
        await workflowApi.createFolder(name);
        toast.success(`Folder "${name}" created`);
        queryClient.invalidateQueries({ queryKey: ["folders"] });
      } catch (error) {
        toast.error("Error creating folder: " + String(error));
      }
    }
  };

  // Don't unmount the entire UI when loading - just show indicator
  // if (isLoading) {
  //   return (
  //     <div className="min-h-screen bg-gray-50 flex items-center justify-center">
  //       <div className="text-gray-500">Loading workflows...</div>
  //     </div>
  //   );
  // }

  const workflows = data?.workflows || [];
  const pagination = data?.pagination || {
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Folder Sidebar */}
      <FolderList
        folders={folders}
        selectedFolder={selectedFolder}
        onSelectFolder={(folderId) => {
          setSelectedFolder(folderId);
          setPage(1); // Reset to first page when changing folder
        }}
        onCreateFolder={handleCreateFolder}
      />

      {/* Main Content */}
      <div className="flex-1">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Workflows</h1>
                <p className="mt-1 text-sm text-gray-500">
                  Manage and execute your automation workflows
                </p>
              </div>
              <div className="flex items-center gap-3">
                <ViewOptions
                  showFavorites={showFavorites}
                  onToggleFavorites={() => setShowFavorites(!showFavorites)}
                  onImport={handleImport}
                  onCreateFolder={handleCreateFolder}
                />
                <button
                  onClick={() => {
                    const url = selectedFolder 
                      ? `/editor?folderId=${selectedFolder}`
                      : '/editor';
                    navigate(url);
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  New Workflow
                  {selectedFolder && (
                    <span className="text-xs bg-blue-700 px-2 py-0.5 rounded">
                      in folder
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="mt-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <SearchBar onSearch={handleSearchChange} />
              </div>
              <FilterPanel
                filters={{
                  status: status,
                  sort: sortBy,
                  order: order,
                }}
                onFilterChange={(newFilters) => {
                  setStatus(newFilters.status as any);
                  setSortBy(newFilters.sort as any);
                  setOrder(newFilters.order);
                }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
          {workflows.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg
                  className="mx-auto h-12 w-12"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {search || status !== "all"
                  ? "No workflows found"
                  : "No workflows yet"}
              </h3>
              <p className="text-gray-500 mb-4">
                {search || status !== "all"
                  ? "Try adjusting your search or filters"
                  : "Get started by creating your first workflow"}
              </p>
              {!search && status === "all" && (
                <button
                  onClick={() => {
                    const url = selectedFolder 
                      ? `/editor?folderId=${selectedFolder}`
                      : '/editor';
                    navigate(url);
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  Create Workflow
                  {selectedFolder && (
                    <span className="text-xs bg-blue-700 px-2 py-0.5 rounded ml-1">
                      in folder
                    </span>
                  )}
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Grid of workflow cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {workflows.map((workflow: any) => (
                  <WorkflowCard
                    key={workflow.id}
                    workflow={workflow}
                    onEdit={(id) => navigate(`/editor/${id}`)}
                    onDelete={(id) => handleDelete(id, workflow.name)}
                    onExecute={(id) => handleRun(id, workflow.name)}
                    onToggleStar={handleToggleStar}
                    onDuplicate={handleDuplicate}
                    onExport={handleExport}
                    selected={selectedIds.has(workflow.id)}
                    onToggleSelect={handleToggleSelect}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <Pagination
                  currentPage={pagination.page}
                  totalPages={pagination.totalPages}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedIds.size > 0 && (
          <BulkActions
            selectedCount={selectedIds.size}
            onClear={handleClearSelection}
            onExecute={handleBulkExecute}
            onDuplicate={handleBulkDuplicate}
            onExport={handleBulkExport}
            onDelete={handleBulkDelete}
          />
        )}
      </div>
    </div>
  );
}
