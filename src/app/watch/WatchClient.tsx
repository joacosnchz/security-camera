"use client";

import { Room, RoomEvent, Track, type RemoteTrack } from "livekit-client";
import { useEffect, useRef, useState } from "react";
import { getConnection } from "@/lib/connection";

type Status = "connecting" | "connected" | "reconnecting" | "error";

export default function WatchClient() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const roomRef = useRef<Room | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState("");
  const [hasVideo, setHasVideo] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const room = new Room({ adaptiveStream: true });
    roomRef.current = room;

    function attach(track: RemoteTrack) {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        setHasVideo(!track.isMuted);
      } else if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current);
        setHasAudio(!track.isMuted);
        setAudioBlocked(!room.canPlaybackAudio);
      }
    }

    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (participant.identity === "streamer") attach(track);
    });
    room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
      if (participant.identity !== "streamer") return;
      if (track.kind === Track.Kind.Video) {
        if (videoRef.current) track.detach(videoRef.current);
        setHasVideo(false);
      } else if (track.kind === Track.Kind.Audio) {
        if (audioRef.current) track.detach(audioRef.current);
        setHasAudio(false);
      }
    });
    room.on(RoomEvent.TrackMuted, (publication, participant) => {
      if (participant.identity !== "streamer") return;
      if (publication.source === Track.Source.Camera) setHasVideo(false);
      if (publication.source === Track.Source.Microphone) setHasAudio(false);
    });
    room.on(RoomEvent.TrackUnmuted, (publication, participant) => {
      if (participant.identity !== "streamer") return;
      if (publication.source === Track.Source.Camera) setHasVideo(true);
      if (publication.source === Track.Source.Microphone) setHasAudio(true);
    });
    room.on(RoomEvent.ParticipantDisconnected, (participant) => {
      if (participant.identity === "streamer") {
        setHasVideo(false);
        setHasAudio(false);
      }
    });
    room.on(RoomEvent.AudioPlaybackStatusChanged, () => setAudioBlocked(!room.canPlaybackAudio));
    room.on(RoomEvent.Reconnecting, () => setStatus("reconnecting"));
    room.on(RoomEvent.Reconnected, () => setStatus("connected"));
    room.on(RoomEvent.Disconnected, () => {
      if (cancelled) return;
      setStatus("error");
      setHasVideo(false);
      setHasAudio(false);
      setError("The connection ended. Try reconnecting.");
    });

    async function join() {
      try {
        const { serverUrl, token } = await getConnection("viewer");
        if (cancelled) return;
        await room.connect(serverUrl, token);
        if (cancelled) return;
        setStatus("connected");
        const streamer = room.getParticipantByIdentity("streamer");
        streamer?.trackPublications.forEach((publication) => {
          if (publication.track) attach(publication.track as RemoteTrack);
        });
      } catch (cause) {
        if (!cancelled) {
          setStatus("error");
          setError(cause instanceof Error ? cause.message : "Could not connect to stream.");
        }
      }
    }
    void join();

    return () => {
      cancelled = true;
      roomRef.current = null;
      void room.disconnect();
    };
  }, [attempt]);

  async function enableAudio() {
    const room = roomRef.current;
    if (!room) return;
    try {
      await room.startAudio();
      setAudioBlocked(!room.canPlaybackAudio);
    } catch {
      setAudioBlocked(true);
    }
  }

  function retry() {
    setError("");
    setHasVideo(false);
    setHasAudio(false);
    setAudioBlocked(false);
    setStatus("connecting");
    setAttempt((value) => value + 1);
  }

  return (
    <main className="page-shell">
      <div className="page-heading">
        <div><p className="eyebrow">VIEWER</p><h1>Watch the live stream</h1><p className="subtle">Video and audio from your streaming device appear here.</p></div>
        <span className={`status-pill ${hasVideo || hasAudio ? "live" : ""}`}><span className="status-dot" />{status === "error" ? "Offline" : status === "reconnecting" ? "Reconnecting" : hasVideo || hasAudio ? "Live" : "Waiting"}</span>
      </div>
      <div className="media-card">
        <div className="video-frame">
          <video ref={videoRef} autoPlay playsInline muted className="video-element" aria-label="Live camera stream" />
          <audio ref={audioRef} autoPlay />
          {!hasVideo && <div className="video-placeholder"><span className="placeholder-icon">◉</span><span>{status === "connecting" ? "Connecting…" : status === "error" ? "Stream unavailable" : hasAudio ? "Camera is off; audio is live" : "Waiting for the streamer"}</span></div>}
          {(hasVideo || hasAudio) && <span className="live-badge"><span className="status-dot" /> LIVE</span>}
        </div>
        <div className="viewer-bar">
          <p className="subtle">{status === "connected" ? hasVideo || hasAudio ? "Connected to the stream" : "The streamer has not started yet" : status === "reconnecting" ? "Connection interrupted; reconnecting…" : status === "connecting" ? "Connecting to the viewing room…" : "Disconnected"}</p>
          {audioBlocked && <button className="button primary" onClick={enableAudio}>Enable audio</button>}
          {status === "error" && <button className="button secondary" onClick={retry}>Reconnect</button>}
        </div>
      </div>
      {error && <p className="notice error" role="alert">{error}</p>}
      <p className="help-text">This page will begin showing the stream when the phone starts broadcasting. If audio is silent, tap <strong>Enable audio</strong>.</p>
    </main>
  );
}
