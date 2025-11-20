// client/src/pages/ProfileSettings.jsx
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "../context/ThemeContext";
import api from "../api/axios";
import fileUrl from "../utils/fileUrl";

const TITLES = ['', 'Mr', 'Ms', 'Mrs', 'Dr', 'Prof', 'Mx'];
const GENDERS = ['', 'male', 'female', 'other', 'prefer_not'];

export default function ProfileSettings() {
  const { theme, toggleTheme, setThemeMode } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [msgType, setMsgType] = useState(""); // 'success' | 'error'
  const fileInputRef = useRef(null);

  const [title, setTitle] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/profile/me');
        if (data) {
          setTitle(data.title || '');
          setFullName(data.fullName || '');
          setPhone(data.phone || '');
          setGender(data.gender || '');
          setAvatar(data.avatar || data.profilePhoto || '');
          if (data.avatar || data.profilePhoto) {
            setAvatarPreview(fileUrl(data.avatar || data.profilePhoto));
          }
        }
      } catch (e) {
        console.error('Failed to load profile:', e);
      }
      setLoading(false);
    })();
  }, []);

  const showMessage = (text, type = 'success') => {
    setMsg(text);
    setMsgType(type);
    setTimeout(() => {
      setMsg("");
      setMsgType("");
    }, 5000);
  };

  async function onSave(e) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    try {
      const { data } = await api.put('/profile/me', { title, fullName, phone, gender });
      if (data?.ok) {
        showMessage("✅ Profile saved successfully!", 'success');
      } else {
        showMessage("❌ Failed to save profile.", 'error');
      }
    } catch (e) {
      showMessage(e.response?.data?.message || "❌ Failed to save profile.", 'error');
    } finally {
      setSaving(false);
    }
  }

  async function onPickAvatar(e) {
    const f = e.target.files?.[0];
    if (!f) return;

    // Validate file type
    if (!f.type.startsWith('image/')) {
      showMessage("❌ Please select an image file.", 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (f.size > 5 * 1024 * 1024) {
      showMessage("❌ Image size must be less than 5MB.", 'error');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
    };
    reader.readAsDataURL(f);

    // Upload to server
    const fd = new FormData();
    fd.append('avatar', f);
    setUploading(true);
    setMsg("");

    try {
      const { data } = await api.post('/profile/avatar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      if (data?.avatar) {
        setAvatar(data.avatar);
        setAvatarPreview(fileUrl(data.avatar));
        showMessage("✅ Profile photo updated successfully!", 'success');
      } else {
        showMessage("❌ Avatar upload failed.", 'error');
      }
    } catch (e) {
      console.error('Avatar upload error:', e);
      showMessage(e.response?.data?.message || "❌ Avatar upload failed. Please try again.", 'error');
      setAvatarPreview(avatar ? fileUrl(avatar) : '');
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="glass rounded-3xl p-8 text-white text-center">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/10 rounded w-1/3 mx-auto"></div>
            <div className="h-4 bg-white/10 rounded w-1/2 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 lg:p-6 space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <h1 className="text-3xl md:text-4xl font-bold text-white">Profile Settings</h1>
        <p className="text-white/70 text-sm md:text-base">Manage your personal information and profile photo</p>
      </motion.div>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border border-white/10 bg-gradient-to-br from-slate-900/90 via-slate-800/80 to-slate-900/90 backdrop-blur-xl shadow-2xl p-6 md:p-8 text-white"
      >
        {/* Profile Photo Section */}
        <div className="mb-8 pb-8 border-b border-white/10">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">📸</span>
            Profile Photo
          </h2>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="relative group">
              <div className="w-32 h-32 rounded-2xl bg-gradient-to-br from-slate-700/50 to-slate-800/50 border-2 border-white/20 overflow-hidden shadow-lg ring-4 ring-white/5">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full grid place-items-center bg-gradient-to-br from-slate-700/60 to-slate-800/60">
                    <div className="text-center">
                      <div className="text-4xl mb-2">👤</div>
                      <div className="text-xs text-white/60">No Photo</div>
                    </div>
                  </div>
                )}
              </div>
              {uploading && (
                <div className="absolute inset-0 bg-black/50 rounded-2xl grid place-items-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/30 border-t-white"></div>
                </div>
              )}
            </div>
            <div className="flex-1 space-y-3">
              <label className="block">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPickAvatar}
                  disabled={uploading}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? "Uploading..." : "📷 Change Photo"}
                </button>
              </label>
              <p className="text-xs text-white/60">
                Recommended: Square image, max 5MB. JPG, PNG, or GIF.
              </p>
            </div>
          </div>
        </div>

        {/* Personal Information Form */}
        <form onSubmit={onSave} className="space-y-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span className="text-2xl">👤</span>
            Personal Information
          </h2>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/90">
                Title <span className="text-white/50">(Optional)</span>
              </label>
              <select
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
              >
                {TITLES.map(t => (
                  <option key={t} value={t} className="bg-slate-800">
                    {t || '— Select Title —'}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-white/90">
                Gender <span className="text-white/50">(Optional)</span>
              </label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition capitalize"
              >
                {GENDERS.map(g => (
                  <option key={g} value={g} className="bg-slate-800 capitalize">
                    {g ? g.replace('_', ' ') : '— Select Gender —'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">
              Full Name <span className="text-white/50">(Optional)</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g., Yasas Perera"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/90">
              Phone Number <span className="text-white/50">(Optional)</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+94 77 123 4567"
              className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/20 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition"
            />
          </div>

          {/* Message Display */}
          <AnimatePresence>
            {msg && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 rounded-xl ${
                  msgType === 'success'
                    ? 'bg-emerald-500/20 border border-emerald-500/30 text-emerald-200'
                    : 'bg-rose-500/20 border border-rose-500/30 text-rose-200'
                }`}
              >
                {msg}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Theme Selection */}
          <div className="pt-6 border-t border-white/10">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <span className="text-2xl">🎨</span>
              Appearance Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/20">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {theme === 'dark' ? '🌙' : '☀️'}
                  </span>
                  <div>
                    <div className="font-medium text-white/90">Theme</div>
                    <div className="text-sm text-white/60">
                      {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setThemeMode('light')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      theme === 'light'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    }`}
                  >
                    ☀️ Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setThemeMode('dark')}
                    className={`px-4 py-2 rounded-lg font-medium transition ${
                      theme === 'dark'
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white/70 hover:bg-white/15'
                    }`}
                  >
                    🌙 Dark
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4 pt-4">
            <button
              type="submit"
              disabled={saving || uploading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <span>💾</span>
                  Save Changes
                </>
              )}
            </button>
            {!saving && !uploading && (
              <p className="text-sm text-white/60">Your changes will be saved immediately</p>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}
