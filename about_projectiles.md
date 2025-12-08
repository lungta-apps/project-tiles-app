# About Project Tiles App

## What It Does

Project Tiles is a visual project management app that displays your projects as colorful tiles in a 3x3 grid. Each project can have up to 10 tasks that you can check off as you complete them. You can create multiple boards to organize different areas of your work or life.

**Key Features:**
- Create up to 9 projects per board with custom names and colors
- Add up to 10 tasks to each project with checkboxes
- Visual indicator (teal dot) shows which projects have unfinished tasks
- Switch between multiple boards using tabs
- User authentication to keep your data private

## Structure

**Languages & Tools:**
- TypeScript and React for the user interface
- Vite for development and building
- Supabase for user authentication and database storage
- Tailwind CSS for styling

**Technical Details:**
From package.json:
- Build tool: `vite`
- Dev server: `npm run dev` runs `vite`
- Build command: `npm run build` runs `vite build`
- React plugin: `@vitejs/plugin-react`

This is a pure **client-side React SPA** (Single Page Application) using Vite for development and bundling.

## Database

The app stores three types of data:
- **Boards** - Containers for organizing projects (like tabs)
- **Projects** - Individual tiles with names, colors, and positions in the grid
- **Tasks** - To-do items that belong to projects

All data is stored securely in Supabase and tied to your user account.
