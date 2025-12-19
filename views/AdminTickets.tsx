
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
  TrendingDown, Minus
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
      return 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/10 dark:border-red-900/30';
    if (s === 'positive') 
      return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/10 dark:border-emerald-900/30';
    return 'bg-blue-50 text-blue-500 border-blue-100 dark:bg-blue-900/10 dark:border-blue-900/30';
  };

  const getPriorityColor = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-slate-500';
  };

  const DashboardView = () => (
    <div className="p-8 lg:p-12 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white uppercase">Supervisor Hub</h2>
          <div className="flex items-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-indiapost-red animate-pulse" />
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Operational Intelligence Command</p>
          </div>
        </div>
        <button 
          onClick={handleExportReport}
          className="bg-slate-900 dark:bg-white text-white dark:text-black px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:opacity-90 transition-all shadow-md active:scale-95"
        >
          <Download size={14} /> Export System Report
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
        {[
          { label: 'Active Tasks', val: stats.inbox, icon: Inbox, color: 'bg-red-50 text-red-600 dark:bg-red-900/10' },
          { label: 'Avg Speed', val: '2.4h', icon: Timer, color: 'bg-blue-50 text-blue-600 dark:bg-blue-900/10' },
          { label: 'Priority Avg', val: stats.avgPriority, icon: Target, color: 'bg-amber-50 text-amber-600 dark:bg-amber-900/10' },
          { label: 'Resolution', val: `${stats.resolvedRate}%`, icon: TrendingUp, color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/10' }
        ].map((kpi, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between hover:border-slate-300 transition-colors">
            <div className={`${kpi.color} w-10 h-10 rounded-xl flex items-center justify-center mb-4`}>
              <kpi.icon size={18} />
            </div>
            <div>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{kpi.label}</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">{kpi.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                <Globe size={14} /> Regional Stress Points
              </h3>
              <button className="text-[9px] font-black uppercase text-blue-500 hover:underline">View Map</button>
           </div>
           <div className="space-y-6">
              {['Mumbai NSH', 'Delhi Air Hub', 'Kolkata Central', 'Chennai GPO'].map((loc, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 uppercase">{loc}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase">{Math.floor(Math.random() * 100)} cases</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indiapost-red rounded-full transition-all duration-1000" style={{ width: `${Math.random() * 70 + 30}%` }} />
                  </div>
                </div>
              ))}
           </div>
        </div>
        
        <div className="lg:col-span-5 bg-slate-900 text-white p-8 rounded-[2rem] border border-slate-800 shadow-xl overflow-hidden relative">
           <div className="relative z-10">
              <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-8 flex items-center gap-2">
                <Zap size={14} className="text-indiapost-red" /> Live Grievance Feed
              </h3>
              <div className="space-y-4">
                {complaints.slice(0, 3).map((c, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all cursor-pointer border border-white/5">
                    <div className="w-8 h-8 rounded-lg bg-indiapost-red/20 text-indiapost-red flex items-center justify-center font-black text-xs">
                      {c.userName.charAt(0)}
                    </div>
                    <div className="flex-grow min-w-0">
                      <p className="text-[10px] font-black uppercase truncate text-white">#{c.id} — {c.userName}</p>
                      <p className="text-[9px] text-slate-400 truncate mt-0.5">{c.description}</p>
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
    <div className="flex h-screen -m-8 bg-[#F8FAFC] dark:bg-black overflow-hidden">
      
      {/* 1. PRIMARY SIDEBAR */}
      <aside className="w-16 bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col items-center py-8 shrink-0">
        <div className="w-10 h-10 bg-indiapost-red rounded-xl flex items-center justify-center text-white mb-10 shadow-lg shadow-red-500/20">
          <Mail size={20} />
        </div>
        <nav className="flex-grow space-y-6">
          {[
            { id: 'dashboard', icon: LayoutGrid, label: 'Hub' },
            { id: 'inbox', icon: Inbox, label: 'Tickets' },
            { id: 'unassigned', icon: Layers, label: 'Triage' },
            { id: 'all', icon: FileText, label: 'Archive' }
          ].map(item => (
            <button 
              key={item.id}
              onClick={() => setCurrentView(item.id as ViewFilter)}
              className={`p-3 rounded-xl transition-all ${currentView === item.id ? 'bg-slate-900 text-white dark:bg-white dark:text-black shadow-lg scale-105' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
              title={item.label}
            >
              <item.icon size={20} />
            </button>
          ))}
        </nav>
        <button className="p-3 text-slate-300 hover:text-slate-600"><Settings size={20} /></button>
      </aside>

      {currentView === 'dashboard' ? (
        <main className="flex-grow overflow-y-auto custom-scrollbar">
          <DashboardView />
        </main>
      ) : (
        <>
          {/* 2. THREAD LIST */}
          <aside className="w-[360px] bg-white dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0">
            <div className="p-6 border-b border-slate-100 dark:border-slate-900 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{currentView} Queue</h2>
                <span className="bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full text-[10px] font-black">{filtered.length}</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                <input 
                  type="text" placeholder="Filter grievances..." 
                  className="w-full pl-9 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-slate-200 transition-all font-medium"
                  value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-3">
               {filtered.map(ticket => (
                 <div 
                   key={ticket.id}
                   onClick={() => setSelectedId(ticket.id)}
                   className={`p-5 rounded-2xl cursor-pointer transition-all relative border flex flex-col gap-3 ${selectedId === ticket.id ? 'bg-[#F0F7FF] dark:bg-blue-900/10 border-blue-200 dark:border-blue-800/50 shadow-sm' : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/40'}`}
                 >
                    {selectedId === ticket.id && <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-indiapost-red rounded-r-full" />}
                    
                    {/* Top Row: User + Tracking */}
                    <div className="flex justify-between items-start">
                      <div className="min-w-0">
                        <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate block leading-none mb-1">{ticket.userName}</span>
                        <div className="flex items-center gap-1.5">
                           <Fingerprint size={10} className="text-slate-300" />
                           <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">{ticket.trackingNumber || ticket.id}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                         <div className={`text-xl font-black ${getPriorityColor(ticket.analysis?.priorityScore)}`}>
                           {ticket.analysis?.priorityScore || 0}
                         </div>
                         <span className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Priority</span>
                      </div>
                    </div>

                    {/* Meta Row: Category & Sentiment */}
                    <div className="flex flex-wrap gap-2">
                       <div className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 max-w-[140px] truncate">
                          <Tag size={10} className="text-slate-400" />
                          <span className="text-[9px] font-black uppercase text-slate-600 dark:text-slate-400 truncate">{ticket.analysis?.category || "General"}</span>
                       </div>
                       <div className={`px-2 py-1 rounded-lg border flex items-center gap-1.5 ${getSentimentStyles(ticket.analysis?.sentiment)}`}>
                          <Activity size={10} />
                          <span className="text-[9px] font-black uppercase">{ticket.analysis?.sentiment || "Neutral"}</span>
                       </div>
                    </div>

                    {/* Snippet Row */}
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2 font-medium leading-relaxed bg-slate-50/50 dark:bg-black/20 p-2 rounded-lg">
                      {ticket.description}
                    </p>

                    <div className="flex justify-between items-center pt-2 mt-1 border-t border-slate-50 dark:border-slate-900">
                       <div className="flex items-center gap-1 text-slate-400">
                          <Clock size={10} />
                          <span className="text-[8px] font-bold uppercase">{new Date(ticket.lastActivityAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${ticket.status === 'CLOSED' ? 'bg-green-100 text-green-700' : 'bg-indiapost-red/10 text-indiapost-red'}`}>
                            {ticket.status}
                          </span>
                          <ChevronRight size={12} className={selectedId === ticket.id ? 'text-indiapost-red translate-x-1 transition-transform' : 'text-slate-200'} />
                       </div>
                    </div>
                 </div>
               ))}
            </div>
          </aside>

          {/* 3. WORKSPACE */}
          <main className="flex-grow flex flex-col min-w-0 bg-white dark:bg-black">
            {selectedTicket ? (
              <>
                <header className="px-8 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white/80 dark:bg-black/80 backdrop-blur-md sticky top-0 z-10">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-slate-500 text-xs">
                        {selectedTicket.userName.charAt(0)}
                      </div>
                      <div>
                        <h2 className="text-xs font-black uppercase text-slate-900 dark:text-white">
                          {selectedTicket.userName} <span className="text-slate-300 mx-2">|</span> <span className="text-indiapost-red">#{selectedTicket.id}</span>
                        </h2>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-900 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">{selectedTicket.analysis?.category}</span>
                          <span className="text-[8px] font-bold text-emerald-500 uppercase flex items-center gap-1"><Shield size={10} /> Verified</span>
                        </div>
                      </div>
                   </div>
                   <div className="flex items-center gap-2">
                      <button className="p-2 text-slate-400 hover:text-slate-900 rounded-lg"><History size={18} /></button>
                      <button onClick={() => handleAction(ComplaintStatus.CLOSED, "Grievance marked as resolved by officer.")} className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-black rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:scale-105 transition-all flex items-center gap-2">
                        <CheckCircle size={14} /> Resolve
                      </button>
                   </div>
                </header>

                <div className="flex-grow overflow-y-auto custom-scrollbar px-8 py-8 space-y-8 bg-slate-50/30 dark:bg-slate-950/20">
                   <div className="max-w-4xl mx-auto space-y-8">
                      {/* INTEGRATED AI BRIEFING */}
                      <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-6 relative">
                         <div className="flex items-center gap-2 text-indiapost-red mb-4">
                            <Sparkles size={14} />
                            <span className="text-[9px] font-black uppercase tracking-widest">Architect Intel</span>
                         </div>
                         <h3 className="text-lg font-bold italic text-slate-900 dark:text-white mb-6 leading-snug">"{selectedTicket.analysis?.summary}"</h3>
                         <div className="grid grid-cols-3 gap-4 border-t border-slate-50 dark:border-slate-800 pt-6">
                            <div className="space-y-1">
                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Urgency</p>
                               <div className="flex items-center gap-2">
                                  <div className="flex-grow h-1 bg-slate-100 dark:bg-slate-800 rounded-full">
                                     <div className="h-full bg-indiapost-red rounded-full" style={{ width: `${selectedTicket.analysis?.priorityScore}%` }} />
                                  </div>
                                  <span className="text-[10px] font-black">{selectedTicket.analysis?.priorityScore}%</span>
                               </div>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Sentiment</p>
                               <p className={`text-[10px] font-black uppercase ${getPriorityColor(selectedTicket.analysis?.priorityScore)}`}>{selectedTicket.analysis?.sentiment}</p>
                            </div>
                            <div className="space-y-1">
                               <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Audit</p>
                               <p className="text-[10px] font-bold text-slate-500 uppercase">{selectedTicket.analysis?.intelligenceBriefing?.riskAssessment || 'Normal'} Risk</p>
                            </div>
                         </div>
                      </div>

                      {/* MESSAGE THREAD */}
                      <div className="space-y-6">
                         <div className="flex gap-4">
                            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0 flex items-center justify-center font-bold text-slate-400 text-xs">
                              {selectedTicket.userName.charAt(0)}
                            </div>
                            <div className="flex-grow space-y-4">
                               <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl rounded-tl-none shadow-sm border border-slate-100 dark:border-slate-800 text-xs leading-relaxed text-slate-700 dark:text-slate-300 font-medium">
                                  {selectedTicket.description}
                               </div>
                               {selectedTicket.imageUrl && (
                                 <img src={selectedTicket.imageUrl} className="max-w-xs rounded-2xl shadow-lg border border-slate-100 dark:border-slate-800" alt="evidence" />
                               )}
                            </div>
                         </div>

                         {selectedTicket.updates.map((u, i) => (
                            <div key={i} className={`flex gap-4 ${u.isInternal ? 'pl-12' : ''}`}>
                               {!u.isInternal && (
                                 <div className="w-10 h-10 bg-slate-900 rounded-xl shrink-0 flex items-center justify-center font-bold text-white text-xs">
                                   {u.author.charAt(0)}
                                 </div>
                               )}
                               <div className={`p-6 rounded-3xl flex-grow shadow-sm text-xs ${u.isInternal ? 'bg-amber-50/40 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 text-amber-900 dark:text-amber-200 rounded-tr-none' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-tl-none text-slate-700 dark:text-slate-300'}`}>
                                  <div className="flex justify-between items-center mb-3">
                                     <span className="text-[8px] font-black uppercase tracking-widest opacity-40">{u.isInternal ? 'Internal Note' : u.author}</span>
                                     <span className="text-[8px] font-bold opacity-30">{new Date(u.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="font-medium leading-relaxed">{u.message}</p>
                               </div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>

                <footer className="p-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shrink-0">
                   <div className="max-w-4xl mx-auto space-y-4">
                      <div className="flex gap-6 px-4">
                         <button className="text-[9px] font-black uppercase tracking-widest text-indiapost-red border-b border-indiapost-red pb-1">Citizen Channel</button>
                         <button className="text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 pb-1">Internal Log</button>
                      </div>
                      <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-inner">
                        <textarea 
                          className="w-full p-6 bg-transparent outline-none min-h-[100px] text-sm font-medium resize-none placeholder:text-slate-300"
                          placeholder="Craft a response..."
                          value={replyText} onChange={(e) => setReplyText(e.target.value)}
                        />
                        <div className="flex justify-between items-center p-4 border-t border-slate-100 dark:border-slate-800">
                           <div className="flex gap-4 text-slate-300">
                              <button className="hover:text-slate-600 transition-colors"><ImageIcon size={18} /></button>
                              <button className="hover:text-slate-600 transition-colors"><Tag size={18} /></button>
                           </div>
                           <div className="flex gap-2">
                              <button onClick={handlePolish} disabled={isPolishing} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-[8px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
                                 {isPolishing ? <Loader2 className="animate-spin" size={12} /> : <Zap size={12} />} AI Polish
                              </button>
                              <button onClick={() => handleAction(ComplaintStatus.ACKNOWLEDGED, replyText)} className="px-6 py-2 bg-indiapost-red text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20 active:scale-95 transition-all flex items-center gap-2">
                                 <Send size={12} /> Dispatch
                              </button>
                           </div>
                        </div>
                      </div>
                   </div>
                </footer>
              </>
            ) : (
              <div className="flex-grow flex flex-col items-center justify-center p-12 text-center space-y-4 opacity-30">
                 <Mail size={48} />
                 <p className="text-[10px] font-black uppercase tracking-widest">Select a grievance to manage</p>
              </div>
            )}
          </main>

          {/* 4. STRATEGIC CONTEXT */}
          <aside className="w-[320px] bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 overflow-y-auto custom-scrollbar p-8 space-y-10">
            {selectedTicket ? (
              <>
                 <section className="space-y-6">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Citizen Intel</h4>
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-xl flex items-center justify-center font-black text-slate-300 uppercase border border-slate-100 dark:border-slate-800">
                         {selectedTicket.userName.charAt(0)}
                       </div>
                       <div>
                          <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase leading-none">{selectedTicket.userName}</h3>
                          <p className="text-[8px] font-bold text-emerald-500 mt-1.5 flex items-center gap-1 uppercase">
                             <Shield size={8} /> Verified Hub
                          </p>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Routing Office</p>
                          <p className="text-[10px] font-black text-slate-900 dark:text-white uppercase truncate">{selectedTicket.postOffice}</p>
                       </div>
                    </div>
                 </section>

                 <section className="space-y-6">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Proposed Protocol</h4>
                    <div className="space-y-3">
                       {selectedTicket.analysis?.intelligenceBriefing?.investigationStrategy?.map((step, i) => (
                         <div key={i} className="flex gap-3 items-start p-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-transparent hover:border-slate-100 transition-all">
                            <CheckCircle size={12} className="text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-medium text-slate-600 dark:text-slate-400 leading-tight">{step}</p>
                         </div>
                       ))}
                    </div>
                 </section>

                 <section className="bg-slate-900 text-white p-6 rounded-[2rem] shadow-xl relative overflow-hidden group">
                    <div className="relative z-10 space-y-4">
                       <h4 className="text-[8px] font-black uppercase tracking-widest text-slate-400">System Priority</h4>
                       <div className="text-4xl font-black text-white tracking-tighter">
                          {selectedTicket.analysis?.priorityScore}%
                       </div>
                       <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full bg-indiapost-red shadow-[0_0_8px_rgba(209,33,40,0.5)] transition-all duration-1000" style={{ width: `${selectedTicket.analysis?.priorityScore}%` }} />
                       </div>
                    </div>
                 </section>

                 <div className="pt-8 text-center opacity-20">
                    <p className="text-[7px] font-black uppercase tracking-[0.4em]">Neural Node India Post v4.0</p>
                 </div>
              </>
            ) : (
              <div className="p-12 text-center opacity-5">
                 <Shield size={32} className="mx-auto" />
              </div>
            )}
          </aside>
        </>
      )}
    </div>
  );
};

export default AdminTickets;
