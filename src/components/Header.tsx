
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-black/90 backdrop-blur-sm border-b border-green-500/30 sticky top-0 z-50 hologram-card">
      <div className="container mx-auto px-4 py-4 flex justify-center items-center">
        <div className="text-3xl font-bold tracking-wider glow-green terminal-cursor">
          <span className="text-green-400">FRAGILE</span>
          <span className="text-green-300">NEWS</span>
          <span className="text-green-400">SOURCE</span>
        </div>
      </div>
    </header>
  );
};

export default Header;