import { useState, useRef, useEffect } from 'react';
import { Project } from '../lib/supabase';
import { useIsMobile } from '@/hooks/useIsMobile';

// Combines props for both features
interface ProjectTileProps {
  project: Project;
  onDelete: (id: string) => void;
  onChangeColor: (id: string) => void;
  onShowTasks: (project: Project) => void;
  onShowNotes: (project: Project) => void;
  onToggleCompleted: (id: string) => void;
  isDragging: boolean;
  isDragOver: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
}

export default function ProjectTile({
  project,
  onDelete,
  onChangeColor,
  onShowTasks,
  onShowNotes,
  onToggleCompleted,
  isDragging,
  isDragOver,
  onDragStart,
  onDragEnd,
}: ProjectTileProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const tileRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Max distance finger can move before long-press is cancelled
  const maxTouchMove = 10;

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    longPressTimer.current = setTimeout(() => {
      // On mobile, we'll center the menu, so position doesn't matter
      setMenuPosition({ x: touch.clientX, y: touch.clientY });
      setShowMenu(true);
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    // Cancel long-press if finger moves too far (user is swiping, not long-pressing)
    if (longPressTimer.current && touchStartPos.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
      if (deltaX > maxTouchMove || deltaY > maxTouchMove) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    touchStartPos.current = null;
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    longPressTimer.current = setTimeout(() => {
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setShowMenu(true);
    }, 500);
  };

  const handleMouseUp = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (tileRef.current && !tileRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu]);

  const handleDelete = () => {
    console.log('DELETE clicked', project.id);
    setShowMenu(false);
    onDelete(project.id);
  };

  const handleChangeColor = () => {
    setShowMenu(false);
    onChangeColor(project.id);
  };

  // Our handler from the feature branch
  const handleShowTasks = () => {
    setShowMenu(false);
    onShowTasks(project);
  };

  const handleShowNotes = () => {
    setShowMenu(false);
    onShowNotes(project);
  };

  // The handler from the main branch
  const handleToggleCompleted = () => {
    setShowMenu(false);
    onToggleCompleted(project.id);
  };

  const hasIncompleteTasks = project.tasks && project.tasks.some(task => !task.is_completed);
  const hasNotes = project.notes && project.notes.trim().length > 0;

  return (
    <div
      ref={tileRef}
      draggable
      className={`relative w-full h-full bg-zinc-800 rounded-lg flex items-center justify-center transition-opacity duration-300 cursor-pointer select-none ${isDragging ? 'opacity-50' : ''} ${project.completed ? 'opacity-50' : ''}`}
      style={{
        borderWidth: '2px',
        borderColor: isDragOver ? '#3B82F6' : project.color,
        boxShadow: `
          0 0 8px ${project.color}80,
          0 0 16px ${project.color}60,
          0 0 24px ${project.color}40
        `,
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleShowTasks}
      onDragStart={(e) => {
        // Cancel long-press timer when drag starts
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
        }
        onDragStart();
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragEnd={onDragEnd}
      role="button"
      tabIndex={0}
      aria-label={`Project: ${project.name}. Long press to show options.`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setShowMenu(true);
        }
      }}
    >
      {hasNotes && (
        <div
          className="absolute top-3 right-10 w-5 h-5 rounded-full"
          style={{
            backgroundColor: '#F1C40F',
            boxShadow: `0 0 8px #F1C40F80, 0 0 16px #F1C40F60, 0 0 24px #F1C40F40`
          }}
          aria-label="This project has notes"
        ></div>
      )}
      {hasIncompleteTasks && (
        <div
          className="absolute top-3 right-3 w-5 h-5 rounded-full"
          style={{
            backgroundColor: '#1ABC9C',
            boxShadow: `0 0 8px #1ABC9C80, 0 0 16px #1ABC9C60, 0 0 24px #1ABC9C40`
          }}
          aria-label="This project has incomplete tasks"
        ></div>
      )}
      <h2 className="text-2xl font-bold text-white text-center px-4">{project.name}</h2>

      {project.completed && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <svg
            className="w-[90%] h-[90%] opacity-40"
            viewBox="0 0 100 100"
            stroke="rgb(120,120,120)"
            strokeWidth="10"
            strokeLinecap="round"
          >
            <line x1="10" y1="10" x2="90" y2="90" />
            <line x1="90" y1="10" x2="10" y2="90" />
          </svg>
        </div>
      )}

      {showMenu && (
        <>
          {/* Backdrop for mobile */}
          {isMobile && (
            <div
              className="fixed inset-0 bg-black/50 z-40"
              onClick={() => setShowMenu(false)}
            />
          )}
          <div
            className={`fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden ${
              isMobile
                ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 min-w-[200px]'
                : ''
            }`}
            style={isMobile ? {} : {
              top: `${menuPosition.y}px`,
              left: `${menuPosition.x}px`,
            }}
            role="menu"
            aria-label="Project options"
          >
            <button
              onClick={handleChangeColor}
              className="w-full px-6 py-3 text-left text-white hover:bg-zinc-800 transition-colors duration-200 focus:outline-none focus:bg-zinc-700"
              role="menuitem"
              aria-label="Edit project"
            >
              Edit Project
            </button>
            <button
              onClick={handleToggleCompleted}
              className="w-full px-6 py-3 text-left text-white hover:bg-zinc-800 transition-colors duration-200 focus:outline-none focus:bg-zinc-700"
              role="menuitem"
              aria-label={project.completed ? "Mark project as not completed" : "Mark project as completed"}
            >
              {project.completed ? "Mark Not Completed" : "Mark Completed"}
            </button>
            <button
              onClick={handleShowTasks}
              className="w-full px-6 py-3 text-left text-white hover:bg-zinc-800 transition-colors duration-200 focus:outline-none focus:bg-zinc-700"
              role="menuitem"
              aria-label="Add tasks to project"
            >
              Tasks
            </button>
            <button
              onClick={handleShowNotes}
              className="w-full px-6 py-3 text-left text-white hover:bg-zinc-800 transition-colors duration-200 focus:outline-none focus:bg-zinc-700"
              role="menuitem"
              aria-label="Add notes to project"
            >
              Notes
            </button>
            <button
              onClick={handleDelete}
              className="w-full px-6 py-3 text-left text-red-400 hover:bg-zinc-800 transition-colors duration-200 focus:outline-none focus:bg-zinc-700"
              role="menuitem"
              aria-label="Delete project"
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}