import React, { useState } from 'react';
import { User, Mail, Calendar, ArrowRight, ShieldCheck } from 'lucide-react';
import { UserProfile } from '../types';
import { validateLoginForm, AuthFormState } from '../utils/auth';

interface AuthScreenProps {
  onSuccessLogin: (profile: UserProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onSuccessLogin }) => {
  const [formData, setFormData] = useState<AuthFormState>({
    name: '',
    email: '',
    birthDate: '',
  });
  const [errors, setErrors] = useState<Partial<Record<keyof AuthFormState, string>>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validation = validateLoginForm(formData);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    window.setTimeout(() => {
      const cleanName = formData.name.trim();
      const cleanEmail = formData.email.trim().toLowerCase();
      const emailUsername = cleanEmail.split('@')[0] || cleanName.toLowerCase().replace(/\s+/g, '_');

      const profile: UserProfile = {
        username: emailUsername,
        name: cleanName,
        email: cleanEmail,
        birthDate: formData.birthDate,
        avatarUrl:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
        role: 'VIP MEMBER',
        isLoggedIn: true,
        hasStoragePermission: false,
        storagePath: 'storage/movies/NitaCantik/hasildownload',
        googleAccount: null,
      };

      onSuccessLogin(profile);
      setIsLoading(false);
    }, 300);
  };

  const inputClassName =
    'w-full bg-[#fffdf5] border-2 border-[#141414] focus:border-[#141414] focus:ring-1 focus:ring-[#141414] rounded-xl py-2.5 px-3.5 text-sm text-[#141414] placeholder:text-[#6a6455] outline-none transition-all';

  return (
    <div className="min-h-screen w-full bg-[#f5ecd7] flex flex-col items-center justify-center p-4 relative selection:bg-[#ffd93d] selection:text-[#141414]">
      <div className="fixed inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-cyan-900/25 via-[#050a15]/90 to-[#050a15] -z-10" />

      <div className="w-full max-w-md glass-card rounded-3xl p-6 sm:p-7 border-2 border-[#141414] shadow-[3px_3px_0_#141414] flex flex-col gap-5 relative">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-[#141414] shadow-xl  mb-2.5 bg-[#fffdf5]">
            <img
              src="/assets/aistudio/0bccde96a0fd5264aa10453cdfbe7f70_587ca20b.jpg"
              alt="SnapTools Icon"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex items-center gap-2 font-cyber tracking-widest font-bold text-lg sm:text-xl text-[#d62828] drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]">
            <svg className="w-3.5 h-3.5 fill-[#d62828] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="12,2 22,12 12,22 2,12" />
            </svg>
            <span className="text-[#141414] tracking-wider">SnapTools</span>
            <svg className="w-3.5 h-3.5 fill-[#d62828] shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <polygon points="12,2 22,12 12,22 2,12" />
            </svg>
          </div>
          <p className="text-xs text-[#4b463a] mt-1 max-w-xs">
            Masuk ke SnapTools dengan nama, email, dan tanggal lahir Anda.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5" noValidate>
          <div className="flex flex-col gap-1">
            <label htmlFor="auth-name" className="text-xs font-medium text-[#4b463a] flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#d62828]" />
              <span>Nama Lengkap</span>
            </label>
            <input
              id="auth-name"
              type="text"
              autoComplete="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Masukkan nama Anda..."
              className={inputClassName}
            />
            {errors.name && <span className="text-[11px] text-[#c1121f]">{errors.name}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="auth-email" className="text-xs font-medium text-[#4b463a] flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-[#d62828]" />
              <span>Email</span>
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="nama@email.com"
              className={inputClassName}
            />
            {errors.email && <span className="text-[11px] text-[#c1121f]">{errors.email}</span>}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="auth-birth-date" className="text-xs font-medium text-[#4b463a] flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-[#d62828]" />
              <span>Tanggal Lahir</span>
            </label>
            <input
              id="auth-birth-date"
              type="date"
              autoComplete="bday"
              required
              max={new Date().toISOString().slice(0, 10)}
              value={formData.birthDate}
              onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              className={inputClassName}
            />
            {errors.birthDate && <span className="text-[11px] text-[#c1121f]">{errors.birthDate}</span>}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 rounded-xl bg-[#ffd93d]   text-[#141414] font-bold tracking-wide shadow-lg  active:scale-[0.99] disabled:opacity-50 transition-all font-cyber text-base flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#141414] border-t-white rounded-full animate-spin" />
                <span>MEMPROSES...</span>
              </div>
            ) : (
              <>
                <span>MASUK KE APLIKASI</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#ffe9a0] border-2 border-[#141414] text-[#4b463a] text-xs">
          <ShieldCheck className="w-4 h-4 text-[#d62828] shrink-0" />
          <span>Hasil unduhan akan disimpan langsung ke memori penyimpanan perangkat Anda.</span>
        </div>
      </div>
    </div>
  );
};
