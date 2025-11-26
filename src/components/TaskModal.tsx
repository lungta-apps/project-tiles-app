import React, { useState, useEffect } from 'react';
import { supabase, Project, Task } from '../lib/supabase';

interface TaskModalProps {
  project: Project;
  onClose: () => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ project, onClose }) => {
  const [tasks, setTasks] = useState<string[]>(Array(5).fill('')); // State for 5 tasks
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
      const loadedTasks = Array(5).fill('');
      data?.forEach((task, index) => {
        if (index < 5) loadedTasks[index] = task.description;
      });
      setTasks(loadedTasks);
    };

    fetchTasks();
  }, [project.id]);

  const handleTaskChange = (index: number, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = value;
    setTasks(newTasks);
  };

  const handleSaveTasks = async () => {
    const tasksToSave = tasks.map((description, index) => {
      const existingTask = existingTaskObjects[index];
      return {
        id: existingTask?.id,
        description: description.trim(),
        project_id: project.id,
      };
    }).filter(task => task.description !== '' || task.id); // Only save non-empty new tasks or existing tasks

    try {
      // Delete tasks that were cleared
      const tasksToDelete = existingTaskObjects.filter(
        (existingTask) => !tasksToSave.some((t) => t.id === existingTask.id) && tasks.every(d => d.trim() !== existingTask.description)
      );
      if (tasksToDelete.length > 0) {
        await supabase.from('tasks').delete().in('id', tasksToDelete.map(t => t.id));
      }


      // Upsert (update or insert) remaining tasks
      const newOrUpdatedTasks = tasksToSave.map(task => {
        if (task.id) { // Existing task, might be updated
          return { id: task.id, description: task.description, project_id: task.project_id };
        } else if (task.description !== '') { // New task
          return { description: task.description, project_id: task.project_id };
        }
        return null;
      }).filter(Boolean); // Filter out nulls

      if (newOrUpdatedTasks.length > 0) {
        const { error } = await supabase.from('tasks').upsert(newOrUpdatedTasks, { onConflict: 'id' });
        if (error) throw error;
      }

      onClose(); // Close modal after saving
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-96">
        <h2 className="text-white text-xl mb-4">Tasks for {project.name}</h2>
        <div className="space-y-2">
          {tasks.map((task, i) => (
            <input
              key={i}
              type="text"
              className="w-full p-2 rounded bg-gray-600 text-white placeholder-gray-400"
              placeholder={`Task ${i + 1}`}
              value={task}
              onChange={(e) => handleTaskChange(i, e.target.value)}
            />
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
