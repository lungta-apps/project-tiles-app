import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragStartEvent,
  type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ProjectTile from './ProjectTile';
import AddProjectModal from './AddProjectModal';
import TaskModal from './TaskModal';
import NotesModal from './NotesModal';
import KanbanView from './KanbanView';
import OverviewModal from './OverviewModal';
import MobileProjectCarousel from './MobileProjectCarousel';
import { supabase, type Project, type Board } from '../lib/supabase';
import AuthPanel from "@/components/AuthPanel";
import SignInModal from "@/components/SignInModal";
import { useIsMobile } from '@/hooks/useIsMobile';

// --- SortableGridCell ---
interface SortableGridCellProps {
  position: number;
  project: Project | undefined;
  onAddProject: (position: number) => void;
  onDelete: (id: string) => void;
  onChangeColor: (id: string) => void;
  onToggleCompleted: (id: string) => void;
  onShowTasks: (project: Project) => void;
  onShowNotes: (project: Project) => void;
  onOpenKanban: (project: Project) => void;
  onRequestMove: (project: Project) => void;
}

function SortableGridCell({
  position,
  project,
  onAddProject,
  onDelete,
  onChangeColor,
  onToggleCompleted,
  onShowTasks,
  onShowNotes,
  onOpenKanban,
  onRequestMove,
}: SortableGridCellProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
    useSortable({ id: position });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    minHeight: '200px',
  };

  return (
    <div ref={setNodeRef} style={style} className="p-1" role="gridcell">
      {project ? (
        <ProjectTile
          project={project}
          onDelete={onDelete}
          onChangeColor={onChangeColor}
          onToggleCompleted={onToggleCompleted}
          onShowTasks={onShowTasks}
          onShowNotes={onShowNotes}
          onOpenKanban={onOpenKanban}
          onRequestMove={onRequestMove}
          isDragging={isDragging}
          isDragOver={isOver}
          dragListeners={listeners as React.HTMLAttributes<HTMLDivElement>}
          dragAttributes={attributes as React.HTMLAttributes<HTMLDivElement>}
        />
      ) : (
        <div
          {...attributes}
          {...listeners}
          className={`w-full h-full ${isDragging ? 'opacity-50' : ''}`}
        >
          <button
            onClick={() => onAddProject(position)}
            className={`w-full h-full bg-zinc-900 rounded-lg flex flex-col items-center justify-center transition-all duration-300 hover:bg-zinc-800 hover:border-zinc-600 border-2 border-zinc-700 border-dashed focus:outline-none focus:ring-2 focus:ring-blue-500 ${isOver ? 'ring-2 ring-blue-500' : ''}`}
            aria-label="Add new project"
          >
            <Plus size={48} className="text-zinc-600 mb-2" />
            <span className="text-zinc-500 text-sm">Add Project</span>
          </button>
        </div>
      )}
    </div>
  );
}

// --- ProjectGrid ---
interface ProjectGridProps {
  boards: Board[];
  currentBoardId: string | null;
  setBoards: (boards: Board[]) => void;
  setCurrentBoardId: (id: string | null) => void;
}

export default function ProjectGrid({
  boards,
  currentBoardId,
  setBoards,
  setCurrentBoardId,
}: ProjectGridProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [pendingPosition, setPendingPosition] = useState<number | null>(null);
  const [selectedProjectForTasks, setSelectedProjectForTasks] = useState<Project | null>(null);
  const [selectedProjectForNotes, setSelectedProjectForNotes] = useState<Project | null>(null);
  const [selectedProjectForKanban, setSelectedProjectForKanban] = useState<Project | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [draggedBoardId, setDraggedBoardId] = useState<string | null>(null);
  const [dragOverBoardId, setDragOverBoardId] = useState<string | null>(null);
  const [activeDragPosition, setActiveDragPosition] = useState<number | null>(null);
  const [projectToMove, setProjectToMove] = useState<Project | null>(null);

  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUser(session?.user ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      loadBoards();
    } else {
      setBoards([]);
      setCurrentBoardId(null);
    }
  }, [user]);

  useEffect(() => {
    if (user && currentBoardId) {
      loadProjects(currentBoardId);
    } else {
      setProjects([]);
      setLoading(false);
    }
  }, [user, currentBoardId]);

  const loadBoards = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('position', { ascending: true });
      if (error) throw error;

      if (data && data.length > 0) {
        setBoards(data);
        if (!currentBoardId) {
          setCurrentBoardId(data[0].id);
        }
      } else {
        const { data: created, error: insertError } = await supabase
          .from('boards')
          .insert([{ user_id: user.id, name: 'Main', position: 0 }])
          .select()
          .single();
        if (insertError) throw insertError;
        setBoards([created]);
        setCurrentBoardId(created.id);
      }
    } catch (err) {
      console.error('Error loading boards:', err);
    }
  };

  const loadProjects = async (boardId: string | null) => {
    if (!boardId) {
      setProjects([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true });
      if (projectsError) throw projectsError;

      if (projectsData) {
        const projectIds = projectsData.map((p) => p.id);
        const { data: tasksData, error: tasksError } = await supabase
          .from('tasks')
          .select('*')
          .in('project_id', projectIds);

        if (tasksError) throw tasksError;

        const projectsWithTasks = projectsData.map((project) => ({
          ...project,
          tasks: tasksData.filter((task) => task.project_id === project.id),
        }));
        setProjects(projectsWithTasks);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProject = async (name: string, color: string) => {
    try {
      const targetPosition = pendingPosition ?? projects.length;
      if (targetPosition >= 9) {
        alert('Maximum of 9 projects reached');
        return;
      }
      if (!currentBoardId) {
        alert('No board selected');
        return;
      }
      const { error } = await supabase
        .from('projects')
        .insert([{ name, color, position: targetPosition, board_id: currentBoardId }]);
      if (error) throw error;
      await loadProjects(currentBoardId);
      setIsModalOpen(false);
      setPendingPosition(null);
    } catch (error) {
      console.error('Error adding project:', error);
    }
  };

  const handleChangeColor = (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    setEditingProject(project);
    setPendingPosition(null);
    setIsModalOpen(true);
  };

  const handleToggleCompleted = async (projectId: string) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return;
    const currentCompleted = project.completed ?? false;
    const nextCompleted = !currentCompleted;
    try {
      const { error } = await supabase
        .from('projects')
        .update({ completed: nextCompleted, updated_at: new Date().toISOString() })
        .eq('id', projectId);
      if (error) throw error;
      setProjects(projects.map((p) => p.id === projectId ? { ...p, completed: nextCompleted } : p));
    } catch (err) {
      console.error('Error toggling completed:', err);
    }
  };

  const handleUpdateProject = async (name: string, color: string) => {
    if (!editingProject) return;
    try {
      const { error } = await supabase
        .from('projects')
        .update({ name, color, updated_at: new Date().toISOString() })
        .eq('id', editingProject.id);
      if (error) throw error;
      await loadProjects(currentBoardId);
      setIsModalOpen(false);
      setEditingProject(null);
    } catch (err) {
      console.error('Error updating project:', err);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      await loadProjects(currentBoardId);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleShowTasks = (project: Project) => {
    setSelectedProjectForTasks(project);
  };

  const handleShowNotes = (project: Project) => {
    setSelectedProjectForNotes(project);
  };

  const handleRenameBoard = async (boardId: string, currentName: string) => {
    if (!user) return;
    const newName = prompt("Rename board:", currentName);
    if (!newName || newName.trim() === currentName.trim()) return;
    try {
      const { data, error } = await supabase
        .from('boards')
        .update({ name: newName.trim(), updated_at: new Date().toISOString() })
        .eq('id', boardId)
        .select()
        .single();
      if (error) return console.error("Error renaming board:", error);
      setBoards(boards.map((b) => b.id === boardId ? { ...b, name: data.name } : b));
    } catch (err) {
      console.error("Unexpected error renaming board:", err);
    }
  };

  const handleDeleteBoard = async (boardId: string) => {
    if (!user) return;
    const board = boards.find((b) => b.id === boardId);
    if (!board) return;
    if (boards.length <= 1) return alert("You need at least one board.");
    if (!confirm(`Delete board "${board.name}"? This will also delete its projects.`)) return;
    try {
      await supabase.from("projects").delete().eq("board_id", boardId);
      await supabase.from("boards").delete().eq("id", boardId);
      const remainingBoards = boards.filter((b) => b.id !== boardId);
      setBoards(remainingBoards);
      if (currentBoardId === boardId) {
        const nextBoardId = remainingBoards.length > 0 ? remainingBoards[0].id : null;
        setCurrentBoardId(nextBoardId);
        await loadProjects(nextBoardId);
      }
    } catch (err) {
      console.error("Error deleting board:", err);
    }
  };

  const handleReorderBoards = async (draggedId: string, targetId: string) => {
    if (!user || draggedId === targetId) return;

    const draggedIndex = boards.findIndex((b) => b.id === draggedId);
    const targetIndex = boards.findIndex((b) => b.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Create new array with reordered boards
    const reorderedBoards = [...boards];
    const [draggedBoard] = reorderedBoards.splice(draggedIndex, 1);
    reorderedBoards.splice(targetIndex, 0, draggedBoard);

    // Update positions in the reordered array
    const updatedBoards = reorderedBoards.map((board, index) => ({
      ...board,
      position: index,
    }));

    // Optimistically update UI
    setBoards(updatedBoards);

    // Update positions in database
    try {
      const updates = updatedBoards.map((board) =>
        supabase
          .from('boards')
          .update({ position: board.position, updated_at: new Date().toISOString() })
          .eq('id', board.id)
      );
      await Promise.all(updates);
    } catch (err) {
      console.error("Error reordering boards:", err);
      // Reload boards to restore correct order
      await loadBoards();
    }
  };

  const handleReorderProjects = async (fromPosition: number, toPosition: number) => {
    if (!user || !currentBoardId || fromPosition === toPosition) return;

    // Create an array of 9 slots (the entire grid)
    // Each slot either contains a project or is null (empty)
    const slots = Array.from({ length: 9 }, (_, index) => {
      const project = projects.find(p => p.position === index);
      return project || null;
    });

    // Reorder the slots array - move the slot from fromPosition to toPosition
    const [draggedSlot] = slots.splice(fromPosition, 1);
    slots.splice(toPosition, 0, draggedSlot);

    // Extract non-null projects and update their positions based on new indices
    const updatedProjects = slots
      .map((project, index) => {
        if (project) {
          return { ...project, position: index };
        }
        return null;
      })
      .filter((p): p is Project => p !== null);

    // Optimistically update UI
    setProjects(updatedProjects);

    // Update positions in database for all affected projects
    try {
      const updates = updatedProjects.map((project) =>
        supabase
          .from('projects')
          .update({ position: project.position, updated_at: new Date().toISOString() })
          .eq('id', project.id)
      );
      await Promise.all(updates);
    } catch (err) {
      console.error("Error reordering projects:", err);
      // Reload projects to restore correct order
      await loadProjects(currentBoardId);
    }
  };

  const gridItems = Array.from({ length: 9 }, (_, index) => {
    const project = projects.find((p) => p.position === index);
    return { position: index, project };
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { distance: 20 } }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragPosition(event.active.id as number);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragPosition(null);
    if (over && active.id !== over.id) {
      handleReorderProjects(active.id as number, over.id as number);
    }
  };

  if (loading && projects.length === 0) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500 text-xl">Loading...</div>
      </div>
    );
  }

  // Handler for mobile carousel to add projects
  const handleMobileAddProject = (position: number) => {
    if (!user) {
      setShowSignInModal(true);
      return;
    }
    setEditingProject(null);
    setPendingPosition(position);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-black p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-4 md:mb-6 flex items-start justify-between gap-2">
          <AuthPanel />
          {isMobile && (
            <button
              onClick={() => setShowOverview(true)}
              className="px-3 py-1 rounded border border-zinc-600 text-zinc-300 hover:bg-zinc-800 text-sm whitespace-nowrap flex-shrink-0"
            >
              Overview
            </button>
          )}
        </div>

        <div className="mb-4 flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {boards.map((board) => (
            <button
              key={board.id}
              draggable
              onClick={() => setCurrentBoardId(board.id)}
              onDoubleClick={() => handleRenameBoard(board.id, board.name)}
              onMouseDown={(e) => {
                const timer = setTimeout(() => handleDeleteBoard(board.id), 700);
                (e.target as HTMLElement).dataset.longPressTimer = String(timer);
              }}
              onMouseUp={(e) => {
                const timer = (e.target as HTMLElement).dataset.longPressTimer;
                if (timer) clearTimeout(Number(timer));
              }}
              onMouseLeave={(e) => {
                const timer = (e.target as HTMLElement).dataset.longPressTimer;
                if (timer) clearTimeout(Number(timer));
              }}
              onDragStart={(e) => {
                // Cancel long-press timer when drag starts
                const timer = (e.target as HTMLElement).dataset.longPressTimer;
                if (timer) clearTimeout(Number(timer));
                setDraggedBoardId(board.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setDragOverBoardId(board.id);
              }}
              onDragLeave={() => {
                setDragOverBoardId(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedBoardId) {
                  handleReorderBoards(draggedBoardId, board.id);
                }
                setDraggedBoardId(null);
                setDragOverBoardId(null);
              }}
              onDragEnd={() => {
                setDraggedBoardId(null);
                setDragOverBoardId(null);
              }}
              className={[
                "px-3 py-1 rounded-full text-sm border transition-opacity whitespace-nowrap flex-shrink-0",
                currentBoardId === board.id
                  ? "bg-zinc-900 text-white border-4 border-[#00C7BE]"
                  : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800",
                draggedBoardId === board.id ? "opacity-50" : "",
                dragOverBoardId === board.id ? "border-blue-500" : ""
              ].join(" ")}
            >
              {board.name}
            </button>
          ))}
          <button
            onClick={async () => {
              if (!user) return;
              const newName = prompt("Board name:");
              if (!newName) return;
              const { data, error } = await supabase
                .from('boards')
                .insert([{ user_id: user.id, name: newName, position: boards.length }])
                .select()
                .single();
              if (error) return console.error("Error creating board:", error);
              setBoards([...boards, data]);
              setCurrentBoardId(data.id);
            }}
            className="px-3 py-1 rounded-full text-sm bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700 flex-shrink-0"
          >
            +
          </button>
        </div>

        {/* Mobile: Horizontal card carousel */}
        {isMobile ? (
          <MobileProjectCarousel
            gridItems={gridItems}
            currentBoardId={currentBoardId}
            onAddProject={handleMobileAddProject}
            onDelete={handleDeleteProject}
            onChangeColor={handleChangeColor}
            onToggleCompleted={handleToggleCompleted}
            onShowTasks={handleShowTasks}
            onShowNotes={handleShowNotes}
            onRequestMove={setProjectToMove}
          />
        ) : (
          /* Desktop/tablet: 3x3 grid with touch-friendly drag-and-drop */
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={[0, 1, 2, 3, 4, 5, 6, 7, 8]} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-3 gap-4 md:gap-6 aspect-square" role="grid" aria-label="Project grid">
                {gridItems.map(({ position, project }) => (
                  <SortableGridCell
                    key={project?.id ?? `empty-${position}`}
                    position={position}
                    project={project}
                    onAddProject={handleMobileAddProject}
                    onDelete={handleDeleteProject}
                    onChangeColor={handleChangeColor}
                    onToggleCompleted={handleToggleCompleted}
                    onShowTasks={handleShowTasks}
                    onShowNotes={handleShowNotes}
                    onOpenKanban={setSelectedProjectForKanban}
                    onRequestMove={setProjectToMove}
                  />
                ))}
              </div>
            </SortableContext>
            <DragOverlay>
              {activeDragPosition !== null && (() => {
                const item = gridItems.find(g => g.position === activeDragPosition);
                return (
                  <div style={{ minHeight: '200px', padding: '4px', opacity: 0.9, cursor: 'grabbing', pointerEvents: 'none' }}>
                    {item?.project ? (
                      <ProjectTile
                        project={item.project}
                        onDelete={() => {}}
                        onChangeColor={() => {}}
                        onToggleCompleted={() => {}}
                        onShowTasks={() => {}}
                        onShowNotes={() => {}}
                        isDragging={false}
                        isDragOver={false}
                      />
                    ) : (
                      <div className="w-full h-full bg-zinc-900 rounded-lg border-2 border-zinc-700 border-dashed" style={{ minHeight: '200px' }} />
                    )}
                  </div>
                );
              })()}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      <AddProjectModal
        key={editingProject?.id ?? 'new'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
          setPendingPosition(null);
        }}
        onAdd={editingProject ? handleUpdateProject : handleAddProject}
        initialColor={editingProject?.color}
        initialName={editingProject?.name}
        title={editingProject ? 'Edit Project' : 'Add New Project'}
      />
      <SignInModal isOpen={showSignInModal} onClose={() => setShowSignInModal(false)} />

      {selectedProjectForTasks && (
        <TaskModal
          project={selectedProjectForTasks}
          onClose={() => {
            setSelectedProjectForTasks(null);
            loadProjects(currentBoardId);
          }}
        />
      )}

      {selectedProjectForNotes && (
        <NotesModal
          project={selectedProjectForNotes}
          onClose={() => {
            setSelectedProjectForNotes(null);
            loadProjects(currentBoardId);
          }}
        />
      )}

      <OverviewModal
        isOpen={showOverview}
        onClose={() => setShowOverview(false)}
        projects={projects}
        boardName={boards.find(b => b.id === currentBoardId)?.name || 'Board'}
      />

      {selectedProjectForKanban && (
        <KanbanView
          project={selectedProjectForKanban}
          onClose={() => {
            setSelectedProjectForKanban(null);
            loadProjects(currentBoardId);
          }}
        />
      )}

      {projectToMove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          onClick={() => setProjectToMove(null)}
        >
          <div
            className="bg-zinc-900 border border-zinc-700 rounded-xl p-5 shadow-2xl mx-4 w-full max-w-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-medium mb-4 text-center text-white">
              Move <span className="font-bold" style={{ color: projectToMove.color }}>"{projectToMove.name}"</span> to...
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }, (_, i) => {
                const cellProject = projects.find(p => p.position === i);
                const isCurrent = projectToMove.position === i;
                return (
                  <button
                    key={i}
                    disabled={isCurrent}
                    onClick={() => {
                      handleReorderProjects(projectToMove.position, i);
                      setProjectToMove(null);
                    }}
                    className={`h-16 rounded-lg border text-xs font-medium transition-colors px-1 overflow-hidden ${
                      isCurrent
                        ? 'cursor-not-allowed opacity-50'
                        : cellProject
                        ? 'border-zinc-600 bg-zinc-800 text-white hover:bg-zinc-700 active:bg-zinc-600'
                        : 'border-dashed border-zinc-700 bg-zinc-950 text-zinc-500 hover:bg-zinc-800'
                    }`}
                    style={isCurrent ? { borderColor: projectToMove.color, borderWidth: '2px' } : {}}
                  >
                    {isCurrent ? '(here)' : cellProject
                      ? <span className="block truncate leading-tight">{cellProject.name}</span>
                      : <span className="text-zinc-600">empty</span>
                    }
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setProjectToMove(null)}
              className="mt-4 w-full py-2 text-zinc-500 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
