import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import ProjectTile from './ProjectTile';
import AddProjectModal from './AddProjectModal';
import { supabase, type Project, type Board } from '../lib/supabase';
import AuthPanel from "@/components/AuthPanel";
import SignInModal from "@/components/SignInModal";


async function tempSignIn() {
  console.log('Temp Sign In starting');
  const TEST_EMAIL = 'test1@example.com';        // <-- your test user’s email
  const TEST_PASSWORD = 'TESTpswd';   // <-- password you set

  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error) {
    console.error('Sign in failed:', error);
    return;
  }
  console.log('Signed in as', data.user?.id);
  window.location.reload();
}

interface ProjectGridProps {
  boards: Board[];
  currentBoardId: string | null;
  setBoards: (boards: Board[]) => void;
  setCurrentBoardId: (id: string | null) => void;
}


export default function ProjectGrid({
  boards,
  currentBoardId,
  setBoards,
  setCurrentBoardId,
}: ProjectGridProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
	const [user, setUser] = useState<any>(null);
	const [showSignInModal, setShowSignInModal] = useState(false);
	const [pendingPosition, setPendingPosition] = useState<number | null>(null);

useEffect(() => {
  supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
  const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
    setUser(session?.user ?? null)
  );
  return () => sub.subscription.unsubscribe();
}, []);

  useEffect(() => {
    if (user) {
      loadBoards();
    } else {
      setBoards([]);
      setCurrentBoardId(null);
    }
  }, [user]);

    useEffect(() => {
    if (user && currentBoardId) {
      loadProjects(currentBoardId);
    } else {
      setProjects([]);
      setLoading(false);
    }
  }, [user, currentBoardId]);


  const loadBoards = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .order('position', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setBoards(data);
        if (!currentBoardId) {
          setCurrentBoardId(data[0].id);
        }
            } else {
        // No boards yet for this user – create a default "Main" board
        const { data: created, error: insertError } = await supabase
          .from('boards')
          .insert([{
            user_id: user.id,
            name: 'Main',
            position: 0,
          }])
          .select()
          .single();

        if (insertError) throw insertError;
        setBoards([created]);
        setCurrentBoardId(created.id);
      }

    } catch (err) {
      console.error('Error loading boards:', err);
    }
  };


    const loadProjects = async (boardId: string | null) => {
    if (!boardId) {
      setProjects([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    } finally {
      setLoading(false);
    }
  };


  const handleAddProject = async (name: string, color: string) => {
  try {
    const targetPosition = pendingPosition ?? projects.length;
    if (targetPosition >= 9) {
      alert('Maximum of 9 projects reached');
      return;
    }

        if (!currentBoardId) {
      alert('No board selected');
      return;
    }

    const { error } = await supabase
      .from('projects')
      .insert([{
        name,
        color,
        position: targetPosition,
        board_id: currentBoardId,
      }]);


    if (error) throw error;

    await loadProjects(currentBoardId);
    setIsModalOpen(false);
    setPendingPosition(null);   // reset
  } catch (error) {
    console.error('Error adding project:', error);
  }
};

	const handleChangeColor = (projectId: string) => {
  const project = projects.find((p) => p.id === projectId);
  if (!project) return;

  setEditingProject(project);
  setPendingPosition(null);   // editing an existing project, not adding to a slot
  setIsModalOpen(true);
};


  const handleUpdateProject = async (name: string, color: string) => {
  if (!editingProject) return;
  try {
    const { error } = await supabase
      .from('projects')
      .update({
        name,
        color,
        updated_at: new Date().toISOString(),
      })
      .eq('id', editingProject.id);

    if (error) throw error;

    await loadProjects(currentBoardId);
    setIsModalOpen(false);
    setEditingProject(null);
  } catch (err) {
    console.error('Error updating project:', err);
  }
};

  const handleDeleteProject = async (projectId: string) => {
  console.log('PARENT handleDeleteProject called', projectId);
  try {
    const { data, error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId)
      .select('id'); // return deleted rows

    if (error) throw error;
    console.log('Delete returned rows:', data); // <- watch this

    window.location.reload(); // keep for now
  } catch (err) {
    console.error('Delete failed:', err);
  }
};

  const handleRenameBoard = async (boardId: string, currentName: string) => {
    if (!user) return;

    const newName = prompt("Rename board:", currentName);
    if (!newName || newName.trim() === currentName.trim()) return;

    try {
      const { data, error } = await supabase
        .from('boards')
        .update({
          name: newName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', boardId)
        .select()
        .single();

      if (error) {
        console.error("Error renaming board:", error);
        return;
      }

      // Update local state to match DB
      setBoards(
        boards.map((b) =>
          b.id === boardId ? { ...b, name: data.name } : b
        )
      );
    } catch (err) {
      console.error("Unexpected error renaming board:", err);
    }
  };

    const handleDeleteBoard = async (boardId: string) => {
    if (!user) return;

    const board = boards.find((b) => b.id === boardId);
    if (!board) return;

    if (boards.length <= 1) {
      alert("You need at least one board. You can't delete the last one.");
      return;
    }

    const confirmed = confirm(
      `Delete board "${board.name}"? This will also delete its projects.`
    );
    if (!confirmed) return;

    try {
      // Delete projects on this board (in case DB doesn't cascade)
      const { error: projError } = await supabase
        .from("projects")
        .delete()
        .eq("board_id", boardId);

      if (projError) throw projError;

      // Delete the board itself
      const { error: boardError } = await supabase
        .from("boards")
        .delete()
        .eq("id", boardId);

      if (boardError) throw boardError;

      const remainingBoards = boards.filter((b) => b.id !== boardId);
      setBoards(remainingBoards);

      // If we just deleted the active board, switch to another one
      if (currentBoardId === boardId) {
        if (remainingBoards.length > 0) {
          const nextBoardId = remainingBoards[0].id;
          setCurrentBoardId(nextBoardId);
          await loadProjects(nextBoardId);
        } else {
          setCurrentBoardId(null);
          setProjects([]);
        }
      }
    } catch (err) {
      console.error("Error deleting board:", err);
    }
  };

  const gridItems = Array.from({ length: 9 }, (_, index) => {
    const project = projects.find((p) => p.position === index);
    return { position: index, project };
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-8">
      <div className="max-w-7xl mx-auto">
		<div className="mb-6">
  <AuthPanel />
</div>
			
    {/* Board tabs */}
    <div className="mb-4 flex gap-2">
      {boards.map((board) => (
        <button
          key={board.id}
          onClick={() => setCurrentBoardId(board.id)}
          onDoubleClick={() => handleRenameBoard(board.id, board.name)}
          onMouseDown={(e) => {
            // Start timer for long-press
            const timer = setTimeout(() => {
              handleDeleteBoard(board.id); // will confirm()
            }, 700); // duration of long press
            (e.target as HTMLElement).dataset.longPressTimer = String(timer);
          }}
          onMouseUp={(e) => {
            // Cancel long-press if mouse is released early
            const timer = (e.target as HTMLElement).dataset.longPressTimer;
            if (timer) clearTimeout(Number(timer));
          }}
          onMouseLeave={(e) => {
            // Cancel if mouse leaves the button
            const timer = (e.target as HTMLElement).dataset.longPressTimer;
            if (timer) clearTimeout(Number(timer));
          }}

          className={[
            "px-3 py-1 rounded-full text-sm border",
            currentBoardId === board.id
              ? "bg-zinc-900 text-white border-4 border-[#00C7BE]"
              : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:bg-zinc-800"
          ].join(" ")}
        >
          {board.name}
        </button>
      ))}
      <button
    onClick={async () => {
      if (!user) return;

      const newName = prompt("Board name:");
      if (!newName) return;

      const { data, error } = await supabase
        .from('boards')
        .insert([{
          user_id: user.id,
          name: newName,
          position: boards.length,
        }])
        .select()
        .single();

      if (error) {
        console.error("Error creating board:", error);
        return;
      }

      // Update state
      setBoards([...boards, data]);
      setCurrentBoardId(data.id);
    }}
    className="px-3 py-1 rounded-full text-sm bg-zinc-800 text-zinc-300 border border-zinc-700 hover:bg-zinc-700"
  >
    +
  </button>

      {boards.length === 0 && (
        <span className="text-zinc-500 text-sm">
          No boards yet
        </span>
      )}
    </div>

    <div className="grid grid-cols-3 gap-6 aspect-square" role="grid" aria-label="Project grid">
        {gridItems.map(({ position, project }) => (
          <div
            key={position}
            className="border border-zinc-800 rounded-lg p-4"
            style={{ minHeight: '200px' }}
            role="gridcell"
          >
            {project ? (
  <ProjectTile
    project={project}
    onDelete={handleDeleteProject}
    onChangeColor={handleChangeColor}
  />
) : (
  <button
    onClick={() => {
      if (!user) {
        setShowSignInModal(true);
        return;
      }
      setEditingProject(null);
			setPendingPosition(position);
      setIsModalOpen(true);
    }}
    className="w-full h-full bg-zinc-900 rounded-lg flex flex-col items-center justify-center transition-all duration-300 hover:bg-zinc-800 hover:border-zinc-600 border-2 border-zinc-700 border-dashed focus:outline-none focus:ring-2 focus:ring-blue-500"
    aria-label="Add new project"
  >
    <Plus size={48} className="text-zinc-600 mb-2" />
    <span className="text-zinc-500 text-sm">Add Project</span>
  </button>
)}
          </div>
        ))}
      </div>
    </div>

      <AddProjectModal
  key={editingProject?.id ?? 'new'}
  isOpen={isModalOpen}
  onClose={() => {
    setIsModalOpen(false);
    setEditingProject(null);
		setPendingPosition(null);
  }}
  onAdd={editingProject ? handleUpdateProject : handleAddProject}
  initialColor={editingProject?.color}
  initialName={editingProject?.name}
  title={editingProject ? 'Edit Project' : 'Add New Project'}
/>
			<SignInModal isOpen={showSignInModal} onClose={() => setShowSignInModal(false)} />

    </div>
  );
}
