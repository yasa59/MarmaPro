// client/src/components/StartCallButton.jsx
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { nanoid } from "nanoid"; // npm i nanoid

export default function StartCallButton({ roomId: fixedRoomId }) {
  const nav = useNavigate();
  const roomId = useMemo(() => fixedRoomId || nanoid(12), [fixedRoomId]);
  return (
    <button
      className="btn btn-primary"
      onClick={() => nav(`/call/${roomId}`)}
      title="Open a call room"
    >
      Start Call
    </button>
  );
}
