
import React from 'react';

interface AnalysisCardProps {
  title: string;
  children: React.ReactNode;
}

const AnalysisCard: React.FC<AnalysisCardProps> = ({ title, children }) => {
  return (
    <div className="hologram-card rounded-lg overflow-hidden neon-border">
      <div className="bg-black/50 p-4 border-b border-green-500/30">
        <h3 className="text-xl font-bold text-green-400 glow-green">{title}</h3>
      </div>
      <div className="p-6 text-green-400 leading-relaxed circuit-bg">
        {children}
      </div>
    </div>
  );
};

export default AnalysisCard;
