import React, { useState, useEffect } from 'react';
import { supabase, Project } from '../lib/supabase';

interface NotesModalProps {
  project: Project;
  onClose: () => void;
}

const NotesModal: React.FC<NotesModalProps> = ({ project, onClose }) => {
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    setNotes(project.notes || '');
  }, [project.notes]);

  const handleSaveNotes = async () => {
    try {
      const { error } = await supabase
        .from('projects')
        .update({ notes: notes.trim(), updated_at: new Date().toISOString() })
        .eq('id', project.id);

      if (error) throw error;
      onClose();
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-4 sm:p-6 rounded-lg shadow-lg w-full max-w-sm sm:max-w-md">
        <h2 className="text-white text-xl mb-4">Notes for {project.name}</h2>
        <textarea
          className="w-full h-48 p-3 rounded bg-gray-600 text-white placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Add notes about this project..."
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSaveNotes}
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

export default NotesModal;
