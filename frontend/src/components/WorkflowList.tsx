import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { workflowApi } from "../services/api";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useConfirmDialog } from "./ui/ConfirmDialog";
import { toast } from "../utils/alerts";
import { SearchBar } from "./WorkflowList/SearchBar";
import { FilterPanel } from "./WorkflowList/FilterPanel";
import { Pagination } from "./WorkflowList/Pagination";
import { WorkflowCard } from "./WorkflowList/WorkflowCard";

export default function WorkflowList() {
  const navigate = useNavigate();
  const { confirm } = useConfirmDialog();

  // Search and filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "PUBLISHED" | "DRAFT">("all");
  const [sortBy, setSortBy] = useState<"createdAt" | "updatedAt" | "name">(
    "updatedAt"
  );
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const limit = 12;

  // Build query parameters
  const queryParams = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
    sort: sortBy,
    order,
  });

  if (search) queryParams.append("search", search);
  if (status !== "all") queryParams.append("status", status);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["workflows", queryParams.toString()],
    queryFn: async () => {
      const response = await fetch(
        `http://localhost:3000/workflows?${queryParams}`
      );
      if (!response.ok) throw new Error("Failed to fetch workflows");
      return response.json();
    },
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [search, status, sortBy, order]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading workflows...</div>
      </div>
    );
  }

  const workflows = data?.workflows || [];
  const pagination = data?.pagination || {
    total: 0,
    page: 1,
    limit: 12,
    totalPages: 1,
  };

  return (
    <div className="min-h-screen bg-gray-50">
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
            <button
              onClick={() => navigate("/editor")}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Workflow
            </button>
          </div>

          {/* Search and Filters */}
          <div className="mt-6 flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <SearchBar onSearch={setSearch} />
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                onClick={() => navigate("/editor")}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-5 h-5" />
                Create Workflow
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
    </div>
  );
}
