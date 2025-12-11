import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthPanel() {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserEmail(data.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setUserEmail(session?.user?.email ?? null)
    );
    return () => sub.subscription.unsubscribe();
  }, []);

 async function signUp(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setError(null);

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    setError("Enter a valid email address.");
    setLoading(false);
    return;
  }

	console.log("Signing up with:", normalizedEmail);


  const { error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password,
  });

  if (error) setError(error.message);
  setLoading(false);
}

async function signIn(e: React.FormEvent) {
  e.preventDefault();
  setLoading(true);
  setError(null);

  const normalizedEmail = email.trim().toLowerCase();

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (error) setError(error.message);
  setLoading(false);
}

  async function signOut() {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signOut();
    if (error) setError(error.message);
    setLoading(false);
  }

  if (userEmail) {
    return (
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3">
        <span className="text-sm text-zinc-300 truncate max-w-[200px] sm:max-w-none">Signed in as {userEmail}</span>
        <button
          onClick={signOut}
          className="px-3 py-1 rounded border border-blue-500 text-white hover:bg-blue-600 text-sm"
          disabled={loading}
        >
          {loading ? "…" : "Sign out"}
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={signIn} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          required
          placeholder="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-2 py-2 sm:py-1 rounded bg-zinc-900 border border-zinc-700 text-sm text-white w-full sm:w-auto"
        />
        <input
          type="password"
          required
          placeholder="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-2 py-2 sm:py-1 rounded bg-zinc-900 border border-zinc-700 text-sm text-white w-full sm:w-auto"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          className="flex-1 sm:flex-none px-3 py-2 sm:py-1 rounded bg-blue-600 hover:bg-blue-500 text-sm"
          disabled={loading}
        >
          {loading ? "…" : "Sign in"}
        </button>
        <button
          type="button"
          onClick={signUp}
          className="flex-1 sm:flex-none px-3 py-2 sm:py-1 rounded bg-green-600 hover:bg-green-500 text-sm whitespace-nowrap"
          disabled={loading}
        >
          {loading ? "…" : "Create account"}
        </button>
      </div>
      {error && <span className="text-red-400 text-xs sm:ml-2">{error}</span>}
    </form>
  );
}
