import Link from "next/link";

export function AppHeader({ current }: { current: "stream" | "watch" }) {
  return (
    <header className="app-header">
      <Link className="brand" href="/watch" aria-label="Private Stream home">
        <span className="brand-mark" aria-hidden="true" />
        Private Stream
      </Link>
      <nav className="nav" aria-label="Main navigation">
        <Link href="/stream" aria-current={current === "stream" ? "page" : undefined}>Stream</Link>
        <Link href="/watch" aria-current={current === "watch" ? "page" : undefined}>Watch</Link>
      </nav>
      <form action="/api/logout" method="post"><button className="text-button" type="submit">Log out</button></form>
    </header>
  );
}

