import React from "react";
import { Link, useLocation } from "react-router-dom";
import Header from "./Header";
import Footer from "./Footer";

const NotFound: React.FC = () => {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono flex flex-col relative overflow-hidden">
      <video
        className="fixed inset-0 w-full h-full object-cover opacity-30"
        autoPlay
        loop
        muted
        playsInline
      >
        <source src="/matrix.mp4" type="video/mp4" />
      </video>

      <div className="fixed inset-0 pointer-events-none">
        <div className="scan-lines"></div>
      </div>

      <Header />
      <main className="flex-grow container mx-auto px-4 py-16 relative z-10 flex flex-col items-center justify-center text-center space-y-6">
        <div className="bg-black/70 border border-green-500/40 rounded-xl p-8 max-w-2xl hologram-card">
          <p className="text-sm uppercase tracking-[0.35em] text-green-300/70 mb-4">
            Matrix Subsystem Fault
          </p>
          <h1 className="text-4xl md:text-5xl font-bold text-green-200 glow-green mb-4">
            Glitch detected in the timeline.
          </h1>
          <p className="text-green-100/90 leading-relaxed mb-6">
            The path <span className="text-green-300 font-semibold">{location.pathname}</span>{" "}
            doesn&apos;t map to any known reality. Our signal scrambled mid-transmission
            and the page slipped between dimensions.
          </p>
          <div className="bg-black/60 border border-green-500/20 rounded-lg p-4 text-left text-xs md:text-sm text-green-200/80 mb-6">
            <p className="uppercase tracking-wide text-green-300/80 mb-1">
              Diagnostics
            </p>
            <p>Status Code: <span className="text-green-100">404 — anomaly not indexed</span></p>
            <p>Suggested Action: <span className="text-green-100">Reboot to trusted node</span></p>
            <p>Advice from Operator: <span className="text-green-100">“Stay awake. The matrix lies.”</span></p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/"
              className="px-6 py-3 bg-green-600 hover:bg-green-500 text-black font-bold uppercase tracking-wide rounded transition-colors shadow-lg"
            >
              Return to Base
            </Link>
            <Link
              to="/blog"
              className="px-6 py-3 border border-green-500/70 hover:border-green-300 text-green-200 font-semibold uppercase tracking-wide rounded transition-colors bg-black/40"
            >
              Visit Briefing Room
            </Link>
          </div>
        </div>
        <p className="text-xs text-green-300/60 uppercase tracking-[0.35em]">
          // Transmission error. Logging incident. //
        </p>
      </main>
      <Footer />
    </div>
  );
};

export default NotFound;
