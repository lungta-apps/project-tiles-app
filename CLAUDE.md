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
  - Fields: `name`, `color` (hex), `position` (0-8), `board_id`
  - Projects can optionally have a `completed` field

- **tasks**: Task items belonging to projects
  - Each task belongs to a project (`project_id` foreign key)
  - Maximum 10 tasks per project
  - Fields: `description`, `is_completed` (boolean)

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
    ├── 3x3 grid of ProjectTile components
    ├── AddProjectModal.tsx (create/edit projects)
    ├── TaskModal.tsx (manage 10 tasks per project)
    └── SignInModal.tsx
```

### Key Interactions

- **Long press** (500ms) on project tile: Shows context menu (Change Color, Mark Completed, Tasks, Delete)
- **Double-click** on project tile: Opens task modal
- **Double-click** on board tab: Rename board
- **Long press** (700ms) on board tab: Delete board (with confirmation)
- **Click** empty grid cell: Opens add project modal (shows sign-in modal if not authenticated)

### Visual Indicators

- **Teal dot** (top-right of tile): Indicates project has incomplete tasks
  - Color: `#1ABC9C` with glow effect matching tile border style
  - Shown when `project.tasks.some(task => !task.is_completed)`

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
