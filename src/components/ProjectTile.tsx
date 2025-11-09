import { useState, useRef, useEffect } from 'react';
import { Project } from '../lib/supabase';

interface ProjectTileProps {
  project: Project;
  onDelete: (id: string) => void;
  onChangeColor: (id: string) => void;
}

export default function ProjectTile({ project, onDelete, onChangeColor }: ProjectTileProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const tileRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    longPressTimer.current = setTimeout(() => {
      setMenuPosition({ x: touch.clientX, y: touch.clientY });
      setShowMenu(true);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
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
    const handleClickOutside = (event: MouseEvent) => {
      if (tileRef.current && !tileRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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

  return (
    <div
      ref={tileRef}
      className="relative w-full h-full bg-zinc-800 rounded-lg flex items-center justify-center transition-all duration-300 cursor-pointer select-none"
      style={{
  			borderWidth: '2px',
  			borderColor: project.color,
 			 boxShadow: `
   			 0 0 8px ${project.color}80,
   			 0 0 16px ${project.color}60,
				 0 0 24px ${project.color}40
  			`,
			}}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
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
      <h2 className="text-2xl font-bold text-white text-center px-4">{project.name}</h2>

      {showMenu && (
        <div
          className="fixed z-50 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl overflow-hidden"
          style={{
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
            aria-label="Change project color"
          >
            Change Color
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
      )}
    </div>
  );
}
