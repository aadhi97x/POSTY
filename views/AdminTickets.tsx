
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
  ImageIcon, Download, ChevronRight, ChevronDown,
  Filter, Info, ListChecks, Activity, MessageCircle,
  AlertOctagon, History, Shield, Tag, Timer, Users,
  UserCheck, Layers, FileText, BarChart3, Fingerprint,
  TrendingDown, Minus, Building2, MoreHorizontal, MapPin
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
  const [isAiExpanded, setIsAiExpanded] = useState(false);

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
    try {
      const polished = await polishDraft(replyText);
      if (polished) setReplyText(polished);
    } catch (e) {
      console.error("Polish failed", e);
    } finally {
      setIsPolishing(false);
    }
  };

  const handleExportReport = () => {
    const headers = ["ID", "Citizen Name", "Tracking Number", "Status", "Category", "Priority", "Sentiment", "Post Office", "Date Reported", "Description"];
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
    link.setAttribute("download", `POSTY_Grievance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSentimentStyles = (sentiment: string) => {
    const s = sentiment?.toLowerCase();
    if (s === 'negative' || s === 'angry' || s === 'frustrated' || s === 'desperate') 
      return 'bg-red-50 text-heritage-red border-red-100';
    if (s === 'positive') 
      return 'bg-emerald-50 text-emerald-600 border-emerald-100';
    return 'bg-slate-50 text-slate-500 border-slate-100';
  };

  const getContextSuggestions = (ticket: Complaint) => {
    const cat = ticket.analysis?.category || 'General';
    const base = [
      "We are investigating the delay at the processing hub.",
      "Please provide the original booking receipt for verification.",
      "The item is currently being redirected to the correct destination."
    ];
    
    if (cat.includes('Delay')) return ["I have expedited this to the NSH manager.", "Your parcel is expected to reach by tomorrow evening.", ...base];
    if (cat.includes('Lost')) return ["We are checking the CCTV logs at the last known node.", "Please file a formal claim for indemnity.", ...base];
    return base;
  };

  const DashboardView = () => (
    <div className="p-8 space-y-8 animate-expand w-full h-full overflow-y-auto custom-scrollbar">
      {/* Smaller Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-heritage-maroon/5 p-8 rounded-[2rem] border border-heritage-sandstone/20">
        <div>
          <h2 className="text-3xl font-black tracking-tighter text-heritage-maroon uppercase italic leading-none">Supervisor Hub</h2>
          <div className="flex items-center gap-2 mt-3">
            <div className="w-1.5 h-1.5 rounded-full bg-heritage-red animate-pulse" />
            <p className="text-[9px] font-black text-heritage-sandstone uppercase tracking-[0.4em]">Command Intelligence Terminal</p>
          </div>
        </div>
        <button 
          onClick={handleExportReport}
          className="bg-heritage-maroon text-heritage-parchment px-8 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-heritage-red transition-all shadow-lg active:scale-95"
        >
          <Download size={16} /> Export Report
        </button>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Tasks', val: stats.inbox, icon: Inbox, color: 'text-heritage-red' },
          { label: 'Avg Speed', val: '2.4h', icon: Timer, color: 'text-heritage-maroon' },
          { label: 'Priority Avg', val: stats.avgPriority, icon: Target, color: 'text-heritage-red' },
          { label: 'Resolution', val: `${stats.resolvedRate}%`, icon: TrendingUp, color: 'text-emerald-700' }
        ].map((kpi, i) => (
          <div key={i} className="parchment-card p-6 rounded-[2.5rem] shadow-md flex flex-col justify-between hover:scale-105 transition-all">
            <div className={`${kpi.color} mb-4`}>
              <kpi.icon size={24} />
            </div>
            <div>
              <p className="text-[9px] font-black text-heritage-sandstone uppercase tracking-widest mb-1">{kpi.label}</p>
              <p className="text-3xl font-black text-heritage-maroon">{kpi.val}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-7 parchment-card p-8 rounded-[3rem] shadow-lg">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-[10px] font-black uppercase text-heritage-maroon tracking-[0.3em] flex items-center gap-3">
                <Globe size={16} /> Node Pressures
              </h3>
              <button className="text-[9px] font-black uppercase text-heritage-red hover:underline italic">Live Data</button>
           </div>
           <div className="space-y-6">
              {['Mumbai GPO', 'Delhi Central', 'Kolkata Hub', 'Chennai Air'].map((loc, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-heritage-maroon uppercase tracking-tight">{loc}</span>
                    <span className="text-[9px] font-bold text-heritage-sandstone uppercase">{Math.floor(Math.random() * 100)} Cases</span>
                  </div>
                  <div className="h-1.5 bg-heritage-sandstone/10 rounded-full overflow-hidden">
                    <div className="h-full bg-heritage-red rounded-full transition-all duration-1000" style={{ width: `${Math.random() * 70 + 30}%` }} />
                  </div>
                </div>
              ))}
           </div>
        </div>
        
        <div className="lg:col-span-5 bg-heritage-maroon text-heritage-parchment p-8 rounded-[3rem] shadow-xl relative overflow-hidden">
           <div className="absolute inset-0 opacity-5 pointer-events-none">
              <Building2 size={240} className="translate-x-12 translate-y-12" />
           </div>
           <div className="relative z-10">
              <h3 className="text-[12px] font-black uppercase text-heritage-parchment/60 tracking-[0.3em] mb-8 flex items-center gap-3">
                <Zap size={16} className="text-heritage-parchment" /> Operational Feed
              </h3>
              <div className="space-y-4">
                {complaints.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer border border-white/10">
                    <div className="w-8 h-8 rounded-xl bg-white/10 text-white flex items-center justify-center font-black text-xs">
                      {c.userName.charAt(0)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[10px] font-black uppercase truncate text-white">#{c.id} — {c.userName}</p>
                      <p className="text-[9px] text-white/50 truncate mt-0.5 italic">{c.description}</p>
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
    <div className="flex h-[calc(100vh-20rem)] -mt-16 -mb-16 -mx-6 bg-white pillar-shadow overflow-hidden relative border-x border-heritage-sandstone/20">
      
      {/* 1. PRIMARY SIDEBAR - CENTERED ICONS */}
      <aside className="w-16 bg-heritage-parchment border-r border-heritage-sandstone/30 flex flex-col items-center justify-center py-6 shrink-0 shadow-sm z-20">
        <div className="absolute top-6 w-10 h-10 bg-heritage-maroon rounded-xl flex items-center justify-center text-heritage-parchment shadow-lg">
          <Building2 size={18} />
        </div>
        <nav className="flex flex-col items-center gap-6">
          {[
            { id: 'dashboard', icon: LayoutGrid, label: 'Control' },
            { id: 'inbox', icon: Inbox, label: 'Grievance' },
            { id: 'unassigned', icon: Layers, label: 'Triage' },
            { id: 'all', icon: FileText, label: 'Archive' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewFilter)}
              className={`p-3 rounded-xl transition-all relative group ${currentView === item.id ? 'bg-heritage-maroon text-heritage-parchment shadow-md' : 'text-heritage-sandstone hover:text-heritage-red'}`}
            >
              <item.icon size={18} />
              <div className="absolute left-full ml-4 px-2 py-1 bg-heritage-ink text-white text-[10px] font-black uppercase tracking-widest rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </div>
            </button>
          ))}
        </nav>
        <button className="absolute bottom-6 p-3 text-heritage-sandstone hover:text-heritage-maroon transition-colors"><Settings size={18} /></button>
      </aside>

      {currentView === 'dashboard' ? (
        <main className="flex-grow overflow-hidden bg-white">
          <DashboardView />
        </main>
      ) : (
        <>
          {/* 2. REFINED TICKET LIST - WIDER SECTION */}
          <aside className="w-[380px] bg-white border-r border-slate-100 flex flex-col shrink-0 z-10">
            <div className="p-6 border-b border-slate-100 bg-slate-50/30">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">{currentView} Queue</h2>
                <div className="px-2 py-0.5 bg-slate-200 text-slate-600 rounded-md text-[9px] font-black">{filtered.length}</div>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                <input 
                  type="text" placeholder="Quick search..." 
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-[11px] outline-none focus:border-heritage-red transition-all font-bold"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-2 bg-slate-50/20">
               {filtered.map(ticket => (
                 <div 
                   key={ticket.id}
                   onClick={() => setSelectedId(ticket.id)}
                   className={`p-5 rounded-2xl cursor-pointer transition-all border flex flex-col gap-2 relative ${selectedId === ticket.id ? 'bg-white shadow-md border-heritage-red/30' : 'bg-transparent border-transparent hover:bg-white hover:border-slate-200'}`}
                 >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${selectedId === ticket.id ? 'bg-heritage-maroon text-white' : 'bg-slate-100 text-slate-400'}`}>
                           {ticket.userName.charAt(0)}
                         </div>
                         <div className="min-w-0">
                           <span className="text-[12px] font-black text-heritage-maroon uppercase truncate block leading-none">{ticket.userName}</span>
                           <span className="text-[9px] font-bold text-slate-400 uppercase mt-1.5 block">#{ticket.id}</span>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-sm font-black text-heritage-red leading-none">{ticket.analysis?.priorityScore || 0}</div>
                         <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest block mt-0.5">Priority</span>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium line-clamp-1 leading-normal px-0.5 italic mt-1">{ticket.description}</p>
                 </div>
               ))}
            </div>
          </aside>

          {/* 3. CLEANER WORKSPACE - WIDER MAX WIDTH */}
          <main className="flex-grow flex flex-col min-w-0 bg-white">
            {selectedTicket ? (
              <>
                <header className="px-8 py-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white z-10">
                   <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-heritage-maroon text-heritage-parchment flex items-center justify-center font-black text-lg">
                        {selectedTicket.userName.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                           <h2 className="text-[14px] font-black uppercase text-heritage-maroon">{selectedTicket.userName}</h2>
                           <span className="text-[9px] font-black text-heritage-red bg-red-50 px-2 py-0.5 rounded border border-red-100 uppercase">#{selectedTicket.id}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><MapPin size={9} /> {selectedTicket.postOffice}</span>
                        </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <button 
                        disabled={selectedTicket.status === ComplaintStatus.CLOSED}
                        onClick={() => handleAction(ComplaintStatus.CLOSED, "Grievance marked as resolved by officer.")} 
                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md transition-all flex items-center gap-2 ${selectedTicket.status === ComplaintStatus.CLOSED ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-heritage-maroon text-heritage-parchment hover:bg-heritage-red'}`}
                      >
                        <CheckCircle size={14} /> {selectedTicket.status === ComplaintStatus.CLOSED ? 'Resolved' : 'Resolve'}
                      </button>
                   </div>
                </header>

                <div className="flex-grow overflow-y-auto custom-scrollbar px-8 py-8 space-y-6 bg-slate-50/30">
                   <div className="max-w-5xl mx-auto space-y-8">
                      
                      {/* COMPACT AI STRIP - EXPANDABLE */}
                      <div 
                        onClick={() => setIsAiExpanded(!isAiExpanded)}
                        className="bg-white rounded-3xl shadow-sm border border-slate-200 cursor-pointer overflow-hidden transition-all duration-300"
                      >
                         <div className="p-5 flex items-center justify-between gap-8">
                            <div className="flex-grow min-w-0">
                               <div className="flex items-center gap-1.5 text-heritage-red mb-2">
                                  <Sparkles size={12} />
                                  <span className="text-[9px] font-black uppercase tracking-[0.2em]">AI Intelligence (Click to Expand)</span>
                               </div>
                               <p className="text-[13px] font-bold italic text-heritage-maroon truncate leading-none">"{selectedTicket.analysis?.summary}"</p>
                            </div>
                            <div className="flex items-center gap-6 shrink-0 border-l border-slate-100 pl-6">
                               <div className="text-center">
                                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Priority</p>
                                  <p className="text-sm font-black text-heritage-red">{selectedTicket.analysis?.priorityScore}%</p>
                               </div>
                               <div className="text-center">
                                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Sentiment</p>
                                  <p className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded border ${getSentimentStyles(selectedTicket.analysis?.sentiment)}`}>
                                    {selectedTicket.analysis?.sentiment}
                                  </p>
                               </div>
                               <ChevronDown size={16} className={`text-slate-400 transition-transform duration-300 ${isAiExpanded ? 'rotate-180' : ''}`} />
                            </div>
                         </div>
                         
                         {/* SMOOTHER EXPANSION CONTAINER */}
                         <div 
                           className={`overflow-hidden transition-all duration-500 ease-in-out ${isAiExpanded ? 'max-h-[1000px] opacity-100 pb-8' : 'max-h-0 opacity-0'}`}
                         >
                            <div className="px-6 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-8">
                               <div className="grid grid-cols-2 gap-10">
                                  <div>
                                     <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Risk Assessment</h4>
                                     <p className="text-[12px] font-bold text-heritage-maroon leading-relaxed">
                                        {selectedTicket.analysis?.intelligenceBriefing?.riskAssessment || "No risks detected."}
                                     </p>
                                  </div>
                                  <div>
                                     <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Logistics Audit</h4>
                                     <p className="text-[12px] font-bold text-slate-600 leading-relaxed">
                                        {selectedTicket.analysis?.intelligenceBriefing?.logisticsAudit || "Awaiting audit log..."}
                                     </p>
                                  </div>
                               </div>
                               <div>
                                  <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Investigation Strategy</h4>
                                  <ul className="space-y-3">
                                     {selectedTicket.analysis?.intelligenceBriefing?.investigationStrategy?.map((step, i) => (
                                       <li key={i} className="flex gap-3 items-center text-[11px] font-bold text-heritage-ink">
                                          <div className="w-1.5 h-1.5 bg-heritage-red rounded-full" />
                                          {step}
                                       </li>
                                     ))}
                                  </ul>
                               </div>
                            </div>
                         </div>
                      </div>

                      <div className="space-y-8">
                         <div className="flex gap-5 items-start">
                            <div className="w-12 h-12 bg-white border border-slate-100 rounded-xl shrink-0 flex items-center justify-center font-black text-slate-300 text-lg shadow-sm">
                              {selectedTicket.userName.charAt(0)}
                            </div>
                            <div className="flex-grow space-y-3">
                               <div className="bg-heritage-parchment/60 p-6 rounded-3xl rounded-tl-none shadow-sm border border-heritage-sandstone/10 text-[14px] leading-relaxed text-heritage-ink font-bold italic">
                                  {selectedTicket.description}
                                </div>
                               {selectedTicket.imageUrl && (
                                 <div className="relative inline-block mt-3">
                                    <img src={selectedTicket.imageUrl} className="max-w-[320px] rounded-2xl shadow-lg border-4 border-white" alt="evidence" />
                                 </div>
                               )}
                            </div>
                         </div>

                         {selectedTicket.updates.map((u, i) => (
                            <div key={i} className={`flex gap-5 items-start ${u.isInternal ? 'pl-12' : ''}`}>
                               {!u.isInternal && (
                                 <div className="w-12 h-12 bg-heritage-maroon rounded-xl shrink-0 flex items-center justify-center font-black text-heritage-parchment text-lg">
                                   {u.author.charAt(0)}
                                 </div>
                               )}
                               <div className={`p-6 rounded-3xl flex-grow shadow-sm text-[14px] border ${u.isInternal ? 'bg-slate-100/50 border-slate-200 text-slate-600 rounded-tr-none' : 'bg-white border-slate-100 rounded-tl-none text-heritage-ink'}`}>
                                  <div className="flex justify-between items-center mb-3">
                                     <span className="text-[9px] font-black uppercase tracking-widest opacity-50 flex items-center gap-2">
                                        {u.isInternal ? <Shield size={10} /> : <UserCheck size={10} />}
                                        {u.isInternal ? 'Internal Audit' : u.author}
                                     </span>
                                     <span className="text-[9px] font-bold opacity-30">{new Date(u.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="font-bold leading-normal">{u.message}</p>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                <footer className="p-6 border-t border-slate-100 bg-white shrink-0">
                   <div className="max-w-5xl mx-auto space-y-4">
                      
                      {/* SMART AI SUGGESTIONS */}
                      <div className="flex items-center gap-3 overflow-x-auto pb-1 custom-scrollbar no-scrollbar">
                         <div className="shrink-0 text-[9px] font-black text-heritage-sandstone uppercase tracking-widest mr-2 flex items-center gap-1.5"><Zap size={12} /> Smart Drafts:</div>
                         {getContextSuggestions(selectedTicket).map((sugg, i) => (
                           <button 
                             key={i} 
                             onClick={() => setReplyText(sugg)}
                             className="shrink-0 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-[10px] font-bold text-slate-500 hover:border-heritage-red hover:text-heritage-red transition-all whitespace-nowrap"
                           >
                             {sugg.length > 50 ? sugg.substring(0, 50) + '...' : sugg}
                           </button>
                         ))}
                      </div>

                      <div className="bg-slate-50 rounded-[2.5rem] border border-slate-200 focus-within:border-heritage-red transition-all shadow-inner overflow-hidden">
                        <textarea 
                          className="w-full px-8 py-5 bg-transparent outline-none min-h-[80px] text-[14px] font-bold italic resize-none placeholder:text-slate-300"
                          placeholder="Type professional reply..."
                          value={replyText} onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className="flex justify-between items-center px-6 py-3 bg-white/50 border-t border-slate-100">
                           <div className="flex gap-3">
                              <button className="p-2 text-slate-400 hover:text-heritage-red transition-colors"><ImageIcon size={16} /></button>
                              <button className="p-2 text-slate-400 hover:text-heritage-red transition-colors"><Tag size={16} /></button>
                           </div>
                           <div className="flex gap-3">
                              <button onClick={handlePolish} disabled={isPolishing} className="px-4 py-2 bg-white border border-slate-200 text-heritage-maroon rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-50 transition-all">
                                 {isPolishing ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} />} Polish
                              </button>
                              <button onClick={() => handleAction(ComplaintStatus.ACKNOWLEDGED, replyText)} className="px-6 py-2 bg-heritage-red text-heritage-parchment rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-heritage-maroon active:scale-95 transition-all flex items-center gap-2">
                                 <Send size={14} /> Dispatch
                              </button>
                           </div>
                        </div>
                      </div>
                   </div>
                </footer>
              </>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-12 text-center space-y-6 bg-slate-50/10">
                 <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center text-slate-200">
                    <Building2 size={48} />
                 </div>
                 <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-300 italic">Select Ticket to Begin Redressal</p>
              </div>
            )}
          </main>

          {/* 4. CLEANER CONTEXT SIDEBAR */}
          <aside className="w-[280px] bg-white border-l border-slate-100 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-8 space-y-8 z-10">
            {selectedTicket ? (
              <>
                 <section className="space-y-5">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2">
                      <Fingerprint size={12} /> Dossier
                    </h4>
                    <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                       <div className="w-10 h-10 bg-white border border-slate-200 rounded-xl flex items-center justify-center font-black text-slate-400 uppercase text-sm">
                         {selectedTicket.userName.charAt(0)}
                       </div>
                       <div className="min-w-0">
                          <h3 className="text-[12px] font-black text-heritage-maroon uppercase leading-none truncate">{selectedTicket.userName}</h3>
                          <p className="text-[8px] font-black text-emerald-600 mt-2 uppercase flex items-center gap-1.5">
                             <Shield size={9} /> Verified
                          </p>
                       </div>
                    </div>
                 </section>

                 <section className="space-y-5">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.4em] flex items-center gap-2">
                      <Target size={12} /> Strategy
                    </h4>
                    <div className="space-y-3">
                       {selectedTicket.analysis?.intelligenceBriefing?.investigationStrategy?.slice(0, 3).map((step, i) => (
                         <div key={i} className="flex gap-3 items-start p-3 bg-white rounded-2xl border border-slate-100 hover:border-heritage-red transition-all group">
                            <CheckCircle size={12} className="text-slate-200 group-hover:text-heritage-red shrink-0 mt-0.5" />
                            <p className="text-[10px] font-bold text-slate-500 uppercase leading-normal">{step}</p>
                         </div>
                       ))}
                    </div>
                 </section>

                 <div className="pt-8 text-center border-t border-slate-100 mt-auto">
                    <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-200 italic">Dak-Command Node v4.5</p>
                 </div>
              </>
            ) : null}
          </aside>
        </>
      )}
    </div>
  );
};

export default AdminTickets;
