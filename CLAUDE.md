# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React + TypeScript project management application built with Vite, featuring a 3x3 grid of project tiles. Each project tile can have tasks, custom colors, and visual indicators. The app uses Supabase for backend services (authentication, database) and Tailwind CSS for styling.

## Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Run ESLint
npm run lint

# Type check (without emitting files)
npm run typecheck

# Preview production build
npm run preview
```

## Architecture

### Database Schema (Supabase)

The app uses three main tables:

- **boards**: User-specific boards containing projects
  - Each user can have multiple boards
  - Default board "Main" is auto-created for new users
  - Board switching via tabs at top of interface

- **projects**: Individual project tiles
  - Each project belongs to a board (`board_id` foreign key)
  - Maximum 9 projects per board (3x3 grid positions 0-8)
  - Fields: `name`, `color` (hex), `position` (0-8), `board_id`, `notes` (text), `completed` (boolean), `start_date` (date), `end_date` (date)

- **tasks**: Task items belonging to projects
  - Each task belongs to a project (`project_id` foreign key)
  - Maximum 10 tasks per project
  - Fields: `description`, `status` (`'todo'` | `'in_progress'` | `'done'`), `position` (int)

### State Management & Data Flow

1. **App.tsx**: Top-level component manages `boards` and `currentBoardId` state
2. **ProjectGrid.tsx**: Main container handling all business logic
   - Manages auth state, loads boards and projects
   - Projects are fetched with their associated tasks in a single load operation
   - When `currentBoardId` changes, projects are reloaded for that board
   - Tasks are joined to projects client-side after fetching both

3. **Project-Task Relationship**: Projects include their tasks via `project.tasks` array
   - Tasks are fetched separately but joined to projects in `loadProjects()`
   - The `Project` interface includes optional `tasks?: Task[]` property

### Component Structure

```
App.tsx
└── ProjectGrid.tsx (main container)
    ├── AuthPanel.tsx (authentication UI)
    ├── Board tabs (inline in ProjectGrid)
    ├── 3x3 grid of ProjectTile components (desktop)
    ├── MobileProjectCarousel.tsx (mobile carousel view)
    ├── AddProjectModal.tsx (create/edit projects)
    ├── TaskModal.tsx (manage 10 tasks per project)
    ├── NotesModal.tsx (add notes to project)
    ├── OverviewModal.tsx (mobile-only mini grid view)
    ├── TaskOverviewModal.tsx (cross-board task summary, all screen sizes)
    ├── GanttModal.tsx (timeline view, all active projects across boards)
    └── SignInModal.tsx
```

### Key Interactions

- **Long press** (500ms) on project tile: Shows context menu (Edit Project, Mark Completed, Tasks, Notes, Delete)
  - **Edit Project**: opens AddProjectModal with name + color fields; when >1 board exists also shows a **Board** dropdown pre-set to the current board — changing it moves the project to the first available slot on the target board (alerts if full)
- **Double-click** on project tile: Opens task modal
- **Double-tap/double-click** on board tab: Opens a menu with Rename and Delete options
- **Click** empty grid cell: Opens add project modal (shows sign-in modal if not authenticated)
- **Drag-and-drop**: Reorder project tiles and board tabs (desktop only)
- **Overview button** (mobile only): Shows mini 3x3 grid popup of all tiles for quick reference
- **Tasks button** (top-right of tab row, signed-in users only): Opens TaskOverviewModal to browse all to-do or in-progress tasks across every board
- **Timeline button** (BarChart2 icon, left of Tasks button, signed-in users only): Clicking opens a small scope picker dropdown — "This board" (filters to current board) or "All boards" (shows everything). Opens GanttModal with the chosen scope.

### Mobile Layout Notes

- **Tab row**: on mobile (`isMobile = true`, width < 768px), the Timeline and Tasks buttons render on a second row below the board tabs (`flex-col`) to avoid crowding in portrait mode. On desktop/landscape they remain on the same row.
- **Mobile carousel — portrait**: 1 tile per page, 9 dots, "N of 9" counter
- **Mobile carousel — landscape**: 3 tiles per page side-by-side (180px tall), 3 dots, "Page N of 3" counter; orientation detected via `window.innerWidth > window.innerHeight` with a resize listener

### Visual Indicators

- **Yellow dot** (top-right of tile, left position): Indicates project has notes
  - Color: `#F1C40F` with glow effect matching tile border style
  - Position: `top-3 right-10`
  - Shown when `project.notes` has content

- **Teal dot** (top-right of tile, right position): Indicates project has incomplete tasks
  - Color: `#1ABC9C` with glow effect matching tile border style
  - Position: `top-3 right-3`
  - Shown when `project.tasks.some(task => task.status !== 'done')`

### Color System

Colors are defined in `src/constants/colors.ts` as a const array of 16 hex values. When working with colors, import from this file rather than hardcoding values.

### Authentication Flow

- Supabase auth is optional initially (nullable `user_id` fields)
- Row Level Security (RLS) enabled but currently allows public access for development
- Auth state managed via `supabase.auth.onAuthStateChange()` listener
- Projects/boards are scoped to authenticated users via `user_id`

### Path Aliases

The project uses `@/` as an alias for `./src/`:
```typescript
import AuthPanel from "@/components/AuthPanel";
import { COLORS } from "@/constants/colors";
```

## Important Patterns

### Loading Projects with Tasks

Always load tasks alongside projects to populate the `tasks` array:

```typescript
// 1. Fetch projects for current board
const { data: projectsData } = await supabase
  .from('projects')
  .select('*')
  .eq('board_id', boardId)
  .order('position', { ascending: true });

// 2. Fetch all tasks for those projects
const projectIds = projectsData.map((p) => p.id);
const { data: tasksData } = await supabase
  .from('tasks')
  .select('*')
  .in('project_id', projectIds);

// 3. Join tasks to projects
const projectsWithTasks = projectsData.map((project) => ({
  ...project,
  tasks: tasksData.filter((task) => task.project_id === project.id),
}));
```

### Refreshing After Task Changes

When the TaskModal closes, always reload projects to update task indicators:

```typescript
<TaskModal
  project={selectedProjectForTasks}
  onClose={() => {
    setSelectedProjectForTasks(null);
    loadProjects(currentBoardId); // Refresh to update teal dot indicator
  }}
/>
```

### Grid Position Management

- Projects occupy specific positions (0-8) in the 3x3 grid
- Empty cells show "Add Project" button
- Grid is rendered by creating array of 9 positions and mapping projects by their `position` field

### GanttModal (Timeline View)

- File: `src/components/GanttModal.tsx`
- Accessible via the Timeline button (BarChart2 icon) left of the Tasks button — signed-in users only
- **Scope picker**: clicking Timeline shows a dropdown with "This board" (current board name shown as subtitle) or "All boards"; passes `boardId` prop to GanttModal to filter accordingly; modal header shows "Timeline — [Board Name]" when filtered
- Shows all active (non-completed) projects on a horizontal timeline
- **Header**: single row of month labels only (week number row removed). Month boundaries use `buildMonthSections()` which calls `dayPixelOffset('YYYY-MM-01', weeks)` for day-level precision — the Sep/Oct separator lands at the exact pixel of Oct 1, not snapped to the nearest Monday. `MonthSection` type has `left` + `width` (pixels); `WEEK_H` constant removed.
- **Range**: May 1 of current year → May 1 of next year; starts on the first Monday on/after May 1
- **Bar positioning**: day-level precision via `dayPixelOffset()` — bars land on the exact calendar day, not snapped to week boundaries. End date is inclusive (+1 day width). Adjacent projects sharing a boundary date touch but don't overlap.
- Bars use project tile color + glow; tooltip on hover shows date range
- Today line (red) runs through all rows
- **Add button**: `+` icon in the modal header (left of `×`), both styled as `w-9 h-9 rounded-full bg-zinc-800 border border-zinc-600` circles. `+` is disabled when no unscheduled projects exist or the edit form is already open. The date-picker form only appears at the bottom when actively adding/editing — no persistent bottom bar.
- **Date input**: custom `DateInput` component (defined in `GanttModal.tsx`) — three text fields (YYYY / MM / DD) with auto-advance: year→month after 4 digits, month→day after 2 digits or a single digit ≥ 2, day auto-pads on single digit ≥ 4; Backspace in empty field returns focus to previous field
- **Modal layout**: outer overlay uses inline `env(safe-area-inset-*)` padding (min 0.75rem) instead of Tailwind `p-4`; inner modal uses `height: 100%` + `min-w-0 overflow-hidden` to prevent the chart's wide `minWidth` from inflating the flex column and clipping off-screen on tablets
- **Mobile**: body scroll lock (`document.body.style.overflow = 'hidden'`) while open; height adapts via `100%` of the safe-area-padded container; `overscroll-behavior: contain` on the chart scroll area prevents background scroll-through
- Requires Supabase migration:
  ```sql
  ALTER TABLE projects
    ADD COLUMN IF NOT EXISTS start_date date,
    ADD COLUMN IF NOT EXISTS end_date date;
  ```
- Uses `select('*')` so modal loads projects even before migration; save shows inline error if columns are missing

## Supabase Configuration

Environment variables required (in `.env`):
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Supabase client is initialized in `src/lib/supabase.ts` and exported as a singleton.

## TypeScript Notes

- Project uses TypeScript with strict mode
- Type definitions for database models in `src/lib/supabase.ts`
- Path references use composite config (`tsconfig.json` references `tsconfig.app.json` and `tsconfig.node.json`)

## Styling

- Tailwind CSS with dark theme (blacks and zincs)
- Project tiles use dynamic border colors with glow effects via inline styles
- Consistent color scheme: `bg-black`, `bg-zinc-900/800`, `border-zinc-700`
