import { useState } from 'react';
import ProjectGrid from './components/ProjectGrid';
import type { Board } from './lib/supabase';

function App() {
  const [boards, setBoards] = useState<Board[]>([]);
  const [currentBoardId, setCurrentBoardId] = useState<string | null>(null);

  return (
    <ProjectGrid
      boards={boards}
      currentBoardId={currentBoardId}
      setBoards={setBoards}
      setCurrentBoardId={setCurrentBoardId}
    />
  );
}

export default App;
