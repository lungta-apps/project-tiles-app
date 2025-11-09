import { useState, useEffect, useRef } from 'react';
import { COLORS } from "@/constants/colors";


interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, color: string) => void;
  initialColor?: string;
  initialName?: string;
  title?: string;
}

export default function AddProjectModal({
  isOpen,
  onClose,
  onAdd,
  initialColor = '#3B82F6',
  initialName = '',
  title = 'Add New Project',
}: AddProjectModalProps) {
  const [projectName, setProjectName] = useState(initialName);
  const [selectedColor, setSelectedColor] = useState(initialColor);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setProjectName(initialName);
      setSelectedColor(initialColor);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialColor, initialName]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (projectName.trim()) {
      onAdd(projectName.trim(), selectedColor);
      setProjectName('');
      setSelectedColor('#3B82F6');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        className="bg-zinc-900 rounded-lg p-8 max-w-md w-full border border-zinc-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="modal-title" className="text-2xl font-bold text-white mb-6">
          {title}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label htmlFor="project-name" className="block text-sm font-medium text-zinc-300 mb-2">
              Project Name
            </label>
            <input
              ref={inputRef}
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter project name"
              maxLength={50}
              aria-required="true"
            />
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              Choose Color
            </label>
            <div className="grid grid-cols-4 gap-3 max-h-48 overflow-y-auto pr-2" role="radiogroup" aria-label="Color selection">
              {COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`w-full aspect-square rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white ${
                    selectedColor === color ? 'ring-2 ring-white scale-110' : 'hover:scale-105'
                  }`}
                  style={{
                    backgroundColor: color,
                    boxShadow: selectedColor === color ? `0 0 20px ${color}80` : 'none',
                  }}
                  role="radio"
                  aria-checked={selectedColor === color}
                  aria-label={`Select color ${color}`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!projectName.trim()}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {title === 'Add New Project' ? 'Add Project' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
