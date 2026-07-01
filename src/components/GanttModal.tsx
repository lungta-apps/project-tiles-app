import React, { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Pencil, ChevronRight } from 'lucide-react';
import { supabase, type Board } from '../lib/supabase';

const WEEK_W = 44;
const LEFT_W = 240;
const ROW_H = 52;
const TASK_ROW_H = 36;
const MONTH_H = 32;

interface GanttProject {
  id: string;
  name: string;
  color: string;
  board_id: string;
  boardName: string;
  start_date: string | null;
  end_date: string | null;
}

interface GanttTask {
  id: string;
  project_id: string;
  description: string;
  status: 'todo' | 'in_progress' | 'done';
  start_date: string | null;
  end_date: string | null;
}

interface WeekEntry {
  isoWeek: number;
  monday: Date;
  monthKey: string;
  monthLabel: string;
}

interface MonthSection {
  key: string;
  label: string;
  left: number;
  width: number;
}

interface GanttModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: Board[];
  boardId?: string | null;
}

function firstMondayOnOrAfter(d: Date): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  const day = date.getDay(); // 0=Sun, 1=Mon
  if (day !== 1) {
    date.setDate(date.getDate() + (day === 0 ? 1 : 8 - day));
  }
  return date;
}

function isoWeekOf(d: Date): number {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
  const jan4 = new Date(date.getFullYear(), 0, 4);
  return (
    1 +
    Math.round(
      ((date.getTime() - jan4.getTime()) / 86400000 -
        3 +
        ((jan4.getDay() + 6) % 7)) /
        7
    )
  );
}

function buildWeeks(): WeekEntry[] {
  const now = new Date();
  const may1 = new Date(now.getFullYear(), 4, 1);
  const end = new Date(now.getFullYear() + 1, 4, 1);
  const weeks: WeekEntry[] = [];
  const cur = firstMondayOnOrAfter(may1);
  while (cur < end) {
    weeks.push({
      isoWeek: isoWeekOf(cur),
      monday: new Date(cur),
      monthKey: `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`,
      monthLabel: cur.toLocaleString('en-US', { month: 'short', year: 'numeric' }),
    });
    cur.setDate(cur.getDate() + 7);
  }
  return weeks;
}

function buildMonthSections(weeks: WeekEntry[]): MonthSection[] {
  if (weeks.length === 0) return [];
  const totalW = weeks.length * WEEK_W;
  const rangeEnd = new Date(weeks[weeks.length - 1].monday.getTime() + 7 * 86400000);

  const pts: { key: string; label: string; left: number }[] = [];
  let cur = new Date(weeks[0].monday.getFullYear(), weeks[0].monday.getMonth(), 1);

  while (cur < rangeEnd) {
    const yr = cur.getFullYear();
    const mo = cur.getMonth();
    const key = `${yr}-${String(mo + 1).padStart(2, '0')}`;
    const label = cur.toLocaleString('en-US', { month: 'short', year: 'numeric' });
    const dateStr = `${yr}-${String(mo + 1).padStart(2, '0')}-01`;
    const left = pts.length === 0 ? 0 : dayPixelOffset(dateStr, weeks);
    pts.push({ key, label, left });
    cur = new Date(yr, mo + 1, 1);
  }

  return pts.map((s, i) => ({
    ...s,
    width: i < pts.length - 1 ? pts[i + 1].left - s.left : totalW - s.left,
  }));
}

function dayPixelOffset(dateStr: string, weeks: WeekEntry[]): number {
  const target = new Date(dateStr + 'T00:00:00');
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (target >= weeks[i].monday) {
      const dayOfWeek = (target.getDay() + 6) % 7; // Mon=0 … Sun=6
      return i * WEEK_W + (dayOfWeek / 7) * WEEK_W;
    }
  }
  return 0;
}

function fmtDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function DateInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [day, setDay] = useState('');
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const lastEmitted = useRef('');

  useEffect(() => {
    if (value === lastEmitted.current) return;
    const p = value ? value.split('-') : ['', '', ''];
    setYear(p[0] || '');
    setMonth(p[1] || '');
    setDay(p[2] || '');
    lastEmitted.current = value;
  }, [value]);

  const emit = (y: string, m: string, d: string) => {
    if (y.length === 4 && m.length === 2 && d.length === 2) {
      const dateStr = `${y}-${m}-${d}`;
      lastEmitted.current = dateStr;
      onChange(dateStr);
    } else {
      lastEmitted.current = '';
      onChange('');
    }
  };

  return (
    <div className="flex items-center bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 gap-0.5 focus-within:border-zinc-500 transition-colors">
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        placeholder="YYYY"
        maxLength={4}
        value={year}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, '').slice(0, 4);
          setYear(v);
          if (v.length === 4) monthRef.current?.focus();
          emit(v, month, day);
        }}
        className="w-10 bg-transparent text-white text-sm text-center focus:outline-none placeholder-zinc-600"
      />
      <span className="text-zinc-600 text-sm select-none">-</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        placeholder="MM"
        maxLength={2}
        value={month}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
          const num = parseInt(raw, 10);
          const advance = raw.length === 2 || (raw.length === 1 && num >= 2);
          const v = advance && raw.length === 1 ? raw.padStart(2, '0') : raw;
          setMonth(v);
          if (advance) dayRef.current?.focus();
          emit(year, v, day);
        }}
        onKeyDown={(e) => { if (e.key === 'Backspace' && month === '') yearRef.current?.focus(); }}
        className="w-7 bg-transparent text-white text-sm text-center focus:outline-none placeholder-zinc-600"
      />
      <span className="text-zinc-600 text-sm select-none">-</span>
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        placeholder="DD"
        maxLength={2}
        value={day}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, '').slice(0, 2);
          const num = parseInt(raw, 10);
          const advance = raw.length === 2 || (raw.length === 1 && num >= 4);
          const v = advance && raw.length === 1 ? raw.padStart(2, '0') : raw;
          setDay(v);
          emit(year, month, v);
        }}
        onKeyDown={(e) => { if (e.key === 'Backspace' && day === '') monthRef.current?.focus(); }}
        className="w-7 bg-transparent text-white text-sm text-center focus:outline-none placeholder-zinc-600"
      />
    </div>
  );
}

export default function GanttModal({ isOpen, onClose, boards, boardId }: GanttModalProps) {
  const [allProjects, setAllProjects] = useState<GanttProject[]>([]);
  const [tasksByProject, setTasksByProject] = useState<Record<string, GanttTask[]>>({});
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Editing state — only one of editingId (project) or editingTaskId (task) is non-null at a time
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [formProjectId, setFormProjectId] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const weeks = useMemo(() => buildWeeks(), []);
  const monthSections = useMemo(() => buildMonthSections(weeks), [weeks]);
  const totalW = weeks.length * WEEK_W;

  const todayMidnight = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const todayOffset = useMemo(() => {
    const idx = weeks.findIndex((w, i) => {
      const next = i < weeks.length - 1 ? weeks[i + 1].monday : new Date(w.monday.getTime() + 7 * 86400000);
      return todayMidnight >= w.monday && todayMidnight < next;
    });
    if (idx < 0) return -1;
    const dayOfWeek = (todayMidnight.getDay() + 6) % 7; // Mon=0
    return idx * WEEK_W + (dayOfWeek / 7) * WEEK_W;
  }, [weeks, todayMidnight]);

  const scheduled = allProjects.filter((p) => p.start_date && p.end_date);
  const unscheduled = allProjects.filter((p) => !p.start_date || !p.end_date);
  const isEditingAny = editingId !== null || editingTaskId !== null;

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setEditingTaskId(null);
      setFormProjectId('');
      setFormStart('');
      setFormEnd('');
      setAllProjects([]);
      setTasksByProject({});
      setExpandedProjects(new Set());
      return;
    }
    if (boards.length === 0) return;

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const boardIds = boardId ? [boardId] : boards.map((b) => b.id);
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .in('board_id', boardIds)
          .or('completed.is.null,completed.eq.false')
          .order('name', { ascending: true });
        if (error) throw error;

        const projects = (data ?? []).map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          board_id: p.board_id,
          boardName: boards.find((b) => b.id === p.board_id)?.name ?? '',
          start_date: p.start_date ?? null,
          end_date: p.end_date ?? null,
        }));

        // Fetch tasks for all loaded projects
        const projectIds = projects.map((p) => p.id);
        const taskMap: Record<string, GanttTask[]> = {};
        if (projectIds.length > 0) {
          const { data: tasksData } = await supabase
            .from('tasks')
            .select('*')
            .in('project_id', projectIds)
            .order('position', { ascending: true });
          (tasksData ?? []).forEach((t) => {
            if (!taskMap[t.project_id]) taskMap[t.project_id] = [];
            taskMap[t.project_id].push({
              id: t.id,
              project_id: t.project_id,
              description: t.description,
              status: t.status,
              start_date: t.start_date ?? null,
              end_date: t.end_date ?? null,
            });
          });
        }

        if (!cancelled) {
          setAllProjects(projects);
          setTasksByProject(taskMap);
        }
      } catch (err) {
        console.error('Gantt fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, boards, boardId]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const toggleExpand = (projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const openAdd = () => {
    setEditingId('new');
    setEditingTaskId(null);
    setFormProjectId(unscheduled[0]?.id ?? '');
    setFormStart('');
    setFormEnd('');
    setSaveError(null);
  };

  const openEdit = (p: GanttProject) => {
    setEditingId(p.id);
    setEditingTaskId(null);
    setFormStart(p.start_date ?? '');
    setFormEnd(p.end_date ?? '');
    setSaveError(null);
  };

  const openEditTask = (task: GanttTask) => {
    setEditingTaskId(task.id);
    setEditingId(null);
    setFormProjectId('');
    setFormStart(task.start_date ?? '');
    setFormEnd(task.end_date ?? '');
    setSaveError(null);
  };

  const handleSave = async () => {
    if (!formStart || !formEnd || formEnd < formStart) return;
    setSaving(true);
    setSaveError(null);
    try {
      if (editingTaskId) {
        const { error } = await supabase
          .from('tasks')
          .update({ start_date: formStart, end_date: formEnd })
          .eq('id', editingTaskId);
        if (error) throw error;
        setTasksByProject((prev) => {
          const next = { ...prev };
          for (const pid of Object.keys(next)) {
            next[pid] = next[pid].map((t) =>
              t.id === editingTaskId ? { ...t, start_date: formStart, end_date: formEnd } : t
            );
          }
          return next;
        });
        setEditingTaskId(null);
      } else {
        const id = editingId === 'new' ? formProjectId : editingId!;
        const { error } = await supabase
          .from('projects')
          .update({ start_date: formStart, end_date: formEnd, updated_at: new Date().toISOString() })
          .eq('id', id);
        if (error) throw error;
        setAllProjects((prev) =>
          prev.map((p) => (p.id === id ? { ...p, start_date: formStart, end_date: formEnd } : p))
        );
        setEditingId(null);
        setFormProjectId('');
      }
      setFormStart('');
      setFormEnd('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSaveError(msg.includes('column') ? 'Database columns missing — run the SQL migration first.' : 'Save failed. Check console for details.');
      console.error('Gantt save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (id: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ start_date: null, end_date: null, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      setAllProjects((prev) =>
        prev.map((p) => (p.id === id ? { ...p, start_date: null, end_date: null } : p))
      );
      if (editingId === id) setEditingId(null);
    } catch (err) {
      console.error('Gantt remove error:', err);
    }
  };

  const handleRemoveTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ start_date: null, end_date: null })
        .eq('id', taskId);
      if (error) throw error;
      setTasksByProject((prev) => {
        const next = { ...prev };
        for (const pid of Object.keys(next)) {
          next[pid] = next[pid].map((t) =>
            t.id === taskId ? { ...t, start_date: null, end_date: null } : t
          );
        }
        return next;
      });
      if (editingTaskId === taskId) setEditingTaskId(null);
    } catch (err) {
      console.error('Gantt remove task error:', err);
    }
  };

  const cancelForm = () => {
    setEditingId(null);
    setEditingTaskId(null);
    setFormProjectId('');
    setFormStart('');
    setFormEnd('');
    setSaveError(null);
  };

  if (!isOpen) return null;

  const canSave =
    !!formStart &&
    !!formEnd &&
    formEnd >= formStart &&
    !saving &&
    (editingTaskId !== null || editingId !== 'new' || !!formProjectId);

  // Find the task being edited for its label in the form
  const editingTask = editingTaskId
    ? Object.values(tasksByProject).flat().find((t) => t.id === editingTaskId)
    : null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.75rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.75rem, env(safe-area-inset-right))',
      }}
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-7xl flex flex-col min-w-0 overflow-hidden"
        style={{ height: '100%', maxHeight: '100%' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <h2 className="text-white text-lg font-semibold">
            Timeline
            {boardId && (
              <span className="ml-2 text-sm font-normal text-zinc-400">
                — {boards.find((b) => b.id === boardId)?.name ?? 'This Board'}
              </span>
            )}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={openAdd}
              disabled={unscheduled.length === 0 || isEditingAny}
              className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-400 flex items-center justify-center text-zinc-300 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
              title="Add project to timeline"
            >
              <Plus size={18} />
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-zinc-800 hover:bg-zinc-700 border border-zinc-600 hover:border-zinc-400 flex items-center justify-center text-zinc-300 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0 overflow-hidden min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-zinc-500 text-sm">
              Loading...
            </div>
          ) : (
            <div className="h-full overflow-auto" style={{ overscrollBehavior: 'contain' }}>
              <div style={{ minWidth: LEFT_W + totalW }}>

                {/* Month header — sticky top */}
                <div
                  className="flex sticky top-0 z-20 bg-zinc-900 border-b-2 border-zinc-700"
                  style={{ height: MONTH_H }}
                >
                  <div
                    className="sticky left-0 z-30 bg-zinc-900 border-r border-zinc-700 flex items-center px-3 flex-shrink-0"
                    style={{ width: LEFT_W }}
                  >
                    <span className="text-zinc-500 text-xs font-medium">Project</span>
                  </div>
                  <div className="relative flex-shrink-0" style={{ width: totalW, height: MONTH_H }}>
                    {monthSections.map((m) => (
                      <div
                        key={m.key}
                        className="absolute top-0 bottom-0 flex items-center px-2 overflow-hidden border-r-2 border-zinc-600"
                        style={{ left: m.left, width: m.width }}
                      >
                        <span className="text-zinc-300 text-xs font-semibold whitespace-nowrap">
                          {m.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Project rows */}
                {scheduled.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">
                    No projects on timeline yet — add one below.
                  </div>
                ) : (
                  scheduled.map((project) => {
                    const startPx = dayPixelOffset(project.start_date!, weeks);
                    const endPx = dayPixelOffset(project.end_date!, weeks) + WEEK_W / 7;
                    const barLeft = startPx + 2;
                    const barWidth = Math.max(endPx - startPx - 4, WEEK_W / 7);
                    const isEditing = editingId === project.id;
                    const projectTasks = tasksByProject[project.id] ?? [];
                    const hasTasks = projectTasks.length > 0;
                    const isExpanded = expandedProjects.has(project.id);

                    return (
                      <React.Fragment key={project.id}>
                        {/* Project row */}
                        <div
                          className={`flex border-b border-zinc-800 ${isEditing ? 'bg-zinc-800/30' : ''}`}
                          style={{ height: ROW_H }}
                        >
                          {/* Name cell — sticky left */}
                          <div
                            className={`sticky left-0 z-10 border-r border-zinc-700 flex items-center px-3 gap-1.5 flex-shrink-0 ${isEditing ? 'bg-zinc-800/60' : 'bg-zinc-900'}`}
                            style={{ width: LEFT_W }}
                          >
                            {/* Expand toggle — only shown when project has tasks */}
                            {hasTasks ? (
                              <button
                                onClick={() => toggleExpand(project.id)}
                                className="text-zinc-500 hover:text-zinc-300 flex-shrink-0 transition-colors p-0.5"
                                title={isExpanded ? 'Collapse tasks' : 'Expand tasks'}
                              >
                                <ChevronRight
                                  size={12}
                                  className={`transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                                />
                              </button>
                            ) : (
                              <div className="w-4 flex-shrink-0" />
                            )}
                            <div
                              className="w-2 h-2 rounded-full flex-shrink-0"
                              style={{ backgroundColor: project.color }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="text-white text-sm font-medium truncate">{project.name}</div>
                              <div className="text-zinc-500 text-xs truncate">{project.boardName}</div>
                            </div>
                            <button
                              onClick={() => openEdit(project)}
                              className="text-zinc-600 hover:text-zinc-300 flex-shrink-0 transition-colors p-0.5"
                              title="Edit dates"
                            >
                              <Pencil size={12} />
                            </button>
                            <button
                              onClick={() => handleRemove(project.id)}
                              className="text-zinc-600 hover:text-red-400 flex-shrink-0 transition-colors p-0.5"
                              title="Remove from timeline"
                            >
                              <X size={12} />
                            </button>
                          </div>

                          {/* Bar area */}
                          <div
                            className="relative flex-shrink-0"
                            style={{ width: totalW, height: ROW_H }}
                          >
                            {weeks.map((_, i) => (
                              <div
                                key={i}
                                className="absolute top-0 bottom-0 border-r border-zinc-800/50"
                                style={{ left: i * WEEK_W, width: WEEK_W }}
                              />
                            ))}
                            {monthSections.map((m, i) =>
                              i > 0 ? (
                                <div
                                  key={m.key}
                                  className="absolute top-0 bottom-0 w-px bg-zinc-700 pointer-events-none"
                                  style={{ left: m.left }}
                                />
                              ) : null
                            )}
                            {todayOffset >= 0 && (
                              <div
                                className="absolute top-0 bottom-0 w-[2px] bg-red-400/30 pointer-events-none z-10"
                                style={{ left: todayOffset }}
                              />
                            )}
                            {!isEditing && (
                              <div
                                className="absolute rounded cursor-pointer"
                                style={{
                                  left: barLeft,
                                  width: barWidth,
                                  top: '25%',
                                  height: '50%',
                                  backgroundColor: project.color,
                                  boxShadow: `0 0 8px ${project.color}80, 0 0 16px ${project.color}40`,
                                }}
                                onMouseEnter={(e) =>
                                  setTooltip({
                                    text: `${fmtDate(project.start_date!)} → ${fmtDate(project.end_date!)}`,
                                    x: e.clientX,
                                    y: e.clientY - 36,
                                  })
                                }
                                onMouseMove={(e) =>
                                  setTooltip((prev) =>
                                    prev ? { ...prev, x: e.clientX, y: e.clientY - 36 } : null
                                  )
                                }
                                onMouseLeave={() => setTooltip(null)}
                              />
                            )}
                          </div>
                        </div>

                        {/* Task sub-rows — shown when expanded */}
                        {hasTasks && isExpanded && projectTasks.map((task) => {
                          const taskEditing = editingTaskId === task.id;
                          const hasTaskDates = !!(task.start_date && task.end_date);
                          const taskStartPx = hasTaskDates ? dayPixelOffset(task.start_date!, weeks) : 0;
                          const taskEndPx = hasTaskDates ? dayPixelOffset(task.end_date!, weeks) + WEEK_W / 7 : 0;
                          const taskBarLeft = taskStartPx + 2;
                          const taskBarWidth = hasTaskDates ? Math.max(taskEndPx - taskStartPx - 4, WEEK_W / 7) : 0;

                          return (
                            <div
                              key={task.id}
                              className={`flex border-b border-zinc-800/60 ${taskEditing ? 'bg-zinc-800/20' : ''}`}
                              style={{ height: TASK_ROW_H }}
                            >
                              {/* Task name cell */}
                              <div
                                className={`sticky left-0 z-10 border-r border-zinc-700/60 flex items-center pl-8 pr-3 gap-1.5 flex-shrink-0 ${taskEditing ? 'bg-zinc-800/40' : 'bg-zinc-900'}`}
                                style={{ width: LEFT_W }}
                              >
                                <div className="flex-1 min-w-0">
                                  <div className="text-zinc-400 text-xs truncate">{task.description}</div>
                                </div>
                                {hasTaskDates ? (
                                  <>
                                    <button
                                      onClick={() => openEditTask(task)}
                                      className="text-zinc-600 hover:text-zinc-300 flex-shrink-0 transition-colors p-0.5"
                                      title="Edit task dates"
                                    >
                                      <Pencil size={11} />
                                    </button>
                                    <button
                                      onClick={() => handleRemoveTask(task.id)}
                                      className="text-zinc-600 hover:text-red-400 flex-shrink-0 transition-colors p-0.5"
                                      title="Remove task from timeline"
                                    >
                                      <X size={11} />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => openEditTask(task)}
                                    className="text-zinc-600 hover:text-zinc-300 flex-shrink-0 transition-colors p-0.5"
                                    title="Add task dates"
                                  >
                                    <Plus size={11} />
                                  </button>
                                )}
                              </div>

                              {/* Task bar area */}
                              <div
                                className="relative flex-shrink-0"
                                style={{ width: totalW, height: TASK_ROW_H }}
                              >
                                {weeks.map((_, i) => (
                                  <div
                                    key={i}
                                    className="absolute top-0 bottom-0 border-r border-zinc-800/30"
                                    style={{ left: i * WEEK_W, width: WEEK_W }}
                                  />
                                ))}
                                {monthSections.map((m, i) =>
                                  i > 0 ? (
                                    <div
                                      key={m.key}
                                      className="absolute top-0 bottom-0 w-px bg-zinc-700/50 pointer-events-none"
                                      style={{ left: m.left }}
                                    />
                                  ) : null
                                )}
                                {todayOffset >= 0 && (
                                  <div
                                    className="absolute top-0 bottom-0 w-[2px] bg-red-400/20 pointer-events-none z-10"
                                    style={{ left: todayOffset }}
                                  />
                                )}
                                {hasTaskDates && !taskEditing && (
                                  <div
                                    className="absolute rounded cursor-pointer"
                                    style={{
                                      left: taskBarLeft,
                                      width: taskBarWidth,
                                      top: '20%',
                                      height: '60%',
                                      backgroundColor: project.color + 'AA',
                                      boxShadow: `0 0 6px ${project.color}50`,
                                    }}
                                    onMouseEnter={(e) =>
                                      setTooltip({
                                        text: `${task.description}: ${fmtDate(task.start_date!)} → ${fmtDate(task.end_date!)}`,
                                        x: e.clientX,
                                        y: e.clientY - 36,
                                      })
                                    }
                                    onMouseMove={(e) =>
                                      setTooltip((prev) =>
                                        prev ? { ...prev, x: e.clientX, y: e.clientY - 36 } : null
                                      )
                                    }
                                    onMouseLeave={() => setTooltip(null)}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Edit form — only shown when adding/editing a project or task */}
        {isEditingAny && (
          <div className="flex-shrink-0 border-t border-zinc-800 px-4 py-3" style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}>
            <div className="flex items-center gap-3 flex-wrap">
              {editingTaskId !== null ? (
                <span className="text-sm text-zinc-300 font-medium truncate max-w-[160px]">
                  {editingTask?.description ?? 'Task'}
                </span>
              ) : editingId === 'new' ? (
                <select
                  value={formProjectId}
                  onChange={(e) => setFormProjectId(e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-white text-sm focus:outline-none focus:border-zinc-500"
                >
                  {unscheduled.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.boardName})
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-white font-medium">
                  {allProjects.find((p) => p.id === editingId)?.name}
                </span>
              )}
              <DateInput value={formStart} onChange={setFormStart} />
              <span className="text-zinc-500 text-sm">→</span>
              <DateInput value={formEnd} onChange={setFormEnd} />
              <button
                onClick={handleSave}
                disabled={!canSave}
                className="px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded transition-colors"
              >
                {saving ? 'Saving...' : editingId === 'new' ? 'Add' : 'Update'}
              </button>
              <button
                onClick={cancelForm}
                className="px-3 py-1.5 text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Cancel
              </button>
              {saveError && (
                <span className="text-red-400 text-xs">{saveError}</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="fixed z-[60] bg-zinc-800 border border-zinc-600 rounded px-2.5 py-1 text-xs text-zinc-200 pointer-events-none shadow-lg whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y, transform: 'translateX(-50%)' }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
