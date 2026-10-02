export type Role = "streamer" | "viewer";

export async function getConnection(role: Role): Promise<{ serverUrl: string; token: string }> {
  const response = await fetch("/api/livekit-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    cache: "no-store",
    body: JSON.stringify({ role }),
  });

  if (response.status === 401) {
    window.location.reload();
    throw new Error("Your session has expired.");
  }

  const body: unknown = await response.json();
  if (!response.ok) {
    const message = typeof body === "object" && body !== null && "error" in body ? body.error : undefined;
    throw new Error(typeof message === "string" ? message : "Could not connect to streaming service.");
  }
  if (typeof body !== "object" || body === null || !("serverUrl" in body) || !("token" in body) ||
      typeof body.serverUrl !== "string" || typeof body.token !== "string") {
    throw new Error("Streaming service returned an invalid response.");
  }
  return { serverUrl: body.serverUrl, token: body.token };
}
