import { useState } from "react";
import api from "../api/axios";

export default function UploadFoot(){
  const [file, setFile] = useState(null);
  const [localURL, setLocalURL] = useState(null);
  const [rects, setRects] = useState([]);
  const [photoId, setPhotoId] = useState("");
  const [annotated, setAnnotated] = useState("");
  const [aligned, setAligned] = useState(false);
  const [msg, setMsg] = useState("");

  const upload = async ()=>{
    if(!file) return;
    setMsg("");
    const fd = new FormData();
    fd.append("image", file);
    try{
      const { data } = await api.post("/photos/upload", fd);
      setPhotoId(data.id);
      setRects(data.rectangles || []);
      setAnnotated(data.annotated || "");
      setMsg("Detection complete.");
    }catch(e){
      setMsg(e.response?.data?.message || e.message);
    }
  };

  const mark = async (flag)=>{
    if(!photoId) return;
    try{
      const { data } = await api.post(`/therapy/align/${photoId}/mark`, { aligned: flag });
      setAligned(data.aligned);
    }catch(e){
      setMsg(e.response?.data?.message || e.message);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 text-white">
      <h1 className="text-2xl font-bold mb-3">Upload Foot Photo</h1>
      {msg && <div className="mb-3 p-3 rounded bg-white/10 border border-white/20">{msg}</div>}

      <div className="rounded-2xl p-4 backdrop-blur bg-white/10 border border-white/20">
        <div className="flex flex-col md:flex-row gap-4 items-start">
          <div className="flex-1">
            <input
              type="file"
              accept="image/*"
              onChange={(e)=>{
                const f = e.target.files?.[0];
                setFile(f || null);
                setLocalURL(f ? URL.createObjectURL(f) : null);
              }}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4
                         file:rounded-full file:border-0 file:text-sm
                         file:bg-blue-600 file:text-white hover:file:bg-blue-700
                         cursor-pointer"
            />
            <button
              onClick={upload}
              className="mt-3 px-4 py-2 rounded bg-gradient-to-r from-indigo-500 to-purple-600 hover:opacity-90 transition"
              disabled={!file}
            >
              Upload & Detect
            </button>

            <div className="mt-3 flex gap-2">
              <button
                onClick={()=>mark(false)}
                className="px-3 py-2 rounded border border-white/30 hover:bg-white/10 transition"
                disabled={!photoId}
              >
                Mark Red (Wrong)
              </button>
              <button
                onClick={()=>mark(true)}
                className="px-3 py-2 rounded bg-emerald-500 hover:bg-emerald-600 transition"
                disabled={!photoId}
              >
                Mark Green (Correct)
              </button>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            {localURL && (
              <div>
                <div className="text-sm text-white/80 mb-1">
                  Local preview (rectangles will be on server image)
                </div>
                <img src={localURL} alt="local" className="rounded border border-white/20 max-w-full" />
              </div>
            )}
            {annotated && (
              <div>
                <div className="text-sm text-white/80 mb-1">
                  Annotated by server (green boxes)
                </div>
                <img src={annotated} alt="annotated" className="rounded border border-white/20 max-w-full" />
              </div>
            )}
            {photoId && (
              <div className="text-sm">
                Photo ID: <span className="text-white/80">{photoId}</span> ·
                Aligned: <span className={aligned ? "text-emerald-300" : "text-red-300"}>
                  {aligned ? "Yes" : "No"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {photoId && (
        <div className="mt-4">
          <a
            href="/therapy"
            className="inline-block px-5 py-2 rounded bg-pink-500 hover:bg-pink-600 transition"
            title="Go to Therapy control"
          >
            Go to Therapy
          </a>
        </div>
      )}
    </div>
  );
}
