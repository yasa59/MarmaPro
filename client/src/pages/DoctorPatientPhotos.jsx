import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl";

export default function DoctorPatientPhotos() {
  const { id: patientId } = useParams();
  const [items, setItems] = useState([]);
  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [busy, setBusy]   = useState(false);
  const [sel, setSel]     = useState(null);
  const [msg, setMsg]     = useState("");

  const load = async (pg = 1) => {
    setBusy(true);
    setMsg("");
    try {
      const { data } = await api.get(`/photos/by-user/${patientId}?limit=12&page=${pg}`, { timeout: 0 });
      setItems(data.items || []);
      setPage(data.page);
      setPages(data.pages);
      if ((data.items || []).length === 0) setMsg("No photos uploaded by this patient yet.");
    } catch (e) {
      setMsg(e.response?.data?.message || e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(1); /* eslint-disable-next-line */ }, [patientId]);

  return (
    <div className="max-w-6xl mx-auto p-6 text-white">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Patient Photos</h1>
          <p className="text-sm text-white/80">Patient ID: {patientId}</p>
        </div>
        <Link to={`/doctor/patient/${patientId}`} className="btn glass">Back to Patient</Link>
      </div>

      {msg && <div className="mb-4 p-3 rounded bg-white/10 border border-white/20">{msg}</div>}

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(p => (
          <button
            key={p._id}
            onClick={() => setSel(p)}
            className="group text-left bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-emerald-400/40 transition"
          >
            <div className="aspect-[4/3] bg-black/30 overflow-hidden">
              <img
                src={fileUrl(p.annotated || p.filepath)}
                alt="preview"
                className="w-full h-full object-cover group-hover:scale-[1.02] duration-300"
                loading="lazy"
              />
            </div>
            <div className="p-3">
              <div className="text-sm text-white/90 truncate">
                {new Date(p.createdAt).toLocaleString()}
              </div>
              <div className="text-[12px] text-white/60">
                {p.aligned ? "Aligned" : "Not aligned"}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex items-center justify-center gap-2">
        <button
          className="btn glass disabled:opacity-40"
          disabled={busy || page <= 1}
          onClick={() => load(page - 1)}
        >
          Prev
        </button>
        <div className="text-white/80 text-sm">
          Page {page} / {pages}
        </div>
        <button
          className="btn glass disabled:opacity-40"
          disabled={busy || page >= pages}
          onClick={() => load(page + 1)}
        >
          Next
        </button>
      </div>

      {/* Modal */}
      {sel && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm grid place-items-center p-4 z-40">
          <div className="bg-blue-900/70 border border-white/10 rounded-2xl p-4 max-w-3xl w-full">
            <div className="flex items-center justify-between mb-3">
              <div className="text-white/80 text-sm">
                {new Date(sel.createdAt).toLocaleString()} • {sel.aligned ? "Aligned" : "Not aligned"}
              </div>
              <button className="btn bg-red-500 text-white" onClick={() => setSel(null)}>Close</button>
            </div>
            <img
              src={fileUrl(sel.annotated || sel.filepath)}
              alt="full"
              className="w-full rounded-xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}
