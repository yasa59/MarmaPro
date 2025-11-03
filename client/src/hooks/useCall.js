// client/src/hooks/useCall.js
import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" }, // public STUN (works on most networks)
];

export default function useCall(roomId) {
  const { token } = useAuth();
  const pcRef = useRef(null);
  const socketRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(new MediaStream());

  const [localVideoEl, setLocalVideoEl] = useState(null);
  const [remoteVideoEl, setRemoteVideoEl] = useState(null);
  const [inCall, setInCall] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState("");

  // Attach streams to <video> tags when refs change
  useEffect(() => {
    if (localVideoEl && localStreamRef.current) {
      localVideoEl.srcObject = localStreamRef.current;
    }
  }, [localVideoEl]);

  useEffect(() => {
    if (remoteVideoEl) {
      remoteVideoEl.srcObject = remoteStreamRef.current;
    }
  }, [remoteVideoEl]);

  // Init socket + pc
  useEffect(() => {
    const socket = io(import.meta.env.VITE_API_URL || "http://localhost:5000", {
      transports: ["websocket"],
      auth: { token },
    });
    socketRef.current = socket;

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    pcRef.current = pc;

    // Remote tracks
    pc.ontrack = (evt) => {
      evt.streams[0].getTracks().forEach((t) => {
        remoteStreamRef.current.addTrack(t);
      });
    };

    // Local ICE to remote via Socket.IO
    pc.onicecandidate = (evt) => {
      if (evt.candidate) {
        socket.emit("webrtc:signal", { roomId, data: { type: "candidate", candidate: evt.candidate } });
      }
    };

    // Join signaling room
    socket.emit("chat:join", { roomId });

    // Handle incoming signals
    socket.on("webrtc:signal", async ({ from, data }) => {
      try {
        if (!pcRef.current) return;
        const pc = pcRef.current;

        if (data.type === "offer") {
          // got an offer → set remote, make answer
          await pc.setRemoteDescription(new RTCSessionDescription(data));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit("webrtc:signal", { roomId, data: pc.localDescription });
        } else if (data.type === "answer") {
          await pc.setRemoteDescription(new RTCSessionDescription(data));
        } else if (data.type === "candidate") {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } else if (data.type === "hangup") {
          endCall();
        }
      } catch (e) {
        setError(e.message);
      }
    });

    return () => {
      socket.off("webrtc:signal");
      socket.disconnect();
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, token]);

  async function startCall() {
    setError("");
    setConnecting(true);
    try {
      // mic+cam
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;

      if (localVideoEl) localVideoEl.srcObject = stream;

      // add to pc
      const pc = pcRef.current;
      stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      // create offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // send offer
      socketRef.current.emit("webrtc:signal", { roomId, data: offer });
      setInCall(true);
    } catch (e) {
      setError(e.message || "Could not start call");
    } finally {
      setConnecting(false);
    }
  }

  function endCall() {
    // notify the other side
    socketRef.current?.emit("webrtc:signal", { roomId, data: { type: "hangup" } });
    cleanup();
  }

  function cleanup() {
    setInCall(false);
    try {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    } catch {}
    try {
      remoteStreamRef.current?.getTracks().forEach((_t) => {}); // readonly stream; cleared by re-instantiation
      remoteStreamRef.current = new MediaStream();
      if (remoteVideoEl) remoteVideoEl.srcObject = remoteStreamRef.current;
    } catch {}
    try {
      pcRef.current?.getSenders().forEach((s) => pcRef.current.removeTrack(s));
      pcRef.current?.close();
    } catch {}
    pcRef.current = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  }

  function toggleMute() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setMuted(!enabled);
  }

  function toggleCamera() {
    const stream = localStreamRef.current;
    if (!stream) return;
    const enabled = !cameraOff;
    stream.getVideoTracks().forEach((t) => (t.enabled = enabled));
    setCameraOff(!enabled);
  }

  async function shareScreen() {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = display.getVideoTracks()[0];
      const sender = pcRef.current.getSenders().find((s) => s.track?.kind === "video");
      if (sender) sender.replaceTrack(screenTrack);

      screenTrack.onended = () => {
        // revert to camera
        const cam = localStreamRef.current?.getVideoTracks()[0];
        if (cam && sender) sender.replaceTrack(cam);
      };
    } catch (e) {
      setError(e.message);
    }
  }

  return {
    setLocalVideoEl,
    setRemoteVideoEl,
    startCall,
    endCall,
    toggleMute,
    toggleCamera,
    shareScreen,
    inCall,
    connecting,
    muted,
    cameraOff,
    error,
  };
}
