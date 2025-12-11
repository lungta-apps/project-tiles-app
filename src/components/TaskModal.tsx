import React, { useState, useEffect } from 'react';
import { supabase, Project, Task } from '../lib/supabase';

interface TaskModalProps {
  project: Project;
  onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ project, onClose }) => {
  const [tasks, setTasks] = useState<{ description: string; is_completed: boolean }[]>(
    Array(10).fill({ description: '', is_completed: false })
  );
  const [existingTaskObjects, setExistingTaskObjects] = useState<Task[]>([]);

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', project.id)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching tasks:', error);
        return;
      }

      setExistingTaskObjects(data || []);
      const loadedTasks = Array(10).fill({ description: '', is_completed: false });
      data?.forEach((task, index) => {
        if (index < 10) {
          loadedTasks[index] = { description: task.description, is_completed: task.is_completed };
        }
      });
      setTasks(loadedTasks);
    };

    fetchTasks();
  }, [project.id]);

  const handleDescriptionChange = (index: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], description: value };
    setTasks(newTasks);
  };

  const handleCompletionChange = (index: number, isCompleted: boolean) => {
    const newTasks = [...tasks];
    newTasks[index] = { ...newTasks[index], is_completed: isCompleted };
    setTasks(newTasks);
  };

  const handleSaveTasks = async () => {
    try {
      const tasksToInsert: Omit<Task, 'id' | 'created_at' | 'updated_at'>[] = [];
      const tasksToUpdate: Omit<Task, 'created_at' | 'updated_at'>[] = [];
      const idsToDelete: string[] = [];

      for (let i = 0; i < 10; i++) {
        const uiTask = tasks[i];
        const originalTask = existingTaskObjects[i];

        const description = uiTask.description.trim();
        const hasText = description !== '';
        const hadTaskBefore = originalTask !== undefined;

        if (hasText && !hadTaskBefore) {
          // Case 1: New task to be inserted
          tasksToInsert.push({
            project_id: project.id,
            description: description,
            is_completed: uiTask.is_completed,
          });
        } else if (hasText && hadTaskBefore) {
          // Case 2: Existing task to be updated
          tasksToUpdate.push({
            id: originalTask.id,
            project_id: project.id,
            description: description,
            is_completed: uiTask.is_completed,
          });
        } else if (!hasText && hadTaskBefore) {
          // Case 3: Existing task to be deleted
          idsToDelete.push(originalTask.id);
        }
      }

      // Perform DB operations
      const promises = [];
      if (idsToDelete.length > 0) {
        promises.push(supabase.from('tasks').delete().in('id', idsToDelete));
      }
      if (tasksToInsert.length > 0) {
        promises.push(supabase.from('tasks').upsert(tasksToInsert));
      }
      if (tasksToUpdate.length > 0) {
        promises.push(supabase.from('tasks').upsert(tasksToUpdate));
      }

      const results = await Promise.all(promises);
      results.forEach(result => {
        if (result.error) throw result.error;
      });

      onClose(); // Close modal after saving
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-sm sm:max-w-md">
        <h2 className="text-white text-xl mb-4">Tasks for {project.name}</h2>
        <div className="space-y-2">
          {tasks.map((task, i) => (
            <div key={i} className="flex items-center">
              <input
                type="checkbox"
                className="mr-2 h-5 w-5 rounded bg-gray-600 text-blue-500 focus:ring-blue-500"
                checked={task.is_completed}
                onChange={(e) => handleCompletionChange(i, e.target.checked)}
              />
              <input
                type="text"
                className={`w-full p-2 rounded bg-gray-600 text-white placeholder-gray-400 ${task.is_completed ? 'line-through' : ''}`}
                placeholder={`Task ${i + 1}`}
                value={task.description}
                onChange={(e) => handleDescriptionChange(i, e.target.value)}
              />
            </div>
          ))}
        </div>
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
