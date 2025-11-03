// client/src/pages/CallRoom.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import api from "../api/axios";
import { useParams, useSearchParams } from "react-router-dom";
import { fetchIceServers, getSignalingURL, getSignalingPath } from "../lib/rtcConfig";

export default function CallRoom() {
  // You can supply roomId via route /call/:roomId or fetch it using ?partnerId=
  const { roomId: roomIdFromPath } = useParams();
  const [search] = useSearchParams();

  const [roomId, setRoomId] = useState(roomIdFromPath || "");
  const [chat, setChat] = useState([]);
  const [input, setInput] = useState("");
  const [peers, setPeers] = useState([]); // socket ids
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [sharing, setSharing] = useState(false);

  const myVideoRef = useRef(null);
  const remoteVideosRef = useRef(new Map()); // socket.id -> video element
  const peersRef = useRef(new Map());        // socket.id -> RTCPeerConnection
  const myStreamRef = useRef(null);
  const screenTrackRef = useRef(null);
  const socketRef = useRef(null);
  const tokenRef = useRef(null);

  // Dynamic ICE from server (Twilio/managed), no TURN creds in frontend .env
  const [ICE_SERVERS, setICEServers] = useState({ iceServers: [] });

  // Env-driven signaling config
  const signalingURL = useMemo(() => getSignalingURL(), []);
  const signalingPath = useMemo(() => getSignalingPath(), []);

  // Fetch ICE servers once
  useEffect(() => {
    (async () => {
      try {
        const cfg = await fetchIceServers();
        setICEServers(cfg ?? { iceServers: [] });
      } catch {
        setICEServers({ iceServers: [] });
      }
    })();
  }, []);

  // 1) Create/Get roomId if not provided
  useEffect(() => {
    (async () => {
      // get JWT from your auth store; adapt if different
      const token = localStorage.getItem("token");
      tokenRef.current = token;

      if (!roomIdFromPath) {
        const partnerId = search.get("partnerId");
        if (!partnerId) {
          alert("Missing partnerId");
          return;
        }
        const { data } = await api.post("/call/room", { partnerId });
        setRoomId(data.roomId);
      } else {
        setRoomId(roomIdFromPath);
      }
    })();
  }, [roomIdFromPath, search]);

  // 2) Start socket + media after roomId & ICE are ready
  useEffect(() => {
    if (!roomId) return;
    if (!ICE_SERVERS?.iceServers?.length) return; // wait for ICE

    // init socket.io
    const socket = io(signalingURL + signalingPath, {
      transports: ["websocket"],
      auth: { token: tokenRef.current },
    });
    socketRef.current = socket;

    // local media
    (async () => {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      myStreamRef.current = stream;
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = stream;
      }
      // join
      socket.emit("join", { roomId });
    })();

    // When we receive list of peers already in the room
    socket.on("peers", ({ peers }) => {
      setPeers(peers);
      peers.forEach((peerId) => createOfferFor(peerId));
    });

    // New peer joined (we are the "old" peer; we will wait for their offer)
    socket.on("peer-joined", ({ id }) => {
      setPeers((p) => [...new Set([...p, id])]);
    });

    // Handle incoming signaling
    socket.on("signal", async ({ from, data }) => {
      let pc = peersRef.current.get(from);
      if (!pc) {
        pc = createPeer(from, false);
      }

      if (data.type === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit("signal", { roomId, to: from, data: pc.localDescription });
      } else if (data.type === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
      } else if (data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn("Error adding ICE candidate", e);
        }
      }
    });

    // Chat messages
    socket.on("chat", (msg) => {
      setChat((c) => [...c, msg]);
    });

    // Peer presence updates
    socket.on("presence", ({ id, state }) => {
      // You can reflect their mute/camera/share states in UI if you want
      // console.log("presence from", id, state);
    });

    // Peer left
    socket.on("peer-left", ({ id }) => {
      // cleanup peer connection
      removePeer(id);
      setPeers((list) => list.filter((x) => x !== id));
    });

    return () => {
      try {
        socket.emit("leave", { roomId });
      } catch {}
      socket.disconnect();
      cleanupAllPeers();
      stopLocalTracks();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, signalingURL, signalingPath, ICE_SERVERS]);

  // Helpers
  function createPeer(peerId, isInitiator) {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    myStreamRef.current.getTracks().forEach((t) => pc.addTrack(t, myStreamRef.current));

    // Remote tracks
    pc.ontrack = (ev) => {
      const [remoteStream] = ev.streams;
      let videoEl = remoteVideosRef.current.get(peerId);
      if (!videoEl) {
        videoEl = document.createElement("video");
        videoEl.autoplay = true;
        videoEl.playsInline = true;
        videoEl.className = "w-full rounded-xl";
        remoteVideosRef.current.set(peerId, videoEl);
        const container = document.getElementById("remote-grid");
        container && container.appendChild(videoEl);
      }
      videoEl.srcObject = remoteStream;
    };

    // ICE
    pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        socketRef.current.emit("signal", {
          roomId,
          to: peerId,
          data: { candidate: ev.candidate },
        });
      }
    };

    // Negotiate if initiator
    if (isInitiator) {
      (async () => {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socketRef.current.emit("signal", { roomId, to: peerId, data: offer });
      })();
    }

    peersRef.current.set(peerId, pc);
    return pc;
  }

  async function createOfferFor(peerId) {
    createPeer(peerId, true);
  }

  function removePeer(peerId) {
    const pc = peersRef.current.get(peerId);
    if (pc) {
      pc.getSenders().forEach((s) => {
        try {
          pc.removeTrack(s);
        } catch {}
      });
      try {
        pc.close();
      } catch {}
      peersRef.current.delete(peerId);
    }
    const el = remoteVideosRef.current.get(peerId);
    if (el?.parentNode) el.parentNode.removeChild(el);
    remoteVideosRef.current.delete(peerId);
  }

  function cleanupAllPeers() {
    [...peersRef.current.keys()].forEach(removePeer);
  }

  function stopLocalTracks() {
    if (myStreamRef.current) {
      myStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    if (screenTrackRef.current) {
      screenTrackRef.current.stop();
      screenTrackRef.current = null;
    }
  }

  // UI actions
  const sendChat = () => {
    const text = input.trim();
    if (!text) return;
    socketRef.current.emit("chat", { roomId, text });
    setInput("");
  };

  const toggleMute = () => {
    const enabled = !muted;
    myStreamRef.current.getAudioTracks().forEach((t) => (t.enabled = enabled));
    setMuted(!enabled);
    socketRef.current.emit("presence", { roomId, state: { muted: !enabled } });
  };

  const toggleCamera = () => {
    const enabled = cameraOff;
    myStreamRef.current.getVideoTracks().forEach((t) => (t.enabled = enabled));
    setCameraOff(!enabled);
    socketRef.current.emit("presence", { roomId, state: { cameraOff: !enabled } });
  };

  const startShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const [track] = stream.getVideoTracks();
      screenTrackRef.current = track;

      // replace video sender track
      for (const pc of peersRef.current.values()) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
        if (sender) await sender.replaceTrack(track);
      }
      setSharing(true);

      track.onended = async () => {
        // revert to camera
        const cam = myStreamRef.current.getVideoTracks()[0];
        for (const pc of peersRef.current.values()) {
          const sender = pc.getSenders().find((s) => s.track && s.track.kind === "video");
          if (sender) await sender.replaceTrack(cam);
        }
        setSharing(false);
      };
      socketRef.current.emit("presence", { roomId, state: { sharing: true } });
    } catch (e) {
      console.warn("Share failed", e);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="md:col-span-2">
          <div className="rounded-2xl border p-3 bg-white/70 backdrop-blur">
            <video ref={myVideoRef} autoPlay playsInline muted className="w-full rounded-xl mb-3" />
            <div id="remote-grid" className="grid grid-cols-1 sm:grid-cols-2 gap-3" />
            <div className="flex gap-2 mt-3">
              <button onClick={toggleMute} className="px-3 py-2 rounded-xl border">
                {muted ? "Unmute" : "Mute"}
              </button>
              <button onClick={toggleCamera} className="px-3 py-2 rounded-xl border">
                {cameraOff ? "Camera On" : "Camera Off"}
              </button>
              <button onClick={startShare} disabled={sharing} className="px-3 py-2 rounded-xl border">
                {sharing ? "Sharing..." : "Share Screen"}
              </button>
            </div>
          </div>
        </div>

        <div className="md:col-span-1">
          <div className="rounded-2xl border p-3 bg-white/70 backdrop-blur h-[70vh] flex flex-col">
            <div className="font-semibold mb-2">Room: {roomId}</div>
            <div className="text-sm text-slate-600 mb-2">Peers: {peers.length}</div>

            <div className="flex-1 overflow-y-auto space-y-2 border rounded-lg p-2 bg-white">
              {chat.map((m, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium">{m.id.slice(0, 5)}:</span> {m.text}
                </div>
              ))}
            </div>

            <div className="mt-2 flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type message…"
                className="flex-1 border rounded-lg px-3 py-2"
              />
              <button onClick={sendChat} className="px-3 py-2 rounded-xl border">Send</button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
