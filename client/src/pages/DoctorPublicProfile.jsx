// client/src/pages/DoctorPublicProfile.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../api/axios";
import RequestTherapyButton from "../components/RequestTherapyButton";

export default function DoctorPublicProfile() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/doctors/${id}/profile`);
        setDoc(data);
      } catch (e) {
        alert(e?.response?.data?.message || e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return <div className="p-6 text-white">Loading…</div>;
  if (!doc) return <div className="p-6 text-white">Not found</div>;

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-white/30 bg-white/70 backdrop-blur p-4">
        <div className="flex gap-4">
          {doc.profilePhoto
            ? <img src={doc.profilePhoto} className="w-20 h-20 rounded-2xl object-cover border" />
            : <div className="w-20 h-20 rounded-2xl bg-slate-200" />}
          <div className="flex-1">
            <div className="text-xl font-semibold">{doc.name}</div>
            <div className="text-sm text-slate-600">{doc.email}</div>
            <div className="text-sm text-slate-700">
              {(doc.gender ? `${doc.gender} · ` : "")}{doc.age ? `${doc.age}y` : ""}
            </div>
            <div className="text-sm text-slate-700 mt-1">
              {[doc.specialization, doc.qualifications].filter(Boolean).join(" · ")}
            </div>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <RequestTherapyButton doctorId={doc._id || doc.id} />
        </div>

        {doc.bio && <div className="mt-4 text-sm text-slate-700">{doc.bio}</div>}
        {doc.documentPath && (
          <div className="mt-2">
            <a href={doc.documentPath} target="_blank" rel="noreferrer" className="underline text-blue-600">
              View uploaded document
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
