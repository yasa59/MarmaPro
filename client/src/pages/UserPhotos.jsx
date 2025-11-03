import { useEffect, useState } from "react";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl";

function PhotoCard({ p, onClick }) {
  return (
    <button
      onClick={onClick}
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
  );
}

export default function UserPhotos() {
  const [items, setItems] = useState([]);
  const [page, setPage]   = useState(1);
  const [pages, setPages] = useState(1);
  const [busy, setBusy]   = useState(false);
  const [sel, setSel]     = useState(null);

  const load = async (pg = 1) => {
    setBusy(true);
    try {
      const { data } = await api.get(`/photos/mine?limit=12&page=${pg}`, { timeout: 0 });
      setItems(data.items || []);
      setPage(data.page);
      setPages(data.pages);
    } catch {
      // ignore
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => { load(1); }, []);

  return (
    <div className="max-w-6xl mx-auto p-6 text-white">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Photo History</h1>
          <p className="text-sm text-white/80">Your detected & annotated images.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(p => (
          <PhotoCard key={p._id} p={p} onClick={() => setSel(p)} />
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
