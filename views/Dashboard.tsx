
// @ts-nocheck
import React, { useContext, useState } from 'react';
import { Link } from 'react-router-dom';
import { User, Complaint, ComplaintStatus } from '../types';
import { LangContext } from '../App';
import { findNearbyBranches } from '../services/geminiService';
import { 
  PlusCircle, Search, ClipboardList, ChevronRight, Mail, MapPin, Sparkles, Navigation, ExternalLink, Loader2, Building2
} from 'lucide-react';

interface DashboardProps {
  user: User;
  complaints: Complaint[];
}

const Dashboard: React.FC<DashboardProps> = ({ user, complaints }) => {
  const { t } = useContext(LangContext);
  const [isLocating, setIsLocating] = useState(false);
  const [branches, setBranches] = useState<any>(null);

  const activeCount = complaints.filter(c => c.status !== ComplaintStatus.CLOSED && c.status !== ComplaintStatus.SOLVED).length;

  const handleFindBranches = () => {
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const result = await findNearbyBranches(pos.coords.latitude, pos.coords.longitude);
      setBranches(result);
      setIsLocating(false);
    }, () => {
      alert("Please enable location services.");
      setIsLocating(false);
    });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-16">
      {/* Welcome Banner */}
      <section className="parchment-card p-16 rounded-[4rem] flex flex-col md:flex-row items-center justify-between gap-12 relative">
        <div className="absolute top-0 right-0 p-12 opacity-5">
          <Building2 size={240} className="text-heritage-maroon" />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="flex items-center gap-3">
            <Sparkles size={18} className="text-heritage-red" />
            <span className="text-[12px] font-black uppercase tracking-[0.5em] text-heritage-sandstone">{t.smart_redressal}</span>
          </div>
          <h2 className="text-6xl font-black text-heritage-maroon tracking-tighter uppercase leading-[0.9] italic">
            {t.welcome},<br/>
            <span className="text-heritage-red not-italic">{user.name}</span>
          </h2>
          <p className="text-sm font-bold text-heritage-sandstone uppercase tracking-widest">Official Citizen Hub • Secure Terminal</p>
        </div>
        
        <div className="relative z-10 bg-white/60 backdrop-blur-md px-12 py-10 rounded-[2.5rem] border-2 border-heritage-sandstone/30 text-center shadow-2xl">
          <p className="text-[11px] font-black uppercase tracking-[0.3em] text-heritage-sandstone mb-3">{t.active_cases}</p>
          <div className="flex items-baseline gap-3 justify-center">
            <span className="text-7xl font-black text-heritage-red leading-none">{activeCount}</span>
            <span className="text-xs font-black text-heritage-maroon uppercase tracking-widest">Active</span>
          </div>
        </div>
      </section>

      {/* Main Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        {[
          { to: "/submit", icon: PlusCircle, title: t.reg, sub: t.reg_sub, color: "text-heritage-red", bg: "bg-red-50/50" },
          { to: "/track", icon: Search, title: t.track, sub: t.track_sub, color: "text-heritage-maroon", bg: "bg-orange-50/50" },
          { to: "/menu", icon: ClipboardList, title: t.hub, sub: t.hub_sub, color: "text-heritage-ink", bg: "bg-heritage-sandstone/10" }
        ].map((action, idx) => (
          <Link key={idx} to={action.to} className="group parchment-card p-12 rounded-[3.5rem] hover:scale-[1.02] transition-all flex flex-col items-center text-center">
            <div className={`${action.bg} w-24 h-24 rounded-[2rem] flex items-center justify-center ${action.color} mb-10 border border-heritage-sandstone/20 group-hover:bg-heritage-maroon group-hover:text-heritage-parchment transition-all shadow-xl`}>
              <action.icon size={44} />
            </div>
            <h3 className="text-3xl font-black text-heritage-maroon mb-4 uppercase tracking-tighter">{action.title}</h3>
            <p className="text-sm text-heritage-sandstone font-bold uppercase tracking-widest leading-relaxed mb-10">{action.sub}</p>
            <div className="flex items-center text-heritage-red text-[11px] font-black uppercase gap-2 transition-transform group-hover:translate-x-2">
              {t.proceed} <ChevronRight size={18} />
            </div>
          </Link>
        ))}
      </div>

      {/* Branch Finder */}
      <div className="parchment-card rounded-[4rem] p-16 shadow-2xl">
         <div className="flex flex-col md:flex-row justify-between items-start gap-12">
            <div className="max-w-xl space-y-8">
               <div className="flex items-center gap-4 text-heritage-red">
                  <Navigation size={24} />
                  <span className="text-[12px] font-black uppercase tracking-[0.4em]">Heritage Logistics Intelligence</span>
               </div>
               <h3 className="text-4xl font-black text-heritage-maroon uppercase tracking-tighter leading-none">Official Branch Locator</h3>
               <p className="text-base text-heritage-sandstone font-bold uppercase tracking-widest leading-relaxed italic opacity-80">Access the national directory of operational India Post offices via real-time satellite telemetry.</p>
               <button onClick={handleFindBranches} disabled={isLocating} className="bg-heritage-maroon text-heritage-parchment px-12 py-5 rounded-2xl font-black text-[12px] uppercase tracking-[0.3em] shadow-2xl hover:bg-heritage-red transition-all flex items-center gap-4 active:scale-95">
                  {isLocating ? <Loader2 className="animate-spin" size={20} /> : <MapPin size={20} />} Establish GPS Connection
               </button>
            </div>
            
            {branches && (
              <div className="w-full md:w-96 bg-white/40 backdrop-blur-md p-10 rounded-[3rem] border border-heritage-sandstone/30 shadow-2xl animate-expand">
                 <p className="text-[11px] font-black text-heritage-maroon uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                   <Building2 size={16} /> Proximity Results
                 </p>
                 <div className="text-sm font-bold text-heritage-ink leading-relaxed uppercase tracking-tight">
                    {branches.text}
                 </div>
                 <div className="mt-10 flex flex-wrap gap-3">
                    {branches.links.map((link, i) => (
                       <a key={i} href={link} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-heritage-parchment px-5 py-3 rounded-xl text-[10px] font-black uppercase text-heritage-red border border-heritage-sandstone hover:bg-heritage-red hover:text-white transition-all shadow-md">
                          Deploy Map <ExternalLink size={12} />
                       </a>
                    ))}
                 </div>
              </div>
            )}
         </div>
      </div>

      {/* Resources Info */}
      <div className="bg-heritage-maroon/5 rounded-[4rem] p-20 flex flex-col md:flex-row items-center justify-between gap-16 border border-heritage-sandstone/20">
        <div className="space-y-6 max-w-xl text-center md:text-left">
          <h4 className="text-4xl font-black text-heritage-maroon uppercase tracking-tighter leading-none italic">{t.resources}</h4>
          <p className="text-sm text-heritage-sandstone font-black uppercase tracking-[0.2em] leading-loose">{t.resources_sub}</p>
        </div>
        <div className="grid grid-cols-2 gap-10">
          <div className="p-10 parchment-card rounded-[2.5rem] text-center group cursor-pointer hover:border-heritage-red transition-all hover:-translate-y-2">
            <Mail className="mx-auto mb-6 text-heritage-red" size={48} />
            <span className="text-[12px] font-black uppercase text-heritage-maroon tracking-[0.3em]">{t.speed}</span>
          </div>
          <div className="p-10 parchment-card rounded-[2.5rem] text-center group cursor-pointer hover:border-heritage-red transition-all hover:-translate-y-2">
            <MapPin className="mx-auto mb-6 text-heritage-red" size={48} />
            <span className="text-[12px] font-black uppercase text-heritage-maroon tracking-[0.3em]">{t.find}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
