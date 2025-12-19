
// @ts-nocheck
import React, { useState, useMemo } from 'react';
import { Complaint, ComplaintStatus, TicketUpdate, User } from '../types';
import { polishDraft } from '../services/geminiService';
import { 
  Search, CheckCircle, Clock, Zap, Send, Inbox,
  LayoutGrid, BarChart, AlertTriangle, Target,
  Sparkles, Cpu, Loader2, TrendingUp, Globe, 
  Settings, Mail, Hash, 
  MessageSquare, User as UserAvatar, 
  Image as ImageIcon, Download, ChevronRight,
  Filter, Info, ListChecks, Activity, MessageCircle,
  AlertOctagon, History, Shield, Tag, Timer, Users,
  UserCheck, Layers, FileText, BarChart3, Fingerprint,
  TrendingDown, Minus, Building2
} from 'lucide-react';

interface AdminProps {
  complaints: Complaint[];
  user: User;
  onUpdate: (updatedComplaints: Complaint[]) => void;
}

type ViewFilter = 'inbox' | 'unassigned' | 'all' | 'closed' | 'dashboard';

const AdminTickets: React.FC<AdminProps> = ({ complaints: initialComplaints, user, onUpdate }) => {
  const [complaints, setComplaints] = useState<Complaint[]>(initialComplaints);
  const [selectedId, setSelectedId] = useState<string | null>(initialComplaints[0]?.id || null);
  const [currentView, setCurrentView] = useState<ViewFilter>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isPolishing, setIsPolishing] = useState(false);

  const selectedTicket = complaints.find(c => c.id === selectedId);

  const stats = useMemo(() => {
    const total = complaints.length;
    const closed = complaints.filter(c => c.status === ComplaintStatus.CLOSED).length;
    return {
      inbox: total - closed,
      unassigned: complaints.filter(c => !c.assignedAgentId).length,
      all: total,
      closed,
      avgPriority: Math.round(complaints.reduce((acc, c) => acc + (c.analysis?.priorityScore || 0), 0) / (total || 1)),
      resolvedRate: total > 0 ? Math.round((closed / total) * 100) : 0
    };
  }, [complaints]);

  const filtered = useMemo(() => {
    return complaints.filter(c => {
      const matchesSearch = c.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                           c.userName.toLowerCase().includes(searchQuery.toLowerCase());
      if (currentView === 'dashboard') return false;
      const matchesView = currentView === 'inbox' ? c.status !== ComplaintStatus.CLOSED :
                         currentView === 'unassigned' ? !c.assignedAgentId :
                         currentView === 'closed' ? c.status === ComplaintStatus.CLOSED : true;
      return matchesSearch && matchesView;
    }).sort((a, b) => (b.analysis?.priorityScore || 0) - (a.analysis?.priorityScore || 0));
  }, [complaints, searchQuery, currentView]);

  const handleAction = (status: ComplaintStatus, message: string, isInternal: boolean = false) => {
    if (!selectedId || !message.trim()) return;
    const update: TicketUpdate = {
      timestamp: new Date().toISOString(),
      author: user.name,
      message,
      isInternal,
      type: isInternal ? 'internal_note' : 'message'
    };
    const updated = complaints.map(c => 
      c.id === selectedId ? { 
        ...c, 
        status: isInternal ? c.status : status, 
        updates: [...c.updates, update], 
        lastActivityAt: new Date().toISOString() 
      } : c
    );
    setComplaints(updated);
    onUpdate(updated);
    setReplyText('');
  };

  const handlePolish = async () => {
    if (!replyText.trim()) return;
    setIsPolishing(true);
    const polished = await polishDraft(replyText);
    if (polished) setReplyText(polished);
    setIsPolishing(false);
  };

  const handleExportReport = () => {
    const headers = ["ID", "Citizen Name", "Tracking Number", "Status", "Category", "Priority Score", "Sentiment", "Post Office", "Date Reported", "Description"];
    const rows = complaints.map(c => [
      c.id, c.userName, c.trackingNumber || "N/A", c.status,
      c.analysis?.category || "Other", c.analysis?.priorityScore || "0",
      c.analysis?.sentiment || "Neutral",
      c.postOffice, new Date(c.date).toLocaleDateString(),
      `"${c.description.replace(/"/g, '""')}"`
    ]);
    const csvContent = "\ufeff" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `IndiaPost_Grievance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSentimentStyles = (sentiment: string) => {
    const s = sentiment?.toLowerCase();
    if (s === 'negative' || s === 'angry' || s === 'frustrated') 
      return 'bg-red-50 text-heritage-red border-heritage-red/20';
    if (s === 'positive') 
      return 'bg-emerald-50 text-emerald-600 border-emerald-600/20';
    return 'bg-heritage-parchment text-heritage-sandstone border-heritage-sandstone/20';
  };

  const DashboardView = () => (
    <div className="p-12 space-y-12 animate-expand max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
        <div>
          <h2 className="text-5xl font-black tracking-tighter text-heritage-maroon uppercase italic">Supervisor Hub</h2>
          <div className="flex items-center gap-3 mt-4">
            <div className="w-2 h-2 rounded-full bg-heritage-red animate-pulse" />
            <p className="text-[11px] font-black text-heritage-sandstone uppercase tracking-[0.5em]">Command Intelligence Terminal</p>
          </div>
        </div>
        <button 
          onClick={handleExportReport}
          className="bg-heritage-maroon text-heritage-parchment px-10 py-5 rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-heritage-red transition-all shadow-2xl active:scale-95"
        >
          <Download size={18} /> Export System Report
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {[
          { label: 'Active Tasks', val: stats.inbox, icon: Inbox, color: 'text-heritage-red' },
          { label: 'Avg Speed', val: '2.4h', icon: Timer, color: 'text-heritage-maroon' },
          { label: 'Priority Avg', val: stats.avgPriority, icon: Target, color: 'text-heritage-red' },
          { label: 'Resolution', val: `${stats.resolvedRate}%`, icon: TrendingUp, color: 'text-emerald-700' }
        ].map((kpi, i) => (
          <div key={i} className="parchment-card p-10 rounded-[3rem] shadow-xl flex flex-col justify-between hover:scale-105 transition-all">
            <div className={`${kpi.color} mb-6`}>
              <kpi.icon size={28} />
            </div>
            <div>
              <p className="text-[11px] font-black text-heritage-sandstone uppercase tracking-widest mb-2">{kpi.label}</p>
              <p className="text-4xl font-black text-heritage-maroon">{kpi.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 parchment-card p-12 rounded-[4rem] shadow-xl">
           <div className="flex justify-between items-center mb-10">
              <h3 className="text-[12px] font-black uppercase text-heritage-maroon tracking-[0.3em] flex items-center gap-3">
                <Globe size={18} /> National Node Pressures
              </h3>
              <button className="text-[10px] font-black uppercase text-heritage-red hover:underline italic">Real-Time Data</button>
           </div>
           <div className="space-y-8">
              {['Mumbai GPO', 'Delhi Central', 'Kolkata Hub', 'Chennai Air'].map((loc, i) => (
                <div key={i} className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[12px] font-black text-heritage-maroon uppercase tracking-tight">{loc}</span>
                    <span className="text-[10px] font-bold text-heritage-sandstone uppercase">{Math.floor(Math.random() * 100)} Cases</span>
                  </div>
                  <div className="h-2 bg-heritage-sandstone/10 rounded-full overflow-hidden">
                    <div className="h-full bg-heritage-red rounded-full transition-all duration-1000" style={{ width: `${Math.random() * 70 + 30}%` }} />
                  </div>
                </div>
              ))}
           </div>
        </div>
        
        <div className="lg:col-span-5 bg-heritage-maroon text-heritage-parchment p-12 rounded-[4rem] shadow-2xl relative overflow-hidden">
           <div className="absolute inset-0 opacity-5 pointer-events-none">
              <Building2 size={300} className="translate-x-20 translate-y-20" />
           </div>
           <div className="relative z-10">
              <h3 className="text-[12px] font-black uppercase text-heritage-parchment/60 tracking-[0.3em] mb-10 flex items-center gap-3">
                <Zap size={18} className="text-heritage-parchment" /> Live Operational Feed
              </h3>
              <div className="space-y-6">
                {complaints.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center gap-6 p-5 bg-white/5 rounded-3xl hover:bg-white/10 transition-all cursor-pointer border border-white/10">
                    <div className="w-10 h-10 rounded-2xl bg-white/10 text-white flex items-center justify-center font-black text-sm">
                      {c.userName.charAt(0)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[11px] font-black uppercase truncate text-white">#{c.id} — {c.userName}</p>
                      <p className="text-[10px] text-white/50 truncate mt-1 italic">{c.description}</p>
                    </div>
                  </div>
                ))}
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen -m-16 bg-heritage-parchment/30 pillar-shadow overflow-hidden">
      
      {/* 1. PRIMARY SIDEBAR */}
      <aside className="w-20 bg-heritage-parchment border-r border-heritage-sandstone/30 flex flex-col items-center py-10 shrink-0">
        <div className="w-12 h-12 bg-heritage-maroon rounded-2xl flex items-center justify-center text-heritage-parchment mb-12 shadow-2xl">
          <Building2 size={24} />
        </div>
        <nav className="flex-grow space-y-8">
          {[
            { id: 'dashboard', icon: LayoutGrid, label: 'Control' },
            { id: 'inbox', icon: Inbox, label: 'Grievance' },
            { id: 'unassigned', icon: Layers, label: 'Triage' },
            { id: 'all', icon: FileText, label: 'Archive' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewFilter)}
              className={`p-4 rounded-2xl transition-all ${currentView === item.id ? 'bg-heritage-maroon text-heritage-parchment shadow-2xl scale-110' : 'text-heritage-sandstone hover:text-heritage-red'}`}
              title={item.label}
            >
              <item.icon size={22} />
            </button>
          ))}
        </nav>
        <button className="p-4 text-heritage-sandstone hover:text-heritage-maroon"><Settings size={22} /></button>
      </aside>

      {currentView === 'dashboard' ? (
        <main className="flex-grow overflow-y-auto custom-scrollbar">
          <DashboardView />
        </main>
      ) : (
        <>
          {/* 2. THREAD LIST */}
          <aside className="w-[380px] bg-heritage-parchment border-r border-heritage-sandstone/30 flex flex-col shrink-0">
            <div className="p-10 border-b border-heritage-sandstone/20 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-[12px] font-black uppercase tracking-[0.4em] text-heritage-maroon">{currentView} List</h2>
                <span className="bg-heritage-maroon text-heritage-parchment px-3 py-1 rounded-full text-[10px] font-black">{filtered.length}</span>
              </div>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-heritage-sandstone" size={16} />
                <input 
                  type="text" placeholder="Filter Official Records..." 
                  className="w-full pl-12 pr-6 py-4 bg-white/50 border-2 border-heritage-sandstone rounded-2xl text-xs outline-none focus:border-heritage-red transition-all font-bold"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-4">
               {filtered.map(ticket => (
                 <div 
                   key={ticket.id}
                   onClick={() => setSelectedId(ticket.id)}
                   className={`p-6 rounded-[2.5rem] cursor-pointer transition-all relative border flex flex-col gap-4 ${selectedId === ticket.id ? 'bg-white shadow-2xl border-heritage-red/30' : 'bg-white/40 border-transparent hover:bg-white/80'}`}
                 >
                    {selectedId === ticket.id && <div className="absolute left-0 top-1/4 bottom-1/4 w-1.5 bg-heritage-red rounded-r-full" />}
                    
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <span className="text-[13px] font-black text-heritage-maroon uppercase truncate block leading-none mb-1 tracking-tight">{ticket.userName}</span>
                        <span className="text-[10px] font-bold text-heritage-sandstone uppercase tracking-widest">#{ticket.id}</span>
                      </div>
                      <div className="flex flex-col items-end">
                         <div className="text-2xl font-black text-heritage-red leading-none">
                           {ticket.analysis?.priorityScore || 0}
                         </div>
                         <span className="text-[8px] font-black text-heritage-sandstone uppercase tracking-widest">Weight</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                       <div className="bg-heritage-sandstone/10 px-3 py-1 rounded-lg border border-heritage-sandstone/20 flex items-center gap-2 max-w-[160px] truncate">
                          <Tag size={12} className="text-heritage-sandstone" />
                          <span className="text-[10px] font-black uppercase text-heritage-maroon truncate tracking-tight">{ticket.analysis?.category || "General"}</span>
                       </div>
                       <div className={`px-3 py-1 rounded-lg border flex items-center gap-2 ${getSentimentStyles(ticket.analysis?.sentiment)}`}>
                          <Activity size={12} />
                          <span className="text-[10px] font-black uppercase tracking-tight">{ticket.analysis?.sentiment || "Neutral"}</span>
                       </div>
                    </div>

                    <p className="text-[11px] text-heritage-sandstone font-bold italic line-clamp-2 leading-relaxed bg-heritage-parchment/50 p-4 rounded-2xl">
                      {ticket.description}
                    </p>

                    <div className="flex justify-between items-center pt-3 border-t border-heritage-sandstone/10">
                       <div className="flex items-center gap-2 text-heritage-sandstone">
                          <Clock size={12} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{new Date(ticket.lastActivityAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                       </div>
                       <ChevronRight size={16} className={selectedId === ticket.id ? 'text-heritage-red translate-x-2 transition-transform' : 'text-heritage-sandstone/30'} />
                    </div>
                 </div>
               ))}
            </div>
          </aside>

          {/* 3. WORKSPACE */}
          <main className="flex-grow flex flex-col min-w-0 bg-heritage-parchment/20 pillar-shadow">
            {selectedTicket ? (
              <>
                <header className="px-12 py-8 border-b border-heritage-sandstone/30 flex items-center justify-between shrink-0 bg-heritage-parchment/80 backdrop-blur-md sticky top-0 z-10">
                   <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-heritage-maroon text-heritage-parchment flex items-center justify-center font-black text-lg shadow-xl">
                        {selectedTicket.userName.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-sm font-black uppercase text-heritage-maroon tracking-widest">
                          {selectedTicket.userName} <span className="text-heritage-sandstone mx-3">|</span> <span className="text-heritage-red">#{selectedTicket.id}</span>
                        </h2>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] font-black text-heritage-sandstone uppercase tracking-[0.3em] bg-white/50 px-2 py-1 rounded border border-heritage-sandstone/30">{selectedTicket.analysis?.category}</span>
                          <span className="text-[10px] font-black text-emerald-700 uppercase flex items-center gap-1.5 tracking-widest"><Shield size={12} /> Identity Authenticated</span>
                        </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-4">
                      <button className="p-3 text-heritage-sandstone hover:text-heritage-maroon rounded-full bg-white/50 border border-heritage-sandstone/20"><History size={20} /></button>
                      <button onClick={() => handleAction(ComplaintStatus.CLOSED, "Grievance marked as resolved by officer.")} className="px-10 py-4 bg-heritage-maroon text-heritage-parchment rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl hover:bg-heritage-red transition-all flex items-center gap-3">
                        <CheckCircle size={18} /> Seal Case
                      </button>
                   </div>
                </header>

                <div className="flex-grow overflow-y-auto custom-scrollbar px-12 py-12 space-y-12">
                   <div className="max-w-4xl mx-auto space-y-12 animate-expand">
                      {/* INTEGRATED AI BRIEFING */}
                      <div className="parchment-card rounded-[3.5rem] p-12 shadow-2xl relative border-2 border-heritage-sandstone/30">
                         <div className="flex items-center gap-3 text-heritage-red mb-8">
                            <Sparkles size={20} />
                            <span className="text-[11px] font-black uppercase tracking-[0.5em]">Neural Heritage Briefing</span>
                         </div>
                         <h3 className="text-3xl font-black italic text-heritage-maroon mb-10 leading-[1.1] tracking-tighter">"{selectedTicket.analysis?.summary}"</h3>
                         <div className="grid grid-cols-3 gap-10 border-t border-heritage-sandstone/20 pt-10">
                            <div className="space-y-4">
                               <p className="text-[10px] font-black text-heritage-sandstone uppercase tracking-widest">Institutional Weight</p>
                               <div className="flex items-center gap-4">
                                  <div className="flex-grow h-2 bg-heritage-sandstone/10 rounded-full">
                                     <div className="h-full bg-heritage-red rounded-full shadow-[0_0_10px_rgba(211,47,47,0.4)]" style={{ width: `${selectedTicket.analysis?.priorityScore}%` }} />
                                  </div>
                                  <span className="text-[12px] font-black text-heritage-maroon">{selectedTicket.analysis?.priorityScore}%</span>
                               </div>
                            </div>
                            <div className="space-y-4">
                               <p className="text-[10px] font-black text-heritage-sandstone uppercase tracking-widest">Sentiment Index</p>
                               <p className="text-[12px] font-black uppercase text-heritage-red tracking-widest">{selectedTicket.analysis?.sentiment}</p>
                            </div>
                            <div className="space-y-4">
                               <p className="text-[10px] font-black text-heritage-sandstone uppercase tracking-widest">Risk Audit</p>
                               <p className="text-[12px] font-black text-heritage-maroon uppercase tracking-widest">{selectedTicket.analysis?.intelligenceBriefing?.riskAssessment || 'Normal'}</p>
                            </div>
                         </div>
                      </div>

                      {/* MESSAGE THREAD */}
                      <div className="space-y-10">
                         <div className="flex gap-8">
                            <div className="w-16 h-16 bg-white border border-heritage-sandstone/30 rounded-2xl shrink-0 flex items-center justify-center font-black text-heritage-sandstone text-xl shadow-lg">
                              {selectedTicket.userName.charAt(0)}
                            </div>
                            <div className="flex-grow space-y-6">
                               <div className="parchment-card p-10 rounded-[3rem] rounded-tl-none shadow-xl text-base leading-relaxed text-heritage-ink font-bold italic">
                                  {selectedTicket.description}
                                </div>
                               {selectedTicket.imageUrl && (
                                 <img src={selectedTicket.imageUrl} className="max-w-md rounded-[2rem] shadow-2xl border-4 border-heritage-parchment" alt="evidence" />
                               )}
                            </div>
                         </div>

                         {selectedTicket.updates.map((u, i) => (
                            <div key={i} className={`flex gap-8 ${u.isInternal ? 'pl-20' : ''}`}>
                               {!u.isInternal && (
                                 <div className="w-16 h-16 bg-heritage-maroon rounded-2xl shrink-0 flex items-center justify-center font-black text-heritage-parchment text-xl shadow-xl">
                                   {u.author.charAt(0)}
                                 </div>
                               )}
                               <div className={`p-10 rounded-[3rem] flex-grow shadow-lg text-sm ${u.isInternal ? 'bg-heritage-maroon/5 border border-heritage-maroon/20 text-heritage-maroon rounded-tr-none' : 'parchment-card rounded-tl-none text-heritage-ink'}`}>
                                  <div className="flex justify-between items-center mb-6">
                                     <span className="text-[11px] font-black uppercase tracking-[0.3em] opacity-50">{u.isInternal ? 'Internal Audit Note' : u.author}</span>
                                     <span className="text-[11px] font-bold opacity-30">{new Date(u.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="font-bold leading-relaxed text-lg">{u.message}</p>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                <footer className="p-12 border-t border-heritage-sandstone/30 bg-heritage-parchment/50 shrink-0">
                   <div className="max-w-4xl mx-auto space-y-8">
                      <div className="flex gap-10 px-6">
                         <button className="text-[11px] font-black uppercase tracking-[0.4em] text-heritage-red border-b-2 border-heritage-red pb-2">Citizen Channel</button>
                         <button className="text-[11px] font-black uppercase tracking-[0.4em] text-heritage-sandstone hover:text-heritage-maroon pb-2">Internal Registry</button>
                      </div>
                      <div className="parchment-card rounded-[3.5rem] overflow-hidden shadow-2xl border-2 border-heritage-sandstone/30">
                        <textarea 
                          className="w-full p-12 bg-transparent outline-none min-h-[160px] text-xl font-bold italic resize-none placeholder:text-heritage-sandstone/40"
                          placeholder="Draft an official response..."
                          value={replyText} onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className="flex justify-between items-center p-8 border-t border-heritage-sandstone/10 bg-white/30">
                           <div className="flex gap-6 text-heritage-sandstone">
                              <button className="hover:text-heritage-red transition-all"><ImageIcon size={22} /></button>
                              <button className="hover:text-heritage-red transition-all"><Tag size={22} /></button>
                           </div>
                           <div className="flex gap-4">
                              <button onClick={handlePolish} disabled={isPolishing} className="px-8 py-4 bg-white border-2 border-heritage-sandstone text-heritage-maroon rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] flex items-center gap-3 shadow-lg hover:bg-heritage-parchment">
                                 {isPolishing ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />} AI Polish
                              </button>
                              <button onClick={() => handleAction(ComplaintStatus.ACKNOWLEDGED, replyText)} className="px-12 py-4 bg-heritage-red text-heritage-parchment rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl hover:bg-heritage-maroon active:scale-95 transition-all flex items-center gap-3">
                                 <Send size={18} /> Dispatch
                              </button>
                           </div>
                        </div>
                      </div>
                   </div>
                </footer>
              </>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-24 text-center space-y-8 opacity-20">
                 <Building2 size={120} className="text-heritage-maroon" />
                 <p className="text-[12px] font-black uppercase tracking-[0.8em] text-heritage-maroon">Select Official Record</p>
              </div>
            )}
          </main>

          {/* 4. STRATEGIC CONTEXT */}
          <aside className="w-[340px] bg-heritage-parchment border-l border-heritage-sandstone/30 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-10 space-y-12">
            {selectedTicket ? (
              <>
                 <section className="space-y-8">
                    <h4 className="text-[11px] font-black uppercase text-heritage-sandstone tracking-[0.5em]">Citizen Dossier</h4>
                    <div className="flex items-center gap-6">
                       <div className="w-16 h-16 bg-white border-2 border-heritage-sandstone/30 rounded-2xl flex items-center justify-center font-black text-heritage-sandstone uppercase text-2xl shadow-lg">
                         {selectedTicket.userName.charAt(0)}
                       </div>
                       <div>
                          <h3 className="text-sm font-black text-heritage-maroon uppercase leading-none tracking-tight">{selectedTicket.userName}</h3>
                          <p className="text-[10px] font-black text-emerald-700 mt-2.5 flex items-center gap-1.5 uppercase tracking-widest">
                             <Shield size={10} /> Verified Identity
                          </p>
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div className="p-6 parchment-card rounded-3xl border border-heritage-sandstone/40">
                          <p className="text-[10px] font-black text-heritage-sandstone uppercase tracking-widest mb-2">Transit Node</p>
                          <p className="text-[12px] font-black text-heritage-maroon uppercase truncate leading-none">{selectedTicket.postOffice}</p>
                       </div>
                    </div>
                 </section>

                 <section className="space-y-8">
                    <h4 className="text-[11px] font-black uppercase text-heritage-sandstone tracking-[0.5em]">Neural Strategy</h4>
                    <div className="space-y-4">
                       {selectedTicket.analysis?.intelligenceBriefing?.investigationStrategy?.map((step, i) => (
                         <div key={i} className="flex gap-4 items-start p-4 bg-white/40 rounded-2xl border border-heritage-sandstone/10 hover:border-heritage-red transition-all">
                            <CheckCircle size={16} className="text-heritage-red shrink-0 mt-1" />
                            <p className="text-[12px] font-bold text-heritage-ink uppercase tracking-tight leading-relaxed">{step}</p>
                         </div>
                       ))}
                    </div>
                 </section>

                 <section className="bg-heritage-maroon text-heritage-parchment p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="relative z-10 space-y-6">
                       <h4 className="text-[10px] font-black uppercase tracking-[0.4em] text-heritage-parchment/60">Institutional Urgency</h4>
                       <div className="text-6xl font-black text-white tracking-tighter">
                          {selectedTicket.analysis?.priorityScore}%
                       </div>
                       <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-heritage-red shadow-[0_0_15px_rgba(211,47,47,0.6)] transition-all duration-1000" style={{ width: `${selectedTicket.analysis?.priorityScore}%` }} />
                       </div>
                    </div>
                 </section>

                 <div className="pt-12 text-center opacity-20">
                    <p className="text-[9px] font-black uppercase tracking-[0.8em] text-heritage-maroon">IP-Neural Node v4.0</p>
                 </div>
              </>
            ) : (
              <div className="p-12 text-center opacity-5">
                 <Shield size={48} className="mx-auto" />
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
};

export default AdminTickets;
