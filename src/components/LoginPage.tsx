import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  LogIn, 
  AlertCircle, 
  Sparkles, 
  CheckCircle2, 
  HelpCircle,
  ShieldCheck,
  Building2,
  Calendar
} from 'lucide-react';
import { ClubSettings, AppUser } from '../types/club.ts';
import { loginUser, submitForgotPasswordRequest, resetPasswordWithToken } from '../services/api.ts';
interface LoginPageProps {
  settings: ClubSettings;
  onLoginSuccess: (user: AppUser, token: string) => void;
  onContinueAsGuest?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  settings,
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const isBn = false;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showForgotModal, setShowForgotModal] = useState(false);

  // Forgot password modal state
  const [resetMode, setResetMode] = useState<'request' | 'token'>('request');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotReason, setForgotReason] = useState('');
  const [isForgotSubmitting, setIsForgotSubmitting] = useState(false);
  const [forgotErrorMsg, setForgotErrorMsg] = useState('');
  const [forgotSubmittedMsg, setForgotSubmittedMsg] = useState('');

  // Token reset state
  const [resetTokenInput, setResetTokenInput] = useState('');
  const [tokenNewPassword, setTokenNewPassword] = useState('');
  const [isTokenSubmitting, setIsTokenSubmitting] = useState(false);

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setForgotErrorMsg('Please provide your User ID or Email.');
      return;
    }
    setIsForgotSubmitting(true);
    setForgotErrorMsg('');
    setForgotSubmittedMsg('');
    try {
      const res = await submitForgotPasswordRequest(forgotIdentifier.trim(), forgotReason.trim());
      setForgotSubmittedMsg(res.message || 'Request submitted successfully to Admin.');
      setForgotIdentifier('');
      setForgotReason('');
    } catch (err: any) {
      setForgotErrorMsg(err?.message || 'Failed to submit request.');
    } finally {
      setIsForgotSubmitting(false);
    }
  };

  const handleTokenResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTokenInput.trim() || !tokenNewPassword) {
      setForgotErrorMsg('Token and new password are required.');
      return;
    }
    if (tokenNewPassword.length < 4) {
      setForgotErrorMsg('New password must be at least 4 characters.');
      return;
    }
    setIsTokenSubmitting(true);
    setForgotErrorMsg('');
    setForgotSubmittedMsg('');
    try {
      const res = await resetPasswordWithToken(resetTokenInput.trim(), tokenNewPassword);
      setForgotSubmittedMsg(res.message || 'Password reset successfully! You can now log in.');
      setResetTokenInput('');
      setTokenNewPassword('');
    } catch (err: any) {
      setForgotErrorMsg(err?.message || 'Failed to reset password.');
    } finally {
      setIsTokenSubmitting(false);
    }
  };

  const appearance = settings.loginAppearance || {
    themePreset: 'emerald',
    primaryColor: '#059669',
    secondaryColor: '#0f172a',
    backgroundColor: 'linear-gradient(135deg, #0f172a 0%, #064e3b 50%, #022c22 100%)',
    buttonColor: '#059669',
    textColor: '#ffffff',
    customGreeting: 'Welcome to the Official Club Management & Accounting Portal',
    showTagline: true,
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter your User ID / Email and password.');
      return;
    }

    try {
      setIsLoading(true);
      setErrorMessage('');
      const result = await loginUser(username.trim(), password);
      onLoginSuccess(result.user, result.token);
    } catch (err: any) {
      setErrorMessage(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick fill helper for testing / convenience
  const handleQuickDemo = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    setErrorMessage('');
  };

  return (
    <div 
      className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden font-sans"
      style={{
        background: appearance.backgroundColor.includes('gradient')
          ? appearance.backgroundColor
          : `linear-gradient(135deg, ${appearance.secondaryColor} 0%, ${appearance.backgroundColor} 100%)`,
      }}
    >
      {/* Decorative Background Glows */}
      <div 
        className="absolute top-10 left-10 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: appearance.primaryColor }}
      />
      <div 
        className="absolute bottom-10 right-10 w-96 h-96 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ backgroundColor: appearance.primaryColor }}
      />

      <div className="w-full max-w-md relative z-10 space-y-4">
        {/* Main Card */}
        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-7 sm:p-9 border border-white/10 shadow-2xl shadow-black/50 text-white">

          {/* Top Logo & Club Identity */}
          <div className="text-center space-y-3 pb-6 border-b border-white/10">
            <div className="flex justify-center">
              {settings.logoUrl ? (
                <div className="relative group">
                  <img
                    src={settings.logoUrl}
                    alt={settings.clubName}
                    referrerPolicy="no-referrer"
                    className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-2xl bg-white/10 p-2 border border-white/20 shadow-xl shadow-black/40 transition-transform transform group-hover:scale-105"
                  />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center text-slate-950">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                </div>
              ) : (
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center font-black text-3xl shadow-xl border border-white/20"
                  style={{ backgroundColor: appearance.primaryColor, color: '#ffffff' }}
                >
                  {settings.clubName.charAt(0) || 'C'}
                </div>
              )}
            </div>

            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-tight">
                {settings.clubName}
              </h1>
              {appearance.showTagline && (
                <p className="text-xs text-slate-300 font-medium mt-1">
                  {settings.villageTown} • {isBn ? 'নিবন্ধন নং' : 'Reg'}: {settings.registrationNo}
                </p>
              )}
            </div>

            {appearance.customGreeting && (
              <div className="inline-block bg-white/5 border border-white/10 rounded-full px-3 py-1">
                <p className="text-[11px] text-slate-300 font-medium">
                  {appearance.customGreeting}
                </p>
              </div>
            )}
          </div>

          {/* Error Banner */}
          {errorMessage && (
            <div className="mt-4 p-3.5 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                {isBn ? 'ইউজার আইডি বা ইমেইল' : 'User ID or Email'}
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder={isBn ? 'যেমন: admin বা আপনার ইমেইল' : 'e.g. admin or your email'}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                  {isBn ? 'পাসওয়ার্ড' : 'Password'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(true)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold transition-colors"
                >
                  {isBn ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot Password?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isBn ? 'অ্যাকাউন্টের পাসওয়ার্ড লিখুন' : 'Enter your account password'}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-white p-0.5 rounded-lg transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{ backgroundColor: appearance.buttonColor || '#059669' }}
              className="w-full text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{isBn ? 'লগইন হচ্ছে...' : 'Signing In...'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{isBn ? 'নিরাপদ লগইন' : 'Secure Login'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials helper (Only shown if enabled in Settings, hidden by default) */}
          {appearance.showQuickLoginButtons && (
            <div className="mt-6 pt-5 border-t border-white/10 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold">
                <span>Quick Login Accounts:</span>
                <span className="text-emerald-400">Click to fill</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('admin', 'admin123')}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-1.5 text-center text-slate-300 font-bold transition-all"
                >
                  <div className="text-emerald-400 text-[10px]">Admin</div>
                  <div className="truncate text-white">admin</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('treasurer', 'treasurer123')}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-1.5 text-center text-slate-300 font-bold transition-all"
                >
                  <div className="text-blue-400 text-[10px]">Accounts</div>
                  <div className="truncate text-white">treasurer</div>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('deskuser', 'desk123')}
                  className="bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg p-1.5 text-center text-slate-300 font-bold transition-all"
                >
                  <div className="text-amber-400 text-[10px]">Collection</div>
                  <div className="truncate text-white">deskuser</div>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center text-xs text-slate-400/90 font-medium space-y-1">
          <p>
            {settings.clubName} • Reg. No: {settings.registrationNo}
          </p>
          <p className="text-[11px] text-slate-500">
            Powered by Secure Role-Based Authentication • Timezone: {settings.timezone || 'Asia/Kolkata'}
          </p>
        </div>
      </div>

      {/* Forgot Password / Password Reset Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/20 rounded-3xl p-6 sm:p-7 max-w-md w-full text-white space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2 text-emerald-400">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base text-white">Password Recovery & Reset</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowForgotModal(false);
                  setForgotSubmittedMsg('');
                  setForgotErrorMsg('');
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Mode Switcher: Request Reset vs Use Approved Token */}
            <div className="flex rounded-xl bg-white/5 p-1 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setResetMode('request');
                  setForgotErrorMsg('');
                  setForgotSubmittedMsg('');
                }}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  resetMode === 'request'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                1. Submit Request
              </button>
              <button
                type="button"
                onClick={() => {
                  setResetMode('token');
                  setForgotErrorMsg('');
                  setForgotSubmittedMsg('');
                }}
                className={`flex-1 py-1.5 rounded-lg transition-colors ${
                  resetMode === 'token'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                2. Use Approved Token
              </button>
            </div>

            {forgotErrorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs flex items-center space-x-2 font-medium">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{forgotErrorMsg}</span>
              </div>
            )}

            {forgotSubmittedMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center space-x-2 font-medium">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
                <span>{forgotSubmittedMsg}</span>
              </div>
            )}

            {resetMode === 'request' ? (
              <form onSubmit={handleForgotSubmit} className="space-y-3.5 text-xs">
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Submit a secure request to the Club Administrator. Once an authorized Admin reviews and approves it, you will receive a secure, one-time reset authorization code.
                </p>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Your Registered User ID or Email *
                  </label>
                  <input
                    type="text"
                    required
                    value={forgotIdentifier}
                    onChange={(e) => setForgotIdentifier(e.target.value)}
                    placeholder="e.g. treasurer or priyanka.sen@club.org or MEM-001"
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-medium"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Reason / Details
                  </label>
                  <textarea
                    rows={2}
                    value={forgotReason}
                    onChange={(e) => setForgotReason(e.target.value)}
                    placeholder="e.g. Forgot password during device change, please approve reset."
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isForgotSubmitting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <span>{isForgotSubmitting ? 'Submitting...' : 'Submit to Admin'}</span>
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleTokenResetSubmit} className="space-y-3.5 text-xs">
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Enter the secure One-Time Reset Token provided after Admin approval to set your new password.
                </p>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    One-Time Authorization Token *
                  </label>
                  <input
                    type="text"
                    required
                    value={resetTokenInput}
                    onChange={(e) => setResetTokenInput(e.target.value)}
                    placeholder="Paste the approved reset token here"
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 font-mono text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    New Password (min 4 characters) *
                  </label>
                  <input
                    type="password"
                    required
                    minLength={4}
                    value={tokenNewPassword}
                    onChange={(e) => setTokenNewPassword(e.target.value)}
                    placeholder="Enter your new secure password"
                    className="w-full bg-white/5 border border-white/20 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs"
                  />
                </div>

                <div className="pt-2 flex items-center justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isTokenSubmitting}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all shadow-md disabled:opacity-50 flex items-center space-x-1.5"
                  >
                    <span>{isTokenSubmitting ? 'Updating...' : 'Set New Password'}</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
