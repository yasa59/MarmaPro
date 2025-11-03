// client/src/pages/UserFootPhoto.jsx
import { useMemo, useState } from "react";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl.js";

export default function UserFootPhoto() {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [photo, setPhoto] = useState(null);

  const preview = useMemo(() => (file ? URL.createObjectURL(file) : ""), [file]);

  const onChangeFile = (e) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    setPhoto(null);
    setMsg("");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg("");
    if (!file) {
      setMsg("Pick an image first");
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
      setBusy(true);
      const { data } = await api.post("/photos/ai-detect", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 0,
      });
      setPhoto(data.photo);
      setMsg(data.message || "Detection complete");
    } catch (e) {
      setMsg(e?.response?.data?.message || e.message || "Upload/detection failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-6 text-white space-y-6">
      <div className="glass rounded-2xl p-6 space-y-4">
        <h1 className="text-2xl font-bold">Upload Foot Photo &amp; Detect</h1>
        <p className="text-sm text-white/80">
          We’ll annotate marma points and save it to your dashboard.
        </p>

        <form onSubmit={onSubmit} className="space-y-3">
          <input
            type="file"
            accept="image/*"
            onChange={onChangeFile}
            className="w-full text-sm"
          />

          {preview && (
            <img
              src={preview}
              alt="preview"
              className="mt-2 w-full max-w-sm rounded border border-white/20"
            />
          )}

          <button className="btn btn-primary" disabled={busy || !file}>
            {busy ? "Processing…" : "Upload & Detect"}
          </button>
        </form>

        {msg && <div className="p-3 rounded bg-white/10 border border-white/20">{msg}</div>}
      </div>

      {photo && (
        <div className="glass rounded-2xl p-6 space-y-3">
          <h2 className="text-lg font-semibold">Result</h2>
          <img
            src={fileUrl(photo.annotated || photo.filepath)}
            alt="Detected marma points"
            className="w-full max-w-xl rounded border border-white/20"
          />
          <div className="text-sm text-white/80">
            Aligned: {photo.aligned ? "Yes" : "No"}
          </div>
        </div>
      )}
    </div>
  );
}
