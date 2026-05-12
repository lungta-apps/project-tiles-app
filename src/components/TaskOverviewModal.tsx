import { useState } from 'react';
import { X, Circle, Clock } from 'lucide-react';
import { supabase, type Board, type Project, type Task } from '../lib/supabase';

interface TaskOverviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: Board[];
}

type FilterType = 'todo' | 'in_progress';

interface ProjectWithTasks {
  project: Project;
  tasks: Task[];
}

export default function TaskOverviewModal({ isOpen, onClose, boards }: TaskOverviewModalProps) {
  const [filter, setFilter] = useState<FilterType | null>(null);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ProjectWithTasks[]>([]);

  if (!isOpen) return null;

  const fetchTasks = async (selectedFilter: FilterType) => {
    setFilter(selectedFilter);
    setLoading(true);
    try {
      const boardIds = boards.map((b) => b.id);

      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('board_id', boardIds)
        .or('completed.is.null,completed.eq.false')
        .order('position', { ascending: true });

      if (projectsError) throw projectsError;
      if (!projectsData || projectsData.length === 0) {
        setData([]);
        setLoading(false);
        return;
      }

      const projectIds = projectsData.map((p) => p.id);

      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('*')
        .in('project_id', projectIds)
        .eq('status', selectedFilter)
        .order('position', { ascending: true });

      if (tasksError) throw tasksError;

      const result: ProjectWithTasks[] = projectsData
        .map((project) => ({
          project,
          tasks: (tasksData ?? []).filter((t) => t.project_id === project.id),
        }))
        .filter(({ tasks }) => tasks.length > 0);

      setData(result);
    } catch (err) {
      console.error('Error fetching task overview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFilter(null);
    setData([]);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4"
      onClick={handleClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-zinc-800">
          <h2 className="text-white text-lg font-semibold">Task Overview</h2>
          <button onClick={handleClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {!filter ? (
          <div className="p-5 flex flex-col gap-3">
            <p className="text-zinc-400 text-sm mb-1">Show tasks across all boards:</p>
            <button
              onClick={() => fetchTasks('todo')}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors text-left"
            >
              <Circle size={20} className="text-gray-400 flex-shrink-0" />
              <span>All tasks to do</span>
            </button>
            <button
              onClick={() => fetchTasks('in_progress')}
              className="flex items-center gap-3 w-full px-4 py-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition-colors text-left"
            >
              <Clock size={20} className="text-amber-400 flex-shrink-0" />
              <span>All tasks in progress</span>
            </button>
          </div>
        ) : (
          <div className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => { setFilter(null); setData([]); }}
                className="text-zinc-400 hover:text-white text-sm transition-colors"
              >
                ← Back
              </button>
              <span className="text-zinc-600 text-sm">|</span>
              <span className="text-zinc-300 text-sm flex items-center gap-1.5">
                {filter === 'todo' ? (
                  <><Circle size={14} className="text-gray-400" /> To Do</>
                ) : (
                  <><Clock size={14} className="text-amber-400" /> In Progress</>
                )}
              </span>
            </div>

            {loading ? (
              <div className="text-zinc-500 text-sm text-center py-8">Loading...</div>
            ) : data.length === 0 ? (
              <div className="text-zinc-500 text-sm text-center py-8">
                No {filter === 'todo' ? 'to-do' : 'in-progress'} tasks found.
              </div>
            ) : (
              <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
                {data.map(({ project, tasks }) => (
                  <div key={project.id}>
                    <h3 className="text-sm font-semibold mb-2" style={{ color: project.color }}>
                      {project.name}
                    </h3>
                    <div
                      className="space-y-1.5 pl-3 border-l-2"
                      style={{ borderColor: `${project.color}60` }}
                    >
                      {tasks.map((task) => (
                        <div key={task.id} className="text-zinc-300 text-sm">
                          {task.description}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
