import { X } from 'lucide-react';
import { Project } from '../lib/supabase';

interface OverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  boardName: string;
}

export default function OverviewModal({ isOpen, onClose, projects, boardName }: OverviewModalProps) {
  if (!isOpen) return null;

  // Create array of 9 grid positions
  const gridItems = Array.from({ length: 9 }, (_, index) => {
    const project = projects.find((p) => p.position === index);
    return { position: index, project };
  });

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 rounded-lg shadow-lg w-full max-w-sm p-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-zinc-400 hover:text-white"
          aria-label="Close overview"
        >
          <X size={20} />
        </button>

        <h2 className="text-white text-lg mb-4 text-center">{boardName} Overview</h2>

        <div className="grid grid-cols-3 gap-2 aspect-square">
          {gridItems.map(({ position, project }) => (
            <div
              key={position}
              className="rounded-md flex items-center justify-center p-1"
              style={{
                backgroundColor: '#18181b',
                border: project ? `2px solid ${project.color}` : '2px dashed #3f3f46',
                boxShadow: project ? `0 0 8px ${project.color}40` : 'none',
                opacity: project?.completed ? 0.5 : 1,
              }}
            >
              {project ? (
                <div className="relative w-full h-full flex items-center justify-center">
                  {/* Yellow dot - has notes */}
                  {project.notes && project.notes.trim() && (
                    <div
                      className="absolute top-1 right-5 w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: '#F1C40F',
                        boxShadow: '0 0 4px #F1C40F80',
                      }}
                    />
                  )}
                  {/* Teal dot - has incomplete tasks */}
                  {project.tasks && project.tasks.some(task => !task.is_completed) && (
                    <div
                      className="absolute top-1 right-1 w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: '#1ABC9C',
                        boxShadow: '0 0 4px #1ABC9C80',
                      }}
                    />
                  )}
                  <span
                    className="text-white text-xs font-medium text-center px-1 line-clamp-3 overflow-hidden"
                    style={{
                      textShadow: '0 1px 2px rgba(0,0,0,0.8)',
                    }}
                  >
                    {project.name}
                  </span>
                  {/* X overlay for completed projects */}
                  {project.completed && (
                    <svg
                      className="absolute inset-0 w-full h-full"
                      viewBox="0 0 100 100"
                      preserveAspectRatio="none"
                    >
                      <line
                        x1="10"
                        y1="10"
                        x2="90"
                        y2="90"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                      <line
                        x1="90"
                        y1="10"
                        x2="10"
                        y2="90"
                        stroke="white"
                        strokeWidth="4"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>
              ) : (
                <span className="text-zinc-600 text-xs">Empty</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
