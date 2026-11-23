import React, { useState } from 'react';
import { api, setAuthToken } from '../api';
import { 
  Bus, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  X,
  Sparkles,
  ShieldCheck
} from 'lucide-react';

export default function AuthModal({ isOpen, onClose, onAuthSuccess, initialMode = 'login' }) {
  const [mode, setMode] = useState(initialMode); // 'login' or 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }
    if (password.length < 4) {
      setError('Password must be at least 4 characters long.');
      return;
    }

    setLoading(true);
    try {
      let res;
      if (mode === 'signup') {
        res = await api.signup(cleanEmail, password, fullName.trim());
      } else {
        res = await api.login(cleanEmail, password);
      }

      if (res && res.access_token) {
        setAuthToken(res.access_token);
        if (onAuthSuccess) {
          onAuthSuccess(res.user, res.access_token);
        }
        if (onClose) {
          onClose();
        }
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setMode('login');
    setError('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full overflow-hidden animate-scaleIn">
        
        {/* Modal Top Header */}
        <div className="bg-blue-800 text-white px-6 py-5 flex items-center justify-between border-b border-blue-900">
          <div className="flex items-center space-x-2.5">
            <div className="bg-white text-blue-800 p-2 rounded-xl shadow-xs">
              <Bus className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-base tracking-tight">Scanly Agent Portal</div>
              <div className="text-[11px] text-blue-200">
                {mode === 'login' ? 'Sign in to access your trips' : 'Create new agent account'}
              </div>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-blue-200 hover:text-white hover:bg-blue-900 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Tab Switcher: Sign In vs Sign Up */}
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(''); }}
            className={`flex-1 py-3 text-xs font-bold transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white text-blue-800 border-b-2 border-blue-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(''); }}
            className={`flex-1 py-3 text-xs font-bold transition-all cursor-pointer ${
              mode === 'signup'
                ? 'bg-white text-blue-800 border-b-2 border-blue-800 shadow-2xs'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Create Agent Account
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start space-x-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {mode === 'signup' && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                <User className="w-3.5 h-3.5 text-blue-800" />
                <span>Agent Full Name</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-800 placeholder-slate-400 bg-white"
              />
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
              <Mail className="w-3.5 h-3.5 text-blue-800" />
              <span>Agent Email Address</span>
            </label>
            <input
              type="email"
              required
              placeholder="e.g. agent1@bus.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-800 placeholder-slate-400 bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 flex items-center space-x-1">
              <Lock className="w-3.5 h-3.5 text-blue-800" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 text-xs border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-800 text-slate-800 placeholder-slate-400 bg-white"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-800 hover:bg-blue-900 disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center space-x-2 cursor-pointer mt-2"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Sign In' : 'Create Account & Access Dashboard'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Demo Credentials */}
          <div className="pt-3 border-t border-slate-100">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Quick Test Agent Accounts</span>
              <Sparkles className="w-3 h-3 text-amber-500" />
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => handleQuickFill('agent1@scanly.com', 'pass123')}
                className="p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-slate-800">Agent 1</div>
                <div className="text-[10px] text-slate-500 font-mono">agent1@scanly.com</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('agent2@scanly.com', 'pass123')}
                className="p-2 bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 rounded-lg text-left transition-colors cursor-pointer"
              >
                <div className="font-bold text-slate-800">Agent 2</div>
                <div className="text-[10px] text-slate-500 font-mono">agent2@scanly.com</div>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

