
import React, { useState } from 'react';
import { UserData } from '../types';

interface RegistrationFormProps {
  onComplete: (data: UserData) => void;
}

const RegistrationForm: React.FC<RegistrationFormProps> = ({ onComplete }) => {
  const [formData, setFormData] = useState<UserData>({
    name: '',
    email: '',
    phone: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = formData.phone.replace(/\D/g, '');
    if (formData.name && formData.email && cleanPhone.length === 10) {
      onComplete({
        ...formData,
        phone: `+91 ${formData.phone}`
      });
    } else if (cleanPhone.length !== 10) {
      alert("Please enter a valid 10-digit Indian mobile number.");
    }
  };

  return (
    <div className="relative group max-w-md mx-auto animate-fade-in">
      {/* Background Glow */}
      <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-red-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
      
      <div className="relative bg-slate-900/80 backdrop-blur-2xl p-8 rounded-[2rem] border border-white/10 shadow-2xl overflow-hidden">
        {/* Subtle Grid Background */}
        <div className="absolute inset-0 z-0 opacity-10 pointer-events-none bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>

        <div className="relative z-10">
          <header className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
              <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04M12 21.355r2.747-3.433m0 0a8.013 8.013 0 005.932-5.932m-5.932 5.932l-2.747-3.433m0 0a8.013 8.013 0 01-5.932-5.932m5.932 5.932L12 21.355z" />
              </svg>
            </div>
            <h2 className="text-3xl font-black text-white tracking-tighter italic">CANDIDATE ENTRY</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.4em] mt-1">Authorized Personnel Only</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity</label>
              <input
                type="text"
                required
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all placeholder:text-slate-700 text-sm font-medium"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Rahul Sharma"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Neural Address</label>
              <input
                type="email"
                required
                className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all placeholder:text-slate-700 text-sm font-medium"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="rahul@cloud.aws"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Comm Channel (IN)</label>
              <div className="relative group/input">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 font-black text-xs border-r border-white/10 pr-4">+91</span>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl pl-20 pr-5 py-4 focus:border-orange-500/50 focus:ring-4 focus:ring-orange-500/5 outline-none transition-all placeholder:text-slate-700 text-sm font-medium"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                  placeholder="9876543210"
                />
              </div>
            </div>

            <button
              type="submit"
              className="group relative w-full py-5 bg-white text-black rounded-2xl font-black uppercase tracking-[0.2em] text-xs transition-all hover:bg-orange-500 hover:text-white active:scale-95 shadow-2xl shadow-black overflow-hidden"
            >
              <span className="relative z-10">Initialize Setup</span>
              <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegistrationForm;
