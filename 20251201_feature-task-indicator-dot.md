# Feature: Incomplete Task Indicator - 2025-12-01

This document summarizes the implementation of a new feature to provide a visual cue for projects with incomplete tasks.

### Feature Overview

The goal was to add a visual indicator to the project tiles on the main grid if a project has any tasks that are not yet completed.

*   **Visual Indicator**: A teal-colored dot (`#1ABC9C`) is now displayed in the top-right corner of a project tile if it has one or more incomplete tasks.
*   **Glow Effect**: A glow effect was added to the dot to match the aesthetic of the project tile's border.
*   **Real-time Update**: The indicator appears or disappears immediately after tasks are updated in the task modal.

### Implementation Details

**1. Data Fetching (`src/components/ProjectGrid.tsx`):**
*   The `loadProjects` function was modified to perform a subsequent query to fetch all tasks for the projects currently displayed on the board.
*   The fetched tasks were then mapped and attached to their corresponding project objects.

**2. Type Definition (`src/lib/supabase.ts`):**
*   The `Project` interface was updated to include an optional `tasks` property, which is an array of `Task` objects.

**3. Visual Indicator (`src/components/ProjectTile.tsx`):**
*   A new variable, `hasIncompleteTasks`, was added to check if the `project.tasks` array contains any tasks with `is_completed` set to `false`.
*   A `div` element is conditionally rendered in the top-right corner if `hasIncompleteTasks` is true.
*   The `div` is styled with the specified teal color and a `box-shadow` to create a glow effect, matching the project tile's border glow.

**4. Real-time Update (`src/components/ProjectGrid.tsx`):**
*   The `onClose` handler for the `TaskModal` was updated to call `loadProjects`. This ensures that when the modal is closed after task modifications, the project grid is refreshed, and the task indicator dot is updated accordingly.

### Git Workflow

In addition to the feature implementation, the following Git workflow was followed:

*   Stashed existing changes.
*   Switched to the `main` branch and pulled the latest updates.
*   Cleaned up a stale local branch (`feature/task-checkboxes`).
*   Created a new branch `feature/task-dot-indicator` for the new work.
*   Applied the stashed changes to the new branch.
*   After implementation, the feature branch was merged locally into `main` and pushed to the remote repository.
*   The local feature branch was then deleted.
