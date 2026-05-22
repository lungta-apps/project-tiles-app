import { useState, useEffect, useMemo, useRef } from 'react';
import { X, Plus, Pencil } from 'lucide-react';
import { supabase, type Board } from '../lib/supabase';

const WEEK_W = 44;
const LEFT_W = 192;
const ROW_H = 52;
const MONTH_H = 32;
const WEEK_H = 28;

interface GanttProject {
  id: string;
  name: string;
  color: string;
  board_id: string;
  boardName: string;
  start_date: string | null;
  end_date: string | null;
}

interface WeekEntry {
  isoWeek: number;
  monday: Date;
  monthKey: string;
  monthLabel: string;
}

interface MonthGroup {
  key: string;
  label: string;
  startIdx: number;
  count: number;
}

interface GanttModalProps {
  isOpen: boolean;
  onClose: () => void;
  boards: Board[];
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

function buildMonthGroups(weeks: WeekEntry[]): MonthGroup[] {
  const groups: MonthGroup[] = [];
  weeks.forEach((w, i) => {
    const last = groups[groups.length - 1];
    if (last && last.key === w.monthKey) {
      last.count++;
    } else {
      groups.push({ key: w.monthKey, label: w.monthLabel, startIdx: i, count: 1 });
    }
  });
  return groups;
}

function weekIndexFor(dateStr: string, weeks: WeekEntry[]): number {
  const target = new Date(dateStr + 'T00:00:00');
  for (let i = weeks.length - 1; i >= 0; i--) {
    if (target >= weeks[i].monday) return i;
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

export default function GanttModal({ isOpen, onClose, boards }: GanttModalProps) {
  const [allProjects, setAllProjects] = useState<GanttProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | 'new' | null>(null);
  const [formProjectId, setFormProjectId] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

  const weeks = useMemo(() => buildWeeks(), []);
  const monthGroups = useMemo(() => buildMonthGroups(weeks), [weeks]);
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

  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setFormProjectId('');
      setFormStart('');
      setFormEnd('');
      setAllProjects([]);
      return;
    }
    if (boards.length === 0) return;

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .in('board_id', boards.map((b) => b.id))
          .or('completed.is.null,completed.eq.false')
          .order('name', { ascending: true });
        if (error) throw error;
        if (!cancelled) {
          setAllProjects(
            (data ?? []).map((p) => ({
              id: p.id,
              name: p.name,
              color: p.color,
              board_id: p.board_id,
              boardName: boards.find((b) => b.id === p.board_id)?.name ?? '',
              start_date: p.start_date ?? null,
              end_date: p.end_date ?? null,
            }))
          );
        }
      } catch (err) {
        console.error('Gantt fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isOpen, boards]);

  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  const openAdd = () => {
    setEditingId('new');
    setFormProjectId(unscheduled[0]?.id ?? '');
    setFormStart('');
    setFormEnd('');
  };

  const openEdit = (p: GanttProject) => {
    setEditingId(p.id);
    setFormStart(p.start_date ?? '');
    setFormEnd(p.end_date ?? '');
  };

  const handleSave = async () => {
    if (!formStart || !formEnd || formEnd < formStart) return;
    setSaving(true);
    setSaveError(null);
    try {
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

  const cancelForm = () => {
    setEditingId(null);
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
    (editingId !== 'new' || !!formProjectId);

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl w-full max-w-7xl flex flex-col"
        style={{ height: 'calc(100dvh - 2rem)', maxHeight: 'calc(100dvh - 2rem)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 flex-shrink-0">
          <h2 className="text-white text-lg font-semibold">Timeline</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0 overflow-hidden">
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
                    {monthGroups.map((m) => (
                      <div
                        key={m.key}
                        className="absolute top-0 bottom-0 flex items-center px-2 overflow-hidden border-r-2 border-zinc-600"
                        style={{ left: m.startIdx * WEEK_W, width: m.count * WEEK_W }}
                      >
                        <span className="text-zinc-300 text-xs font-semibold whitespace-nowrap">
                          {m.label}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Week header — sticky below months */}
                <div
                  className="flex sticky z-20 bg-zinc-900 border-b border-zinc-700"
                  style={{ top: MONTH_H, height: WEEK_H }}
                >
                  <div
                    className="sticky left-0 z-30 bg-zinc-900 border-r border-zinc-700 flex-shrink-0"
                    style={{ width: LEFT_W }}
                  />
                  <div className="relative flex-shrink-0" style={{ width: totalW, height: WEEK_H }}>
                    {weeks.map((w, i) => {
                      const isCurrent = todayOffset >= i * WEEK_W && todayOffset < (i + 1) * WEEK_W;
                      return (
                        <div
                          key={i}
                          className={`absolute top-0 bottom-0 flex items-center justify-center border-r border-zinc-800 ${isCurrent ? 'bg-zinc-800' : ''}`}
                          style={{ left: i * WEEK_W, width: WEEK_W }}
                        >
                          <span
                            className={`text-[10px] ${isCurrent ? 'text-zinc-200 font-bold' : 'text-zinc-600'}`}
                          >
                            {w.isoWeek}
                          </span>
                        </div>
                      );
                    })}
                    {todayOffset >= 0 && (
                      <div
                        className="absolute top-0 bottom-0 w-[2px] bg-red-400/70 pointer-events-none z-10"
                        style={{ left: todayOffset }}
                      />
                    )}
                  </div>
                </div>

                {/* Project rows */}
                {scheduled.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-zinc-600 text-sm">
                    No projects on timeline yet — add one below.
                  </div>
                ) : (
                  scheduled.map((project) => {
                    const startIdx = weekIndexFor(project.start_date!, weeks);
                    const endIdx = weekIndexFor(project.end_date!, weeks);
                    const barLeft = startIdx * WEEK_W + 2;
                    const barWidth = Math.max((endIdx - startIdx + 1) * WEEK_W - 4, WEEK_W - 4);
                    const isEditing = editingId === project.id;

                    return (
                      <div
                        key={project.id}
                        className={`flex border-b border-zinc-800 ${isEditing ? 'bg-zinc-800/30' : ''}`}
                        style={{ height: ROW_H }}
                      >
                        {/* Name cell — sticky left */}
                        <div
                          className={`sticky left-0 z-10 border-r border-zinc-700 flex items-center px-3 gap-2 flex-shrink-0 ${isEditing ? 'bg-zinc-800/60' : 'bg-zinc-900'}`}
                          style={{ width: LEFT_W }}
                        >
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
                          {/* Week grid lines */}
                          {weeks.map((_, i) => (
                            <div
                              key={i}
                              className="absolute top-0 bottom-0 border-r border-zinc-800/50"
                              style={{ left: i * WEEK_W, width: WEEK_W }}
                            />
                          ))}
                          {/* Month separator lines */}
                          {monthGroups.map((m, i) =>
                            i > 0 ? (
                              <div
                                key={m.key}
                                className="absolute top-0 bottom-0 w-px bg-zinc-700 pointer-events-none"
                                style={{ left: m.startIdx * WEEK_W }}
                              />
                            ) : null
                          )}
                          {/* Today line */}
                          {todayOffset >= 0 && (
                            <div
                              className="absolute top-0 bottom-0 w-[2px] bg-red-400/30 pointer-events-none z-10"
                              style={{ left: todayOffset }}
                            />
                          )}
                          {/* Bar */}
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
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Add / Edit form */}
        <div className="flex-shrink-0 border-t border-zinc-800 px-4 py-3">
          {editingId === null ? (
            <button
              onClick={openAdd}
              disabled={unscheduled.length === 0}
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus size={15} />
              Add Project to Timeline
            </button>
          ) : (
            <div className="flex items-center gap-3 flex-wrap">
              {editingId === 'new' ? (
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
          )}
        </div>
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
