import React from 'react';
import { ArticleAnalysis } from '../types';

interface DecodeConfirmationDialogProps {
  analysis: ArticleAnalysis;
  onConfirm: () => void;
  onCancel: () => void;
  isSending: boolean;
}

const DecodeConfirmationDialog: React.FC<DecodeConfirmationDialogProps> = ({ analysis, onConfirm, onCancel, isSending }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-gray-900 border border-green-500/50 rounded-lg p-6 max-w-2xl w-full mx-4 hologram-card">
        <h3 className="text-green-400 text-2xl font-bold mb-4">Confirm Translation</h3>
        <div className="bg-gray-800/50 p-4 rounded border border-green-500/20 max-h-96 overflow-y-auto no-scrollbar mb-6">
          <h4 className="font-bold text-green-300 mb-2">'Keisha' Translation:</h4>
          <div className="prose prose-invert max-w-none text-green-400 leading-relaxed">
            {analysis.keishaTranslation.split('\n').filter(p => p.trim().length > 0).map((p, i) => (
              <p key={i} className="mb-4">{p.trim()}</p>
            ))}
          </div>
        </div>
        <div className="flex justify-end space-x-4">
          <button
            onClick={onCancel}
            className="px-6 py-2 text-green-600 hover:text-green-400 transition-colors"
            disabled={isSending}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-black rounded transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
            disabled={isSending}
          >
            {isSending ? 'Sending...' : 'Confirm & Send'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DecodeConfirmationDialog;
