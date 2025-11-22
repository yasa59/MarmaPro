// client/src/components/Toast.jsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const toastStore = {
  toasts: [],
  listeners: [],
  add(toast) {
    const id = Date.now() + Math.random();
    const newToast = { ...toast, id };
    this.toasts = [...this.toasts, newToast];
    this.notify();
    
    // Auto-dismiss after duration
    if (toast.duration !== 0) {
      setTimeout(() => this.remove(id), toast.duration || 5000);
    }
    return id;
  },
  remove(id) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  },
  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  },
  notify() {
    this.listeners.forEach(listener => listener(this.toasts));
  }
};

// Toast functions
export const toast = {
  success: (message, options = {}) => toastStore.add({ type: 'success', message, ...options }),
  error: (message, options = {}) => toastStore.add({ type: 'error', message, ...options }),
  info: (message, options = {}) => toastStore.add({ type: 'info', message, ...options }),
  warning: (message, options = {}) => toastStore.add({ type: 'warning', message, ...options }),
};

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    return toastStore.subscribe(setToasts);
  }, []);

  return (
    <div className="fixed top-20 right-4 z-[9999] space-y-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, x: 100, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            className="pointer-events-auto min-w-[300px] max-w-md"
          >
            <div
              className={`rounded-xl p-4 shadow-lg border backdrop-blur-sm ${
                toast.type === 'success'
                  ? 'bg-emerald-500/90 dark:bg-emerald-600/90 border-emerald-400 text-white'
                  : toast.type === 'error'
                  ? 'bg-rose-500/90 dark:bg-rose-600/90 border-rose-400 text-white'
                  : toast.type === 'warning'
                  ? 'bg-yellow-500/90 dark:bg-yellow-600/90 border-yellow-400 text-white'
                  : 'bg-blue-500/90 dark:bg-blue-600/90 border-blue-400 text-white'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="font-semibold text-sm">{toast.message}</div>
                  {toast.description && (
                    <div className="text-xs mt-1 opacity-90">{toast.description}</div>
                  )}
                </div>
                <button
                  onClick={() => toastStore.remove(toast.id)}
                  className="text-white/80 hover:text-white transition"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default toast;


