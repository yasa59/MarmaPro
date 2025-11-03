export default function Landing(){
  return (
    <div className="min-h-[70vh] flex items-center justify-center text-white px-6">
      <div className="text-center max-w-2xl space-y-6">
        <h2 className="text-4xl md:text-5xl font-extrabold drop-shadow">
          Smart IoT-based Marma Foot Therapy
        </h2>
        <p className="text-lg opacity-90">
          Secure OTP login, doctor verification & admin approval. ESP32 ready for alignment & therapy control.
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a href="/signup" className="btn btn-primary shadow-glow">Get Started</a>
          <a href="/login" className="btn btn-secondary">Login</a>
        </div>
      </div>
    </div>
  );
}
