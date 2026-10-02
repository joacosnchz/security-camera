import { AccessToken, TrackSource } from "livekit-server-sdk";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const role = typeof body === "object" && body !== null && "role" in body ? body.role : undefined;
  if (role !== "streamer" && role !== "viewer") {
    return NextResponse.json({ error: "Invalid role." }, { status: 400 });
  }

  const serverUrl = process.env.LIVEKIT_URL;
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  if (!serverUrl || !apiKey || !apiSecret) {
    console.error("LiveKit environment variables are missing");
    return NextResponse.json({ error: "Streaming service is not configured." }, { status: 503 });
  }

  const token = new AccessToken(apiKey, apiSecret, { identity: role, ttl: "5m" });
  token.addGrant({
    roomJoin: true,
    room: "private-camera-stream",
    canPublish: role === "streamer",
    canPublishSources: role === "streamer" ? [TrackSource.CAMERA, TrackSource.MICROPHONE] : [],
    canSubscribe: role === "viewer",
    canPublishData: false,
  });

  return NextResponse.json(
    { serverUrl, token: await token.toJwt() },
    { headers: { "Cache-Control": "no-store" } },
  );
}
