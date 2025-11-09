import React from "react";

export default function SignInModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="signin-modal-title"
    >
      <div
        className="bg-zinc-900 rounded-lg p-8 max-w-md w-full border border-zinc-700 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="signin-modal-title" className="text-2xl font-bold text-white mb-4">
          Please sign in
        </h2>
        <p className="text-zinc-300 mb-8">
          You need to be signed in to add a project.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-6 py-3 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          >
            Close
          </button>
          <a
            href="#auth"
            onClick={(e) => {
              e.preventDefault();
              // Optional: scroll to top where AuthPanel lives
              window.scrollTo({ top: 0, behavior: "smooth" });
              onClose();
            }}
            className="flex-1 px-6 py-3 text-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Go to Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
