import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Plus, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  useDroppable,
  closestCenter,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { supabase, Project, Task } from '../lib/supabase';

type Status = 'todo' | 'in_progress' | 'done';

const COLUMN_CONFIG: Record<Status, { label: string; color: string }> = {
  todo: { label: 'To Do', color: '#007AFF' },
  in_progress: { label: 'In Progress', color: '#FF9500' },
  done: { label: 'Done', color: '#34C759' },
};

function glow(color: string) {
  return {
    borderColor: color,
    boxShadow: `0 0 8px ${color}80, 0 0 16px ${color}60, 0 0 24px ${color}40`,
  };
}

// --- DraggableCard ---

interface DraggableCardProps {
  task: Task;
  color: string;
  onDelete: (id: string) => void;
  onEdit: (id: string, description: string) => void;
}

function DraggableCard({ task, color, onDelete, onEdit }: DraggableCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(task.description);
  const [confirming, setConfirming] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
  });

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  const commitEdit = useCallback(() => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== task.description) {
      onEdit(task.id, trimmed);
    } else {
      setEditValue(task.description);
    }
    setIsEditing(false);
  }, [editValue, task.description, task.id, onEdit]);

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg border-2 select-none"
      style={{
        ...glow(color),
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.2 : 1,
      }}
    >
      {/* Drag handle */}
      <span
        {...listeners}
        onPointerDown={(e) => e.stopPropagation()}
        className="flex-shrink-0 text-zinc-500 hover:text-zinc-300 cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical size={14} />
      </span>

      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') { setEditValue(task.description); setIsEditing(false); }
          }}
          onBlur={commitEdit}
          className="flex-1 min-w-0 bg-zinc-700 text-white text-sm rounded px-2 py-0.5 focus:outline-none border border-zinc-500"
        />
      ) : (
        <span
          className="flex-1 text-white text-sm break-words min-w-0 cursor-text"
          onDoubleClick={() => setIsEditing(true)}
          title="Double-click to edit"
        >
          {task.description}
        </span>
      )}

      {confirming ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => { setConfirming(false); onDelete(task.id); }}
            className="px-2 py-0.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Delete
          </button>
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setConfirming(false)}
            className="px-2 py-0.5 text-xs bg-zinc-600 hover:bg-zinc-500 text-white rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => setConfirming(true)}
          className="flex-shrink-0 text-zinc-400 hover:text-red-400 transition-colors"
          aria-label="Delete task"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}

// --- CardOverlay (rendered in DragOverlay while dragging) ---

function CardOverlay({ task }: { task: Task }) {
  const { color } = COLUMN_CONFIG[task.status];
  return (
    <div
      className="flex items-center gap-2 p-3 bg-zinc-800 rounded-lg border-2 cursor-grabbing select-none"
      style={glow(color)}
    >
      <GripVertical size={14} className="flex-shrink-0 text-zinc-500" />
      <span className="flex-1 text-white text-sm break-words min-w-0">{task.description}</span>
      <X size={14} className="flex-shrink-0 text-zinc-400" />
    </div>
  );
}

// --- DroppableColumn ---

interface DroppableColumnProps {
  status: Status;
  tasks: Task[];
  onDelete: (id: string) => void;
  onEdit: (id: string, description: string) => void;
  onAddTask: (status: Status, description: string) => void;
  canAddMore: boolean;
}

function DroppableColumn({ status, tasks, onDelete, onEdit, onAddTask, canAddMore }: DroppableColumnProps) {
  const { label, color } = COLUMN_CONFIG[status];
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const [isAdding, setIsAdding] = useState(false);
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isAdding) inputRef.current?.focus();
  }, [isAdding]);

  const commitAdd = () => {
    const text = inputText.trim();
    if (text) onAddTask(status, text);
    setInputText('');
    setIsAdding(false);
  };

  const cancelAdd = () => {
    setInputText('');
    setIsAdding(false);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 border border-zinc-700 rounded-lg p-3">
      {/* Column header */}
      <div
        className="rounded-lg px-4 py-2 mb-3 text-center font-semibold text-white text-sm border-2 flex-shrink-0"
        style={glow(color)}
      >
        {label} / {tasks.length}
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto rounded-lg p-2 transition-colors duration-150"
        style={{
          minHeight: '120px',
          backgroundColor: isOver ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.02)',
          outline: isOver ? `2px solid ${color}60` : '2px solid transparent',
          outlineOffset: '-2px',
        }}
      >
        <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-2">
            {tasks.map((task) => (
              <DraggableCard key={task.id} task={task} color={color} onDelete={onDelete} onEdit={onEdit} />
            ))}
          </div>
        </SortableContext>

        {/* Add task — sits just below the last card */}
        {isAdding ? (
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitAdd();
              if (e.key === 'Escape') cancelAdd();
            }}
            onBlur={cancelAdd}
            placeholder="Task description… (Enter to save)"
            className="w-full mt-2 p-2 rounded bg-zinc-700 text-white text-sm placeholder-zinc-400 focus:outline-none border border-zinc-500"
          />
        ) : canAddMore ? (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
            className="w-full flex items-center justify-center gap-1 mt-2 py-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm rounded hover:bg-zinc-800"
          >
            <Plus size={14} />
            Add task
          </button>
        ) : null}
      </div>
    </div>
  );
}

// --- KanbanView ---

interface KanbanViewProps {
  project: Project;
  onClose: () => void;
}

export default function KanbanView({ project, onClose }: KanbanViewProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const activeTask = tasks.find((t) => t.id === activeTaskId) ?? null;

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('position', { ascending: true });
      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }
      setTasks(data || []);
    };
    fetchTasks();
  }, [project.id]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTaskId(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;
    const draggedTask = tasks.find((t) => t.id === taskId);
    if (!draggedTask) return;

    const isOverColumn = (['todo', 'in_progress', 'done'] as string[]).includes(overId);
    const overTask = tasks.find((t) => t.id === overId);

    if (isOverColumn) {
      // Dropped on empty column area — change status
      const newStatus = overId as Status;
      if (draggedTask.status === newStatus) return;
      const previousTasks = tasks;
      setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', taskId);
      if (error) { console.error('Error updating status:', error); setTasks(previousTasks); }
    } else if (overTask) {
      if (draggedTask.status === overTask.status) {
        // Same column — reorder and save positions
        const columnTasks = tasks
          .filter((t) => t.status === draggedTask.status)
          .sort((a, b) => a.position - b.position);
        const oldIndex = columnTasks.findIndex((t) => t.id === taskId);
        const newIndex = columnTasks.findIndex((t) => t.id === overId);
        if (oldIndex === newIndex) return;

        const originalPositions = columnTasks.map((t) => t.position);
        const reordered = arrayMove(columnTasks, oldIndex, newIndex);
        const updatedColumnTasks = reordered.map((task, i) => ({ ...task, position: originalPositions[i] }));

        setTasks([...tasks.filter((t) => t.status !== draggedTask.status), ...updatedColumnTasks]);

        // Save only the tasks whose position actually changed
        const changedTasks = updatedColumnTasks.filter((t) => {
          const original = columnTasks.find((ot) => ot.id === t.id);
          return original && original.position !== t.position;
        });
        if (changedTasks.length > 0) {
          await Promise.all(
            changedTasks.map((t) =>
              supabase
                .from('tasks')
                .update({ position: t.position, updated_at: new Date().toISOString() })
                .eq('id', t.id)
            )
          );
        }
      } else {
        // Dropped on a card in a different column — change status
        const newStatus = overTask.status;
        const previousTasks = tasks;
        setTasks(tasks.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t)));
        const { error } = await supabase
          .from('tasks')
          .update({ status: newStatus, updated_at: new Date().toISOString() })
          .eq('id', taskId);
        if (error) { console.error('Error updating status:', error); setTasks(previousTasks); }
      }
    }
  };

  const handleEditTask = async (taskId: string, description: string) => {
    const previousTasks = tasks;
    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, description } : t)));
    const { error } = await supabase
      .from('tasks')
      .update({ description, updated_at: new Date().toISOString() })
      .eq('id', taskId);
    if (error) {
      console.error('Error updating task:', error);
      setTasks(previousTasks);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    const previousTasks = tasks;
    setTasks(tasks.filter((t) => t.id !== taskId));

    const { error } = await supabase.from('tasks').delete().eq('id', taskId);
    if (error) {
      console.error('Error deleting task:', error);
      setTasks(previousTasks);
    }
  };

  const handleAddTask = async (status: Status, description: string) => {
    if (tasks.length >= 50) return;

    const { data, error } = await supabase
      .from('tasks')
      .insert([{ project_id: project.id, description, status, position: tasks.length }])
      .select()
      .single();

    if (error) {
      console.error('Error adding task:', error);
      return;
    }
    setTasks((prev) => [...prev, data]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-4 bg-zinc-900 border-b-2 flex-shrink-0"
        style={{ borderColor: project.color }}
      >
        <h1 className="text-2xl font-bold" style={{ color: project.color }}>
          {project.name}
        </h1>
        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors"
          aria-label="Close Kanban view"
        >
          <X size={24} />
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 flex min-h-0 p-6 gap-6">
        <DndContext collisionDetection={closestCenter} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          {(['todo', 'in_progress', 'done'] as Status[]).map((status) => (
            <DroppableColumn
              key={status}
              status={status}
              tasks={tasks.filter((t) => t.status === status)}
              onDelete={handleDeleteTask}
              onEdit={handleEditTask}
              onAddTask={handleAddTask}
              canAddMore={tasks.length < 50}
            />
          ))}
          <DragOverlay>
            {activeTask ? <CardOverlay task={activeTask} /> : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  );
}
