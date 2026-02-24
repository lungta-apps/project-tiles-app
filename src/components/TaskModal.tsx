import React, { useState, useEffect } from 'react';
import { Trash2, Circle, Clock, CheckCircle2, GripVertical } from 'lucide-react';
import {
  DndContext,
  DragEndEvent,
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

interface TaskModalProps {
  project: Project;
  onClose: () => void;
}

type UITask = {
  key: string;
  id: string | null;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
};

const makeKey = () => Math.random().toString(36).slice(2, 9);

// --- SortableTaskRow ---

interface SortableTaskRowProps {
  task: UITask;
  index: number;
  onDescriptionChange: (index: number, value: string) => void;
  onStatusCycle: (index: number) => void;
  onDelete: (index: number) => void;
}

function SortableTaskRow({ task, index, onDescriptionChange, onStatusCycle, onDelete }: SortableTaskRowProps) {
  const [confirming, setConfirming] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.key,
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      className="flex items-center gap-2"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : undefined,
      }}
    >
      {/* Drag handle — only active when row has content */}
      <span
        className={`flex-shrink-0 p-1 rounded transition-colors touch-none ${
          task.description
            ? 'cursor-grab text-zinc-500 hover:text-zinc-300'
            : 'text-transparent pointer-events-none'
        }`}
        {...(task.description ? listeners : {})}
        aria-label="Drag to reorder"
      >
        <GripVertical size={16} />
      </span>

      {/* Status cycle button */}
      <button
        type="button"
        onClick={() => onStatusCycle(index)}
        className="flex-shrink-0 p-0.5 hover:opacity-75 transition-opacity"
        title={task.status === 'todo' ? 'To do' : task.status === 'in_progress' ? 'In progress' : 'Done'}
      >
        {task.status === 'done' && <CheckCircle2 size={20} className="text-green-400" />}
        {task.status === 'in_progress' && <Clock size={20} className="text-amber-400" />}
        {task.status === 'todo' && <Circle size={20} className="text-gray-400" />}
      </button>

      {/* Description input */}
      <input
        type="text"
        className={`flex-1 min-w-0 p-2 rounded bg-gray-600 placeholder-gray-400 ${
          task.status === 'done' ? 'line-through text-gray-400' : 'text-white'
        }`}
        placeholder="Task description"
        value={task.description}
        onChange={(e) => onDescriptionChange(index, e.target.value)}
      />

      {/* Delete button / inline confirmation */}
      {confirming ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => { setConfirming(false); onDelete(index); }}
            className="px-2 py-1 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
          >
            Delete
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="px-2 py-1 text-xs bg-zinc-600 hover:bg-zinc-500 text-white rounded transition-colors"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => task.description ? setConfirming(true) : onDelete(index)}
          className="flex-shrink-0 p-2 text-gray-400 hover:text-red-400 hover:bg-gray-700 rounded transition-colors"
          aria-label={`Delete task ${index + 1}`}
          title="Delete task"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}

// --- TaskModal ---

const TaskModal: React.FC<TaskModalProps> = ({ project, onClose }) => {
  const [tasks, setTasks] = useState<UITask[]>([]);
  const [deletedIds, setDeletedIds] = useState<string[]>([]);

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

      const loadedTasks: UITask[] = (data ?? []).map((task) => ({
        key: task.id,
        id: task.id,
        description: task.description,
        status: task.status,
      }));

      setTasks(loadedTasks);
    };

    fetchTasks();
  }, [project.id]);

  const handleDescriptionChange = (index: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], description: value };
    setTasks(newTasks);
  };

  const handleStatusCycle = (index: number) => {
    const newTasks = [...tasks];
    const current = newTasks[index].status;
    const next = current === 'todo' ? 'in_progress' : current === 'in_progress' ? 'done' : 'todo';
    newTasks[index] = { ...newTasks[index], status: next };
    setTasks(newTasks);
  };

  const handleDeleteTask = (index: number) => {
    const task = tasks[index];
    if (task.id) {
      setDeletedIds((prev) => [...prev, task.id!]);
    }
    setTasks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddTask = () => {
    setTasks((prev) => [...prev, { key: makeKey(), id: null, description: '', status: 'todo' as const }]);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = tasks.findIndex((t) => t.key === active.id);
    const newIndex = tasks.findIndex((t) => t.key === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    setTasks(arrayMove(tasks, oldIndex, newIndex));
  };

  const handleSaveTasks = async () => {
    try {
      const tasksToInsert: Omit<Task, 'id' | 'created_at' | 'updated_at'>[] = [];
      const tasksToUpdate: Omit<Task, 'created_at' | 'updated_at'>[] = [];

      tasks.forEach((task, index) => {
        const description = task.description.trim();
        if (!description) return;

        if (task.id) {
          tasksToUpdate.push({
            id: task.id,
            project_id: project.id,
            description,
            status: task.status,
            position: index,
          });
        } else {
          tasksToInsert.push({
            project_id: project.id,
            description,
            status: task.status,
            position: index,
          });
        }
      });

      const promises = [];
      if (deletedIds.length > 0) {
        promises.push(supabase.from('tasks').delete().in('id', deletedIds));
      }
      if (tasksToInsert.length > 0) {
        promises.push(supabase.from('tasks').insert(tasksToInsert));
      }
      if (tasksToUpdate.length > 0) {
        promises.push(supabase.from('tasks').upsert(tasksToUpdate));
      }

      const results = await Promise.all(promises);
      results.forEach((result) => {
        if (result.error) throw result.error;
      });

      onClose();
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-sm sm:max-w-md">
        <h2 className="text-white text-xl mb-4">Tasks for {project.name}</h2>
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={tasks.map((t) => t.key)} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {tasks.map((task, i) => (
                <SortableTaskRow
                  key={task.key}
                  task={task}
                  index={i}
                  onDescriptionChange={handleDescriptionChange}
                  onStatusCycle={handleStatusCycle}
                  onDelete={handleDeleteTask}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <button
          type="button"
          onClick={handleAddTask}
          className="mt-3 w-full py-2 text-sm text-zinc-400 hover:text-white border border-dashed border-zinc-600 hover:border-zinc-400 rounded transition-colors"
        >
          + Add Task
        </button>
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveTasks}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
          <button
            onClick={onClose}
            className="ml-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;
