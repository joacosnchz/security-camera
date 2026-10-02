import { redirect } from "next/navigation";
import { isAuthenticated, safeNextPath } from "@/lib/auth";

export default async function LoginPage({ searchParams }: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  if (await isAuthenticated()) redirect(next);

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="eyebrow"><span className="brand-mark" aria-hidden="true" /> Private Stream</div>
        <h1>Welcome back</h1>
        <p className="subtle">Sign in to stream from your phone or watch from another device.</p>
        <form action="/api/login" method="post" className="login-form">
          <input type="hidden" name="next" value={next} />
          <label htmlFor="username">Username</label>
          <input id="username" name="username" type="text" autoComplete="username" required autoFocus />
          <label htmlFor="password">Password</label>
          <input id="password" name="password" type="password" autoComplete="current-password" required />
          {params.error === "1" && <p className="form-error" role="alert">Incorrect username or password.</p>}
          <button className="button primary full" type="submit">Sign in</button>
        </form>
      </div>
    </main>
  );
}

