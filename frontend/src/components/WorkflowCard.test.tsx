/**
 * Tests for WorkflowCard component
 */

import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders, userEvent } from "../test/test-utils";
import { WorkflowCard } from "./WorkflowList/WorkflowCard";
import { mockWorkflowCard, mockPublishedWorkflowCard } from "../test/mockData";

describe("WorkflowCard", () => {
  it("should render workflow information", () => {
    const mockHandlers = {
      onExecute: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };

    renderWithProviders(
      <WorkflowCard workflow={mockWorkflowCard} {...mockHandlers} />
    );

    expect(screen.getByText(mockWorkflowCard.name)).toBeInTheDocument();
    if (mockWorkflowCard.description) {
      expect(
        screen.getByText(mockWorkflowCard.description)
      ).toBeInTheDocument();
    }
    expect(screen.getByText(mockWorkflowCard.status)).toBeInTheDocument();
  });

  it("should display version and execution counts", () => {
    const mockHandlers = {
      onExecute: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };

    renderWithProviders(
      <WorkflowCard workflow={mockWorkflowCard} {...mockHandlers} />
    );

    expect(screen.getByText(/2 versions/i)).toBeInTheDocument();
    expect(screen.getByText(/5 executions/i)).toBeInTheDocument();
  });

  it("should call onExecute when execute button is clicked", async () => {
    const user = userEvent.setup();
    const mockHandlers = {
      onExecute: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };

    renderWithProviders(
      <WorkflowCard workflow={mockWorkflowCard} {...mockHandlers} />
    );

    const executeButton = screen.getByTitle(/execute workflow/i);
    await user.click(executeButton);

    expect(mockHandlers.onExecute).toHaveBeenCalledWith(mockWorkflowCard.id);
  });

  it("should call onEdit when edit button is clicked", async () => {
    const user = userEvent.setup();
    const mockHandlers = {
      onExecute: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };

    renderWithProviders(
      <WorkflowCard workflow={mockWorkflowCard} {...mockHandlers} />
    );

    const editButton = screen.getByTitle(/edit workflow/i);
    await user.click(editButton);

    expect(mockHandlers.onEdit).toHaveBeenCalledWith(mockWorkflowCard.id);
  });

  it("should call onDelete when delete button is clicked", async () => {
    const user = userEvent.setup();
    const mockHandlers = {
      onExecute: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };

    renderWithProviders(
      <WorkflowCard workflow={mockWorkflowCard} {...mockHandlers} />
    );

    const deleteButton = screen.getByTitle(/delete workflow/i);
    await user.click(deleteButton);

    expect(mockHandlers.onDelete).toHaveBeenCalledWith(mockWorkflowCard.id);
  });

  it("should display PUBLISHED status badge", () => {
    const mockHandlers = {
      onExecute: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };

    renderWithProviders(
      <WorkflowCard workflow={mockPublishedWorkflowCard} {...mockHandlers} />
    );

    expect(screen.getByText("PUBLISHED")).toBeInTheDocument();
  });

  it("should display DRAFT status badge", () => {
    const mockHandlers = {
      onExecute: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };

    renderWithProviders(
      <WorkflowCard workflow={mockWorkflowCard} {...mockHandlers} />
    );

    expect(screen.getByText("DRAFT")).toBeInTheDocument();
  });

  it("should handle workflows without description", () => {
    const mockHandlers = {
      onExecute: vi.fn(),
      onEdit: vi.fn(),
      onDelete: vi.fn(),
    };

    const workflowWithoutDescription = {
      ...mockWorkflowCard,
      description: null,
    };

    renderWithProviders(
      <WorkflowCard workflow={workflowWithoutDescription} {...mockHandlers} />
    );

    expect(
      screen.getByText(workflowWithoutDescription.name)
    ).toBeInTheDocument();
  });
});
