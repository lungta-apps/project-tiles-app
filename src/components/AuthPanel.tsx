import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!
);

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
      <div className="flex items-center gap-3">
        <span className="text-sm text-zinc-300">Signed in as {userEmail}</span>
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
    <form onSubmit={signIn} className="flex items-center gap-2">
      <input
        type="email"
        required
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-sm text-white"
      />
      <input
        type="password"
        required
        placeholder="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-sm text-white"
      />
      <button
        type="submit"
        className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-500 text-sm"
        disabled={loading}
      >
        {loading ? "…" : "Sign in"}
      </button>
			<button
  type="button"
  onClick={signUp}
  className="px-3 py-1 rounded bg-green-600 hover:bg-green-500 text-sm"
  disabled={loading}
>
  {loading ? "…" : "Create account"}
</button>

      {error && <span className="text-red-400 text-xs ml-2">{error}</span>}
    </form>
  );
}
