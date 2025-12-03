import React from "react";
import "./WorkflowCard.css";

interface WorkflowCardProps {
  workflow: {
    id: string;
    name: string;
    description: string | null;
    status: "PUBLISHED" | "DRAFT";
    createdAt: string;
    updatedAt: string;
    _count?: {
      versions: number;
      executions: number;
    };
  };
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onExecute: (id: string) => void;
}

export const WorkflowCard: React.FC<WorkflowCardProps> = ({
  workflow,
  onEdit,
  onDelete,
  onExecute,
}) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="workflow-card">
      <div className="workflow-card-header">
        <div className="workflow-card-title">
          <h3>{workflow.name}</h3>
          <span className={`status-badge ${workflow.status?.toLowerCase() || 'draft'}`}>
            {workflow.status || 'Draft'}
          </span>
        </div>
        {workflow.description && (
          <p className="workflow-card-description">{workflow.description}</p>
        )}
      </div>

      <div className="workflow-card-stats">
        <div className="stat-item">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M2 4.5L8 1.5L14 4.5V11.5L8 14.5L2 11.5V4.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{workflow._count?.versions || 0} versions</span>
        </div>
        <div className="stat-item">
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M5 3L11 8L5 13V3Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span>{workflow._count?.executions || 0} executions</span>
        </div>
      </div>

      <div className="workflow-card-footer">
        <div className="workflow-card-dates">
          <span className="date-label">Updated:</span>
          <span className="date-value">{formatDate(workflow.updatedAt)}</span>
        </div>

        <div className="workflow-card-actions">
          <button
            className="action-button execute"
            onClick={() => onExecute(workflow.id)}
            title="Execute workflow"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M5 3L11 8L5 13V3Z" fill="currentColor" />
            </svg>
          </button>
          <button
            className="action-button edit"
            onClick={() => onEdit(workflow.id)}
            title="Edit workflow"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M11 2L14 5L5 14H2V11L11 2Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            className="action-button delete"
            onClick={() => onDelete(workflow.id)}
            title="Delete workflow"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M3 4H13M12 4V13C12 13.5 11.5 14 11 14H5C4.5 14 4 13.5 4 13V4M6 4V3C6 2.5 6.5 2 7 2H9C9.5 2 10 2.5 10 3V4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
