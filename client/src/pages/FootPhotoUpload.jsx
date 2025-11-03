import { useEffect, useState } from "react";
import api from "../api/axios";

export default function FootPhotoUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [result, setResult] = useState(null); // { id, filepath, annotated, rectangles }

  useEffect(() => {
    // load latest (if any) so page isn’t empty
    (async () => {
      try {
        const { data } = await api.get("/photos/latest/mine");
        setResult(data);
      } catch {
        /* no previous photo — ignore */
      }
    })();
  }, []);

  const onSelect = (e) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setMsg("");
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(f);
    } else {
      setPreview("");
    }
  };

  const upload = async () => {
    if (!file) return setMsg("Please choose a photo first.");
    setUploading(true);
    setMsg("");
    try {
      const form = new FormData();
      form.append("image", file);
      const { data } = await api.post("/photos/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setResult(data);
      setMsg("Detection complete ✔");
      setPreview("");
      setFile(null);
    } catch (e) {
      setMsg(e.response?.data?.message || e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const markAligned = async (aligned) => {
    if (!result?.id) return setMsg("Upload a photo first.");
    try {
      await api.post(`/therapy/align/${result.id}/mark`, { aligned });
      setResult((r) => (r ? { ...r, aligned } : r));
      setMsg(aligned ? "Marked as aligned ✅" : "Marked as not aligned.");
    } catch (e) {
      setMsg(e.response?.data?.message || e.message || "Failed to mark");
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 text-white">
      <div className="glass rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Upload Foot Photo</h1>
            <p className="text-white/80 text-sm">
              We’ll run detection and show an <span className="font-semibold">annotated</span> preview.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <label className="border-2 border-dashed border-white/25 rounded-xl p-5 cursor-pointer bg-white/5 hover:bg-white/10 transition">
            <div className="text-center space-y-2">
              <div className="text-sm text-white/70">Choose a clear photo of your foot (sole)</div>
              <div className="text-xs text-white/50">JPG/PNG</div>
              <input type="file" accept="image/*" className="hidden" onChange={onSelect} />
            </div>
          </label>

          <div className="space-y-3">
            {preview ? (
              <img
                src={preview}
                alt="preview"
                className="w-full rounded-lg border border-white/15 object-contain max-h-60"
              />
            ) : (
              <div className="w-full h-40 rounded-lg border border-white/10 bg-white/5 grid place-items-center text-white/60">
                No file selected
              </div>
            )}

            <button
              className="btn btn-primary w-full disabled:opacity-60"
              onClick={upload}
              disabled={uploading || !file}
            >
              {uploading ? "Uploading & Detecting…" : "Upload & Detect"}
            </button>
          </div>
        </div>

        {msg && <div className="p-3 rounded bg-white/10 border border-white/20">{msg}</div>}

        {result && (
          <div className="grid md:grid-cols-2 gap-4 fade-in">
            <div className="card">
              <div className="text-sm text-white/70 mb-2">Original</div>
              <img
                src={result.filepath || result.raw || result.original}
                alt="original"
                className="w-full rounded-lg border border-white/15 object-contain max-h-80"
              />
            </div>
            <div className="card">
              <div className="text-sm text-white/70 mb-2">Annotated (detected zones)</div>
              <img
                src={result.annotated}
                alt="annotated"
                className="w-full rounded-lg border border-white/15 object-contain max-h-80"
              />
            </div>

            <div className="md:col-span-2 flex flex-wrap items-center gap-2">
              <span className="text-sm text-white/70">
                Alignment status:{" "}
                <b className={result.aligned ? "text-emerald-300" : "text-white"}>
                  {result.aligned ? "Aligned" : "Not aligned"}
                </b>
              </span>
              <button className="btn btn-secondary" onClick={() => markAligned(true)}>
                Mark Aligned
              </button>
              <button className="btn glass" onClick={() => markAligned(false)}>
                Mark Not Aligned
              </button>
            </div>
          </div>
        )}

        {result?.rectangles?.length > 0 && (
          <div className="pt-2">
            <div className="text-sm text-white/80 mb-1">Detected zones:</div>
            <div className="text-xs text-white/70 grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {result.rectangles.map((r, i) => (
                <div key={i} className="bg-white/5 rounded p-2 border border-white/10">
                  x:{r.x}, y:{r.y}, w:{r.width}, h:{r.height}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
