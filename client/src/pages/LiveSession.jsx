import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { io } from "socket.io-client";
import { useAuth } from "../context/AuthContext";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000";
const STUN = [{ urls: "stun:stun.l.google.com:19302" }];

export default function LiveSession() {
  const { roomId } = useParams();
  const { token } = useAuth(); // from our improved AuthContext
  const [status, setStatus] = useState("Idle");
  const [chat, setChat]     = useState([]);
  const [msg, setMsg]       = useState("");

  const socketRef = useRef(null);
  const pcRef     = useRef(null);
  const localRef  = useRef(null);
  const remoteRef = useRef(null);

  // connect socket
  useEffect(() => {
    const s = io(API_BASE, {
      transports: ["websocket"],
      withCredentials: true,
      auth: { token },
    });
    socketRef.current = s;

    s.on("connect", () => {
      s.emit("chat:join", { roomId });
      setStatus("Connected");
    });

    // receive signaling
    s.on("webrtc:signal", async ({ from, data }) => {
      if (!pcRef.current) return;
      if (data.kind === "chat") {
        setChat((c) => [...c, { from, text: data.text, ts: Date.now() }]);
        return;
      }
      if (data.type === "offer") {
        await pcRef.current.setRemoteDescription(data);
        const ans = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(ans);
        s.emit("webrtc:signal", { roomId, data: ans });
      } else if (data.type === "answer") {
        await pcRef.current.setRemoteDescription(data);
      } else if (data.candidate) {
        try { await pcRef.current.addIceCandidate(data); } catch {}
      }
    });

    return () => { s.close(); };
  }, [roomId, token]);

  // init PeerConnection
  const startCall = async () => {
    setStatus("Starting…");
    const pc = new RTCPeerConnection({ iceServers: STUN });
    pcRef.current = pc;

    pc.onicecandidate = (e) => {
      if (e.candidate) {
        socketRef.current?.emit("webrtc:signal", { roomId, data: e.candidate });
      }
    };
    pc.ontrack = (ev) => {
      if (remoteRef.current) {
        remoteRef.current.srcObject = ev.streams[0];
      }
    };

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    if (localRef.current) localRef.current.srcObject = stream;
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current?.emit("webrtc:signal", { roomId, data: offer });
    setStatus("Calling…");
  };

  const hangup = () => {
    pcRef.current?.getSenders?.().forEach((s) => s.track?.stop?.());
    pcRef.current?.close?.();
    pcRef.current = null;
    if (localRef.current?.srcObject) {
      localRef.current.srcObject.getTracks().forEach((t) => t.stop());
      localRef.current.srcObject = null;
    }
    if (remoteRef.current?.srcObject) {
      remoteRef.current.srcObject.getTracks().forEach((t) => t.stop());
      remoteRef.current.srcObject = null;
    }
    setStatus("Idle");
  };

  const sendChat = () => {
    const text = msg.trim();
    if (!text) return;
    socketRef.current?.emit("webrtc:signal", { roomId, data: { kind: "chat", text } });
    setChat((c) => [...c, { from: "me", text, ts: Date.now() }]);
    setMsg("");
  };

  return (
    <div className="max-w-6xl mx-auto p-6 text-white space-y-6">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Live Session</h1>
            <div className="text-sm text-white/80">Room: {roomId} • {status}</div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-primary" onClick={startCall}>Start Call</button>
            <button className="btn bg-red-500 text-white" onClick={hangup}>Hang up</button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-4">
          <div className="bg-black/40 rounded-xl overflow-hidden aspect-video">
            <video ref={localRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          </div>
          <div className="bg-black/40 rounded-xl overflow-hidden aspect-video">
            <video ref={remoteRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <h2 className="font-semibold mb-2">Chat</h2>
        <div className="h-56 overflow-y-auto border border-white/10 rounded-lg p-3 space-y-2 bg-black/20">
          {chat.map((m, i) => (
            <div key={i} className={`text-sm ${m.from === 'me' ? 'text-emerald-200' : 'text-white/90'}`}>
              <span className="text-white/60">{m.from === 'me' ? 'You' : 'Peer'}:</span> {m.text}
            </div>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className="flex-1 border border-white/20 bg-white/10 text-white p-2 rounded"
            placeholder="Type a message…"
            value={msg}
            onChange={(e) => setMsg(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendChat()}
          />
          <button className="btn glass" onClick={sendChat}>Send</button>
        </div>
      </div>
    </div>
  );
}
