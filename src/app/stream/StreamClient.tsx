"use client";

import { LocalVideoTrack, Room, RoomEvent, Track } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { getConnection } from "@/lib/connection";

type Status = "idle" | "connecting" | "live" | "reconnecting" | "error";
type Facing = "environment" | "user";

function messageFor(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === "NotAllowedError" || /permission|denied/i.test(error.message)) {
      return "Camera or microphone access was denied. Allow both permissions in your browser settings and try again.";
    }
    if (error.name === "NotFoundError") return "No camera or microphone was found on this device.";
    return error.message;
  }
  return "The stream could not start. Please try again.";
}

export default function StreamClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const mountedRef = useRef(false);
  const streamingRef = useRef(false);
  const startingRef = useRef(false);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [cameraOn, setCameraOn] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [facing, setFacing] = useState<Facing>("environment");
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [busy, setBusy] = useState(false);

  async function releaseWakeLock() {
    const lock = wakeLockRef.current;
    wakeLockRef.current = null;
    setWakeLockActive(false);
    if (lock) await lock.release().catch(() => undefined);
  }

  async function acquireWakeLock() {
    if (!streamingRef.current || wakeLockRef.current || !navigator.wakeLock || document.visibilityState !== "visible") return;
    try {
      const lock = await navigator.wakeLock.request("screen");
      if (!streamingRef.current) {
        await lock.release();
        return;
      }
      wakeLockRef.current = lock;
      setWakeLockActive(true);
      lock.addEventListener("release", () => {
        if (wakeLockRef.current === lock) wakeLockRef.current = null;
        if (mountedRef.current) setWakeLockActive(false);
      });
    } catch {
      if (mountedRef.current) setWakeLockActive(false);
    }
  }

  function attachPreview(room: Room) {
    const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (track && videoRef.current) track.attach(videoRef.current);
  }

  function stop() {
    streamingRef.current = false;
    const room = roomRef.current;
    roomRef.current = null;
    const track = room?.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (track && videoRef.current) track.detach(videoRef.current);
    void room?.disconnect();
    void releaseWakeLock();
    setCameraOn(false);
    setMicOn(false);
    setStatus("idle");
    setError("");
  }

  useEffect(() => {
    mountedRef.current = true;
    const onVisible = () => {
      if (document.visibilityState === "visible") void acquireWakeLock();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      mountedRef.current = false;
      streamingRef.current = false;
      document.removeEventListener("visibilitychange", onVisible);
      void roomRef.current?.disconnect();
      roomRef.current = null;
      void wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, []);

  async function start() {
    if (startingRef.current || roomRef.current) return;
    startingRef.current = true;
    setStatus("connecting");
    setError("");
    try {
      const { serverUrl, token } = await getConnection("streamer");
      if (!mountedRef.current) return;
      const room = new Room({ adaptiveStream: true, dynacast: true });
      roomRef.current = room;
      room.on(RoomEvent.Reconnecting, () => {
        if (roomRef.current === room) setStatus("reconnecting");
      });
      room.on(RoomEvent.Reconnected, () => {
        if (roomRef.current === room) setStatus("live");
      });
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current !== room) return;
        roomRef.current = null;
        streamingRef.current = false;
        void releaseWakeLock();
        setCameraOn(false);
        setMicOn(false);
        setStatus("error");
        setError("The stream disconnected. Tap Start stream to reconnect.");
      });
      await room.connect(serverUrl, token);
      if (!mountedRef.current) {
        await room.disconnect();
        return;
      }
      await room.localParticipant.setCameraEnabled(true, { facingMode: "environment" });
      await room.localParticipant.setMicrophoneEnabled(true);
      if (!mountedRef.current) {
        await room.disconnect();
        return;
      }
      attachPreview(room);
      setCameraOn(true);
      setMicOn(true);
      setFacing("environment");
      streamingRef.current = true;
      setStatus("live");
      void acquireWakeLock();
    } catch (cause) {
      const room = roomRef.current;
      roomRef.current = null;
      void room?.disconnect();
      if (mountedRef.current) {
        setStatus("error");
        setError(messageFor(cause));
      }
    } finally {
      startingRef.current = false;
    }
  }

  async function toggleCamera() {
    const room = roomRef.current;
    if (!room || busy) return;
    setBusy(true);
    try {
      await room.localParticipant.setCameraEnabled(!cameraOn, { facingMode: facing });
      if (!cameraOn) attachPreview(room);
      setCameraOn(!cameraOn);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  async function toggleMic() {
    const room = roomRef.current;
    if (!room || busy) return;
    setBusy(true);
    try {
      await room.localParticipant.setMicrophoneEnabled(!micOn);
      setMicOn(!micOn);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  async function switchCamera() {
    const room = roomRef.current;
    if (!room || busy || !cameraOn) return;
    const track = room.localParticipant.getTrackPublication(Track.Source.Camera)?.track;
    if (!(track instanceof LocalVideoTrack)) return;
    const next: Facing = facing === "environment" ? "user" : "environment";
    setBusy(true);
    try {
      await track.restartTrack({ facingMode: next });
      setFacing(next);
      attachPreview(room);
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }

  const active = status === "live" || status === "reconnecting";
  return (
    <main className="page-shell">
      <div className="page-heading">
        <div><p className="eyebrow">BROADCAST</p><h1>Stream from this device</h1><p className="subtle">Keep this page open on your phone while you stream.</p></div>
        <span className={`status-pill ${active ? "live" : ""}`}><span className="status-dot" />{status === "live" ? "Live" : status === "reconnecting" ? "Reconnecting" : "Offline"}</span>
      </div>
      <div className="media-card">
        <div className="video-frame">
          <video ref={videoRef} autoPlay playsInline muted className={`video-element ${facing === "user" ? "mirror-local" : ""}`} aria-label="Your camera preview" />
          {!cameraOn && <div className="video-placeholder"><span className="placeholder-icon">◉</span><span>{status === "connecting" ? "Connecting to stream…" : "Camera preview will appear here"}</span></div>}
          {active && <span className="live-badge"><span className="status-dot" /> LIVE</span>}
        </div>
        <div className="media-controls">
          {active ? <>
            <button className="button secondary" onClick={toggleCamera} disabled={busy}>{cameraOn ? "Turn camera off" : "Turn camera on"}</button>
            <button className="button secondary" onClick={toggleMic} disabled={busy}>{micOn ? "Mute mic" : "Unmute mic"}</button>
            <button className="button secondary" onClick={switchCamera} disabled={busy || !cameraOn}>Flip camera</button>
            <button className="button danger" onClick={stop}>Stop stream</button>
          </> : <button className="button primary" onClick={start} disabled={status === "connecting"}>{status === "connecting" ? "Starting…" : "Start stream"}</button>}
        </div>
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      {active && !wakeLockActive && <p className="notice">Keep your phone awake and this page visible. Your browser did not grant a screen wake lock.</p>}
      <p className="help-text">Camera and microphone access requires HTTPS and your browser’s permission. Open <strong>Watch</strong> on another device to view the stream.</p>
    </main>
  );
}
