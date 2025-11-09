import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import ProjectTile from './ProjectTile';
import AddProjectModal from './AddProjectModal';
import { supabase } from '../lib/supabase';
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


export default function ProjectGrid() {
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
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
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

    const { error } = await supabase
      .from('projects')
      .insert([{ name, color, position: targetPosition }]);

    if (error) throw error;

    await loadProjects();
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

    await loadProjects();
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
