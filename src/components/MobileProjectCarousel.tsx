import { useState, useRef, useEffect, useMemo } from 'react';
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
  onShowNotes: (project: Project) => void;
  onRequestMove: (project: Project) => void;
}

export default function MobileProjectCarousel({
  gridItems,
  currentBoardId,
  onAddProject,
  onDelete,
  onChangeColor,
  onToggleCompleted,
  onShowTasks,
  onShowNotes,
  onRequestMove,
}: MobileProjectCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isLandscape, setIsLandscape] = useState(
    () => typeof window !== 'undefined' && window.innerWidth > window.innerHeight
  );
  const containerRef = useRef<HTMLDivElement>(null);

  const minSwipeDistance = 50;
  const swipeThreshold = 10;

  useEffect(() => {
    const update = () => setIsLandscape(window.innerWidth > window.innerHeight);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const itemsPerPage = isLandscape ? 3 : 1;

  const pages = useMemo(() => {
    const result: { position: number; project: Project | undefined }[][] = [];
    for (let i = 0; i < gridItems.length; i += itemsPerPage) {
      result.push(gridItems.slice(i, i + itemsPerPage));
    }
    return result;
  }, [gridItems, itemsPerPage]);

  const totalPages = pages.length;
  const currentPage = pages[currentIndex] ?? [];

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart) return;
    const currentTouch = e.targetTouches[0].clientX;
    if (Math.abs(currentTouch - touchStart) > swipeThreshold) {
      setIsDragging(true);
      setTouchEnd(currentTouch);
      setDragOffset(currentTouch - touchStart);
    }
  };

  const handleTouchEnd = () => {
    if (!touchStart || !isDragging) {
      setTouchStart(null);
      setTouchEnd(null);
      setIsDragging(false);
      setDragOffset(0);
      return;
    }
    if (touchEnd) {
      const distance = touchStart - touchEnd;
      if (distance > minSwipeDistance && currentIndex < totalPages - 1) {
        setCurrentIndex(currentIndex + 1);
      } else if (distance < -minSwipeDistance && currentIndex > 0) {
        setCurrentIndex(currentIndex - 1);
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
    setIsDragging(false);
    setDragOffset(0);
  };

  const goToPrevious = () => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); };
  const goToNext = () => { if (currentIndex < totalPages - 1) setCurrentIndex(currentIndex + 1); };

  useEffect(() => {
    setCurrentIndex(0);
  }, [currentBoardId]);

  useEffect(() => {
    if (currentIndex >= totalPages) setCurrentIndex(Math.max(0, totalPages - 1));
  }, [totalPages, currentIndex]);

  const tileHeight = isLandscape ? 180 : 280;

  return (
    <div className="flex flex-col items-center w-full">
      <div
        ref={containerRef}
        className="relative w-full"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ minHeight: tileHeight + 8 }}
      >
        <div
          className={isLandscape ? 'flex gap-3 px-4' : 'w-full px-4'}
          style={{
            transform: `translateX(${isDragging ? dragOffset : 0}px)`,
            transition: isDragging ? 'none' : 'transform 300ms ease-out',
          }}
        >
          {currentPage.map(({ position, project }) => (
            <div key={position} className={isLandscape ? 'flex-1' : 'w-full'}>
              <div style={{ height: tileHeight }}>
                {project ? (
                  <ProjectTile
                    project={project}
                    onDelete={onDelete}
                    onChangeColor={onChangeColor}
                    onToggleCompleted={onToggleCompleted}
                    onShowTasks={onShowTasks}
                    onShowNotes={onShowNotes}
                    onRequestMove={onRequestMove}
                    isDragging={false}
                    isDragOver={false}
                  />
                ) : (
                  <button
                    onClick={() => onAddProject(position)}
                    className="w-full h-full bg-zinc-900 rounded-lg flex flex-col items-center justify-center transition-all duration-300 hover:bg-zinc-800 border-2 border-zinc-700 border-dashed focus:outline-none focus:ring-2 focus:ring-blue-500"
                    style={{ minHeight: tileHeight }}
                    aria-label="Add new project"
                  >
                    <Plus size={isLandscape ? 32 : 48} className="text-zinc-600 mb-2" />
                    <span className="text-zinc-500 text-sm">Add Project</span>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={goToPrevious}
          disabled={currentIndex === 0}
          className={`p-2 rounded-full transition-colors ${
            currentIndex === 0
              ? 'text-zinc-600 cursor-not-allowed'
              : 'text-zinc-300 hover:bg-zinc-800 active:bg-zinc-700'
          }`}
          aria-label="Previous"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="flex gap-2">
          {pages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex ? 'bg-white w-4' : 'bg-zinc-600 hover:bg-zinc-500'
              }`}
              aria-label={`Go to page ${index + 1}`}
            />
          ))}
        </div>

        <button
          onClick={goToNext}
          disabled={currentIndex === totalPages - 1}
          className={`p-2 rounded-full transition-colors ${
            currentIndex === totalPages - 1
              ? 'text-zinc-600 cursor-not-allowed'
              : 'text-zinc-300 hover:bg-zinc-800 active:bg-zinc-700'
          }`}
          aria-label="Next"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      <div className="mt-2 text-zinc-500 text-sm">
        {isLandscape
          ? `Page ${currentIndex + 1} of ${totalPages}`
          : `${currentIndex + 1} of ${gridItems.length}`}
      </div>
    </div>
  );
}
