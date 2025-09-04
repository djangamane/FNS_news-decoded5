
import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = "Loading..." }) => {
  return (
    <div className="flex flex-col justify-center items-center space-y-4">
        <div className="cyber-spinner h-16 w-16"></div>
        <p className="text-green-400 text-lg glow-green terminal-cursor">{message}</p>
    </div>
  );
};

export default LoadingSpinner;