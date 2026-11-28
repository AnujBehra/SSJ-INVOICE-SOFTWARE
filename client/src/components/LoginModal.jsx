import React, { useState } from 'react';
import { Zap, ShieldCheck, Building2, User, Lock, Mail, ArrowRight, Check, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api';

const GST_STATES = [
  { code: '27', name: 'Maharashtra' },
  { code: '29', name: 'Karnataka' },
  { code: '07', name: 'Delhi' },
  { code: '24', name: 'Gujarat' },
  { code: '33', name: 'Tamil Nadu' }
];

export default function LoginModal({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [stateCode, setStateCode] = useState('27');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.login({ email, password });
      localStorage.setItem('ssj_token', res.token);
      onLoginSuccess(res.user);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.register({
        companyName,
        fullName,
        email,
        password,
        stateCode
      });
      localStorage.setItem('ssj_token', res.token);
      onLoginSuccess(res.user);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick 1-click Demo Logins
  const handleDemoBusinessAdmin = async () => {
    setEmail('demo@ssjtech.com');
    setPassword('demo123');
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.login({ email: 'demo@ssjtech.com', password: 'demo123' });
      localStorage.setItem('ssj_token', res.token);
      onLoginSuccess(res.user);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSuperAdmin = async () => {
    setEmail('superadmin@invoicepro.com');
    setPassword('admin123');
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await api.login({ email: 'superadmin@invoicepro.com', password: 'admin123' });
      localStorage.setItem('ssj_token', res.token);
      onLoginSuccess(res.user);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border border-slate-200">
        
        {/* Logo and Welcome */}
        <div className="text-center space-y-2 mb-6">
          <div className="flex justify-center">
            <img 
              src="/ssj-icon.png" 
              alt="SSJ Developers Logo" 
              className="w-14 h-14 rounded-2xl object-cover shadow-lg shadow-indigo-600/25 border border-slate-200"
            />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              SSJ Invoice
            </h1>
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest mt-0.5">
              SSJ DEVELOPERS
            </p>
          </div>
          <p className="text-xs text-slate-500">
            Sign in to access your billing workspace
          </p>
        </div>

        {/* Quick Access Accounts */}
        <div className="space-y-2 mb-6 bg-slate-50 p-3.5 rounded-2xl border border-slate-200/80">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center">
            Demo / Quick Access Accounts (1-Click Login)
          </div>
          <button
            type="button"
            onClick={handleDemoBusinessAdmin}
            disabled={loading}
            className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-xl shadow-xs transition flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2 text-left">
              <Building2 className="w-4 h-4 text-indigo-200 flex-shrink-0" />
              <div>
                <span className="font-bold">Tenant Admin (SSJ Tech)</span>
                <span className="block text-[10px] text-indigo-200 font-normal">Pass: demo123 / password</span>
              </div>
            </div>
            <span className="text-[10px] bg-indigo-700/80 px-2 py-1 rounded font-mono">demo@ssjtech.com</span>
          </button>

          <button
            type="button"
            onClick={handleDemoSuperAdmin}
            disabled={loading}
            className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-900 text-slate-200 text-xs font-semibold rounded-xl transition flex items-center justify-between cursor-pointer"
          >
            <div className="flex items-center space-x-2 text-left">
              <ShieldCheck className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <div>
                <span className="font-bold text-white">Super Administrator</span>
                <span className="block text-[10px] text-slate-400 font-normal">Pass: admin123 / password123</span>
              </div>
            </div>
            <span className="text-[10px] bg-slate-700/80 px-2 py-1 rounded font-mono text-slate-300">superadmin@...</span>
          </button>
        </div>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase font-bold text-slate-400 bg-white px-2">
            <span>Or Enter Credentials</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl mb-4 font-medium flex items-center justify-between">
            <span>{errorMsg}</span>
            <span className="text-[10px] text-rose-500 font-bold ml-2">Tip: Use demo123 or admin123</span>
          </div>
        )}

        <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-3.5">
          {isRegister && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Company / Organization *</label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Global Corp"
                  className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Admin Name"
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Origin State *</label>
                  <select
                    value={stateCode}
                    onChange={(e) => setStateCode(e.target.value)}
                    className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    {GST_STATES.map(s => <option key={s.code} value={s.code}>{s.code} - {s.name}</option>)}
                  </select>
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@business.com"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">Password *</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-slate-400 hover:text-indigo-600 flex items-center space-x-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showPassword ? 'Hide' : 'Show'}</span>
              </button>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none font-mono"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md transition"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Register Tenant Account' : 'Sign In to Workspace'}
          </button>
        </form>

        <div className="text-center mt-5">
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setErrorMsg(''); }}
            className="text-xs font-semibold text-indigo-600 hover:text-indigo-800"
          >
            {isRegister ? 'Already have an account? Sign In' : 'New business? Create free trial account'}
          </button>
        </div>

      </div>
    </div>
  );
}
