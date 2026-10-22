import React, { useState } from 'react';
import { Lock, X, KeyRound, AlertCircle } from 'lucide-react';

interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  verifyPinFn: (pin: string) => Promise<boolean>;
}

export const AdminPinModal: React.FC<AdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  verifyPinFn,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) {
      setError('Please enter the 4-digit Admin PIN.');
      return;
    }

    setIsChecking(true);
    setError('');

    const isValid = await verifyPinFn(pin);
    setIsChecking(false);

    if (isValid) {
      onSuccess();
      onClose();
      setPin('');
    } else {
      setError('Incorrect Admin PIN. Default is 1234.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white p-5 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-lg">Admin Authentication</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Enter 4-digit PIN to access administrative settings & controls.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1 text-center">
              4-Digit PIN (Default: 1234)
            </label>
            <div className="relative">
              <input
                type="password"
                maxLength={8}
                autoFocus
                required
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="• • • •"
                className="w-full text-center tracking-widest text-2xl font-bold bg-slate-50 border border-slate-300 rounded-xl py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isChecking}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl shadow-md transition-all active:scale-95 text-sm flex items-center justify-center space-x-2"
          >
            <KeyRound className="w-4 h-4" />
            <span>{isChecking ? 'Verifying...' : 'Unlock Admin Mode'}</span>
          </button>

          <p className="text-center text-[11px] text-slate-400">
            You can modify the PIN anytime inside Admin Settings.
          </p>
        </form>
      </div>
    </div>
  );
};
