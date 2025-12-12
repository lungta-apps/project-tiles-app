import { useState, useRef, useEffect } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import ProjectTile from './ProjectTile';
import { Project } from '../lib/supabase';

interface MobileProjectCarouselProps {
  gridItems: { position: number; project: Project | undefined }[];
  currentBoardId: string | null;
  onAddProject: (position: number) => void;
  onDelete: (id: string) => void;
  onChangeColor: (id: string) => void;
  onToggleCompleted: (id: string) => void;
  onShowTasks: (project: Project) => void;
}

export default function MobileProjectCarousel({
  gridItems,
  currentBoardId,
  onAddProject,
  onDelete,
  onChangeColor,
  onToggleCompleted,
  onShowTasks,
}: MobileProjectCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Minimum swipe distance to trigger navigation (in pixels)
  const minSwipeDistance = 50;

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentTouch = e.targetTouches[0].clientX;
    setTouchEnd(currentTouch);
    setDragOffset(currentTouch - touchStart);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      setDragOffset(0);
      return;
    }

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe && currentIndex < gridItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else if (isRightSwipe && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }

    setTouchStart(null);
    setTouchEnd(null);
    setIsDragging(false);
    setDragOffset(0);
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentIndex < gridItems.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  // Reset to first card when board changes
  useEffect(() => {
    setCurrentIndex(0);
  }, [currentBoardId]);

  // Adjust index if it's out of bounds after grid items change
  useEffect(() => {
    if (currentIndex >= gridItems.length) {
      setCurrentIndex(Math.max(0, gridItems.length - 1));
    }
  }, [gridItems.length, currentIndex]);

  return (
    <div className="flex flex-col items-center w-full">
      {/* Card container with swipe support */}
      <div
        ref={containerRef}
        className="relative w-full overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(calc(-${currentIndex * 100}% + ${isDragging ? dragOffset : 0}px))`,
            transitionDuration: isDragging ? '0ms' : '300ms',
          }}
        >
          {gridItems.map(({ position, project }) => (
            <div
              key={position}
              className="w-full flex-shrink-0 px-4"
              style={{ minHeight: '320px' }}
            >
              <div className="h-full">
                {project ? (
                  <ProjectTile
                    project={project}
                    onDelete={onDelete}
                    onChangeColor={onChangeColor}
                    onToggleCompleted={onToggleCompleted}
                    onShowTasks={onShowTasks}
                    isDragging={false}
                    isDragOver={false}
                    onDragStart={() => {}}
                    onDragEnd={() => {}}
                  />
                ) : (
                  <button
                    onClick={() => onAddProject(position)}
                    className="w-full h-full min-h-[280px] bg-zinc-900 rounded-lg flex flex-col items-center justify-center transition-all duration-300 hover:bg-zinc-800 border-2 border-zinc-700 border-dashed focus:outline-none focus:ring-2 focus:ring-blue-500"
                    aria-label="Add new project"
                  >
                    <Plus size={48} className="text-zinc-600 mb-2" />
                    <span className="text-zinc-500 text-sm">Add Project</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation controls */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className={`p-2 rounded-full transition-colors ${
            currentIndex === 0
              ? 'text-zinc-600 cursor-not-allowed'
              : 'text-zinc-300 hover:bg-zinc-800 active:bg-zinc-700'
          }`}
          aria-label="Previous project"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Dot indicators */}
        <div className="flex gap-2">
          {gridItems.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex
                  ? 'bg-white w-4'
                  : 'bg-zinc-600 hover:bg-zinc-500'
              }`}
              aria-label={`Go to project ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={goToNext}
          disabled={currentIndex === gridItems.length - 1}
          className={`p-2 rounded-full transition-colors ${
            currentIndex === gridItems.length - 1
              ? 'text-zinc-600 cursor-not-allowed'
              : 'text-zinc-300 hover:bg-zinc-800 active:bg-zinc-700'
          }`}
          aria-label="Next project"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Position indicator text */}
      <div className="mt-2 text-zinc-500 text-sm">
        {currentIndex + 1} of {gridItems.length}
      </div>
    </div>
  );
}
