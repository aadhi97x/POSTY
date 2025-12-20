
import React, { useState, useContext, useEffect } from 'react';
import { User } from '../types';
import { LangContext, PostyLogo, StateEmblem } from '../App';
import { Smartphone, Lock, User as UserIcon, Mail, Building2, ChevronLeft, ShieldCheck, BellRing, CheckCircle2, RefreshCw, X } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { t } = useContext(LangContext);
  const [role, setRole] = useState<'user' | 'staff' | null>(null);
  const [step, setStep] = useState<'phone' | 'otp' | 'profile' | 'staff_form'>('phone');
  
  // Form State
  const [phone, setPhone] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [generatedOtp, setGeneratedOtp] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  
  // UI Simulation State
  const [showToast, setShowToast] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    let interval: number;
    if (resendTimer > 0) {
      interval = window.setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.length >= 10) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOtp(code);
      setStep('otp');
      setShowToast(true);
      setResendTimer(30);
      // Auto-hide toast after 8 seconds
      setTimeout(() => setShowToast(false), 8000);
    }
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifying(true);
    
    // Artificial delay for realism
    setTimeout(() => {
      if (otpInput === generatedOtp || otpInput === '123456') {
        setStep('profile');
      } else {
        alert("Incorrect Security Code. Please check the notification at the top of your screen.");
      }
      setIsVerifying(false);
    }, 1500);
  };

  const handleCompleteProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({
      id: `CIT-${Date.now()}`,
      phone,
      name,
      email,
      role: 'user'
    });
  };

  const handleStaffLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (staffId && password) {
      onLogin({
        id: staffId,
        phone: 'N/A',
        name: `Officer ${staffId.split('-')[1] || staffId}`,
        email: `${staffId}@posty.gov.in`,
        role: 'agent'
      });
    }
  };

  const BrandingBox = () => (
    <div className="flex flex-col items-center mb-12 text-heritage-maroon">
      <StateEmblem className="h-24 mb-6" />
      <PostyLogo className="h-16 mb-2" />
      <p className="text-[11px] font-black uppercase tracking-[0.5em] text-heritage-sandstone mt-4">Sovereign Grievance Protocol</p>
    </div>
  );

  return (
    <div className="relative w-full max-w-4xl mx-auto">
      {/* Heritage Fake OTP Toast */}
      {showToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] w-full max-w-sm px-4 animate-in slide-in-from-top-4 duration-500">
          <div className="bg-heritage-maroon text-heritage-parchment p-6 rounded-3xl shadow-2xl border-2 border-heritage-sandstone/50 flex items-center gap-6">
            <div className="bg-white/20 p-3 rounded-2xl">
              <BellRing className="animate-bounce" size={24} />
            </div>
            <div className="flex-grow">
              <p className="text-[10px] font-black uppercase tracking-widest text-heritage-sandstone">Dak-Message (OTP)</p>
              <p className="text-sm font-bold mt-1">Your POSTY secure verification code is: <span className="text-lg font-black tracking-widest text-white ml-1">{generatedOtp}</span></p>
            </div>
            <button onClick={() => setShowToast(false)} className="text-heritage-sandstone hover:text-white p-2">
              <X size={20} />
            </button>
          </div>
        </div>
      )}

      {!role ? (
        <div className="max-w-2xl mx-auto p-16 parchment-card rounded-[4rem] animate-expand">
          <BrandingBox />
          
          <div className="my-16 flex items-center gap-6 text-center justify-center">
            <div className="h-px bg-heritage-sandstone/30 flex-grow"></div>
            <h2 className="text-[12px] font-black text-heritage-sandstone uppercase tracking-[0.4em] whitespace-nowrap">{t.login_title}</h2>
            <div className="h-px bg-heritage-sandstone/30 flex-grow"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <button 
              onClick={() => { setRole('user'); setStep('phone'); }}
              className="flex flex-col items-center gap-8 p-12 bg-heritage-sandstone/10 border-2 border-heritage-sandstone/20 hover:border-heritage-red group transition-all rounded-[3rem] shadow-xl hover:-translate-y-2"
            >
              <div className="p-8 bg-white/80 rounded-[2rem] text-heritage-red group-hover:bg-heritage-red group-hover:text-heritage-parchment transition-all shadow-lg">
                <UserIcon size={44} />
              </div>
              <div className="text-center">
                <p className="font-black text-heritage-maroon uppercase text-sm tracking-widest">{t.login_citizen}</p>
                <p className="text-[10px] text-heritage-sandstone font-black uppercase tracking-[0.3em] mt-3 italic">Public Access</p>
              </div>
            </button>

            <button 
              onClick={() => { setRole('staff'); setStep('staff_form'); }}
              className="flex flex-col items-center gap-8 p-12 bg-heritage-sandstone/10 border-2 border-heritage-sandstone/20 hover:border-heritage-maroon group transition-all rounded-[3rem] shadow-xl hover:-translate-y-2"
            >
              <div className="p-8 bg-white/80 rounded-[2rem] text-heritage-maroon group-hover:bg-heritage-maroon group-hover:text-heritage-parchment transition-all shadow-lg">
                <Building2 size={44} />
              </div>
              <div className="text-center">
                <p className="font-black text-heritage-maroon uppercase text-sm tracking-widest">{t.login_staff}</p>
                <p className="text-[10px] text-heritage-sandstone font-black uppercase tracking-[0.3em] mt-3 italic">Official Log</p>
              </div>
            </button>
          </div>

          <div className="mt-20 text-center space-y-4 opacity-60">
             <div className="flex items-center justify-center gap-3 text-heritage-maroon">
               <ShieldCheck size={18} />
               <p className="text-[11px] font-black uppercase tracking-[0.3em]">Encrypted National Terminal</p>
             </div>
             <p className="text-[10px] font-bold text-heritage-sandstone uppercase tracking-[0.2em] leading-relaxed max-w-sm mx-auto">
               Department of Posts • Ministry of Communications • Government of India
             </p>
          </div>
        </div>
      ) : (
        <div className="max-w-md mx-auto p-16 parchment-card rounded-[3.5rem] animate-expand">
          <button 
            onClick={() => { setRole(null); setShowToast(false); }}
            className="flex items-center gap-3 text-[11px] font-black text-heritage-sandstone hover:text-heritage-red mb-16 uppercase tracking-[0.3em] transition-all group"
          >
            <ChevronLeft size={20} className="group-hover:-translate-x-2 transition-transform" /> {t.login_back || 'Back'}
          </button>

          <div className="text-center mb-16">
            <PostyLogo className="h-16 mx-auto mb-6 text-heritage-maroon" />
            <h2 className="text-4xl font-black text-heritage-maroon uppercase tracking-tighter italic">
              {role === 'staff' ? t.login_officer : t.login_verify}
            </h2>
            <p className="text-[11px] text-heritage-sandstone font-black uppercase tracking-[0.4em] mt-4">Security Protocol</p>
          </div>

          {role === 'staff' ? (
            <form onSubmit={handleStaffLogin} className="space-y-10">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-heritage-sandstone uppercase tracking-[0.3em] ml-2">Official Dept ID</label>
                <input
                  type="text"
                  placeholder="e.g. DPO-1854"
                  required
                  className="w-full px-8 py-5 bg-white/50 border-2 border-heritage-sandstone text-heritage-ink rounded-2xl outline-none focus:border-heritage-red transition-all font-bold text-lg"
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                />
              </div>
              <div className="space-y-4">
                <label className="text-[11px] font-black text-heritage-sandstone uppercase tracking-[0.3em] ml-2">Access Key</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  required
                  className="w-full px-8 py-5 bg-white/50 border-2 border-heritage-sandstone text-heritage-ink rounded-2xl outline-none focus:border-heritage-red transition-all font-bold text-lg"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <button type="submit" className="w-full bg-heritage-maroon text-heritage-parchment py-6 rounded-2xl font-black uppercase text-xs tracking-[0.4em] hover:bg-heritage-red transition-all shadow-2xl active:scale-95">
                {t.login_btn_verify}
              </button>
            </form>
          ) : (
            <>
              {step === 'phone' && (
                <form onSubmit={handleSendOtp} className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-heritage-sandstone uppercase tracking-[0.3em] ml-2">{t.login_phone}</label>
                    <div className="relative">
                      <Smartphone className="absolute left-8 top-1/2 -translate-y-1/2 text-heritage-sandstone" size={24} />
                      <input
                        type="tel"
                        placeholder="Enter Mobile Number"
                        required
                        className="w-full pl-20 pr-8 py-5 bg-white/50 border-2 border-heritage-sandstone text-heritage-ink rounded-2xl outline-none focus:border-heritage-red transition-all font-bold text-lg"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-heritage-red text-heritage-parchment py-6 rounded-2xl font-black uppercase text-xs tracking-[0.4em] hover:bg-heritage-maroon transition-all shadow-2xl active:scale-95">
                    {t.login_btn_send}
                  </button>
                </form>
              )}

              {step === 'otp' && (
                <form onSubmit={handleVerifyOtp} className="space-y-10">
                  <div className="space-y-4 text-center">
                    <label className="text-[11px] font-black text-heritage-sandstone uppercase tracking-[0.3em]">{t.login_otp}</label>
                    <p className="text-[10px] text-heritage-sandstone font-bold uppercase tracking-widest mt-2 mb-12 italic">Dispatched to {phone}</p>
                    <div className="relative">
                      <Lock className="absolute left-8 top-1/2 -translate-y-1/2 text-heritage-sandstone" size={24} />
                      <input
                        type="text"
                        placeholder="••••••"
                        required
                        maxLength={6}
                        className="w-full pl-20 pr-8 py-6 bg-white/50 border-2 border-heritage-sandstone text-heritage-ink rounded-2xl outline-none focus:border-heritage-red transition-all text-center tracking-[0.8em] font-black text-2xl shadow-inner"
                        value={otpInput}
                        onChange={(e) => setOtpInput(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <button 
                      type="submit" 
                      disabled={isVerifying}
                      className="w-full bg-heritage-red text-heritage-parchment py-6 rounded-2xl font-black uppercase text-xs tracking-[0.4em] hover:bg-heritage-maroon transition-all shadow-2xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
                    >
                      {isVerifying ? <RefreshCw className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                      {isVerifying ? 'Verifying...' : t.login_btn_verify}
                    </button>
                    
                    <button 
                      type="button"
                      disabled={resendTimer > 0}
                      onClick={handleSendOtp}
                      className="w-full text-[10px] font-black uppercase tracking-[0.2em] text-heritage-sandstone hover:text-heritage-maroon disabled:opacity-30 transition-all"
                    >
                      {resendTimer > 0 ? `Resend Available in ${resendTimer}s` : 'Resend Security Code'}
                    </button>
                  </div>
                </form>
              )}

              {step === 'profile' && (
                <form onSubmit={handleCompleteProfile} className="space-y-10">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-heritage-sandstone uppercase tracking-[0.3em] ml-2">{t.login_name}</label>
                    <div className="relative">
                      <UserIcon className="absolute left-8 top-1/2 -translate-y-1/2 text-heritage-sandstone" size={24} />
                      <input
                        type="text"
                        placeholder="Full Legal Name"
                        required
                        className="w-full pl-20 pr-8 py-5 bg-white/50 border-2 border-heritage-sandstone text-heritage-ink rounded-2xl outline-none focus:border-heritage-red transition-all font-bold text-lg"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[11px] font-black text-heritage-sandstone uppercase tracking-[0.3em] ml-2">{t.login_email}</label>
                    <div className="relative">
                      <Mail className="absolute left-8 top-1/2 -translate-y-1/2 text-heritage-sandstone" size={24} />
                      <input
                        type="email"
                        placeholder="Email Address"
                        required
                        className="w-full pl-20 pr-8 py-5 bg-white/50 border-2 border-heritage-sandstone text-heritage-ink rounded-2xl outline-none focus:border-heritage-red transition-all font-bold text-lg"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <button type="submit" className="w-full bg-heritage-maroon text-heritage-parchment py-6 rounded-2xl font-black uppercase text-xs tracking-[0.4em] hover:bg-heritage-red transition-all shadow-2xl active:scale-95">
                    {t.login_btn_account}
                  </button>
                </form>
              )}
            </>
          )}

          <div className="mt-20 pt-12 border-t border-heritage-sandstone/20 text-center">
            <p className="text-[10px] font-black text-heritage-sandstone uppercase tracking-[0.4em] opacity-40 italic">National Postal Neural Network Access</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
