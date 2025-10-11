
import React from "react";
import { Link, NavLink } from "react-router-dom";

const Header: React.FC = () => {
  return (
    <header className="bg-black/90 backdrop-blur-sm border-b border-green-500/30 sticky top-0 z-50 hologram-card">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <Link
          to="/"
          className="text-3xl font-bold tracking-wider glow-green terminal-cursor flex items-center space-x-1"
        >
          <span className="text-green-400">FRAGILE</span>
          <span className="text-green-300">NEWS</span>
          <span className="text-green-400">SOURCE</span>
        </Link>
        <nav className="flex items-center space-x-3">
          <NavLink
            to="/blog"
            className={({ isActive }) =>
              `px-4 py-2 rounded border border-green-500/40 text-green-200 hover:bg-green-500/10 transition-colors ${
                isActive ? "bg-green-600/20 text-green-100 border-green-300" : ""
              }`
            }
          >
            Blog
          </NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Header;
