
import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { 
  LogOut, Sun, Moon, Search, UserCircle, Bell, Mic, Mail, Loader2, Sparkles, Building2, MapPin, Globe
} from 'lucide-react';

import { User, Complaint, Notification, ComplaintStatus } from './types';
import Login from './views/Login';
import Dashboard from './views/Dashboard';
import SubmitComplaint from './views/SubmitComplaint';
import TrackStatus from './views/TrackStatus';
import ComplaintMenu from './views/ComplaintMenu';
import AdminTickets from './views/AdminTickets';
import ChatAssistant from './views/ChatAssistant';
import LiveVoiceAssistant from './views/LiveVoiceAssistant';

// --- ROBUST BRAND ASSETS (SVG) ---

export const PostyLogo = ({ className = "h-12" }: { className?: string }) => (
  <svg viewBox="0 0 350 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    {/* Heritage Triangles */}
    <path d="M20 20L80 50L20 80V20Z" fill="#D32F2F" />
    <path d="M40 20L100 50L40 80V20Z" fill="#7B1F1F" opacity="0.6" />
    
    {/* Samarkan Branding */}
    <text 
      x="110" 
      y="70" 
      fill="currentColor" 
      style={{ fontFamily: "'Samarkan', sans-serif" }} 
      className="text-7xl font-normal lowercase tracking-tighter"
    >
      posty
    </text>
  </svg>
);

export const StateEmblem = ({ className = "h-16" }: { className?: string }) => (
  <div className={`flex flex-col items-center justify-center ${className}`}>
    <img 
      src="https://media.discordapp.net/attachments/1440690702530117746/1451736834521567374/imgbin_df4c12dcbe922fb84d8e19becaf0d5a7.png?ex=694742c9&is=6945f149&hm=216234fb9752b13ecb8d71d2e60853bddd73cee167b5486a33212dacc9c358fe&=&format=webp&quality=lossless&width=548&height=930" 
      alt="National Emblem of India" 
      className="h-full object-contain"
    />
  </div>
);

// --- TRANSLATIONS ---

const translations = {
  en: {
    brand_name: "POSTY",
    nav_home: "Home",
    nav_submit: "Register Complaint",
    nav_track: "Track Complaint",
    nav_records: "My Complaints",
    nav_queue: "Task Queue",
    nav_insights: "Statistics",
    helpline: "Customer Care",
    citizen_portal: "CITIZEN SECTION",
    admin_portal: "STAFF LOGIN",
    login_title: "POSTY Help Portal",
    login_subtitle: "AI-Based Complaint Analysis & Automated Response System",
    login_staff: "Department Staff",
    login_citizen: "Citizen Login",
    login_verify: "OTP Verification",
    login_officer: "Officer Login",
    login_phone: "Mobile Number",
    login_otp: "OTP Code",
    login_name: "Full Name",
    login_email: "Email ID",
    login_btn_send: "Get OTP",
    login_btn_verify: "Submit",
    login_btn_account: "Create Profile",
    login_btn_back: "Back",
    welcome: "Welcome",
    smart_redressal: "Heritage Redressal System",
    active_cases: "Pending Requests",
    reg: "File a Complaint",
    reg_sub: "Late delivery, missing items, or counter issues.",
    track: "Track Status",
    track_sub: "Check the current status of your request.",
    hub: "My History",
    hub_sub: "View your previous complaints and their answers.",
    resources: "Helpful Links",
    resources_sub: "Important POSTY services at your fingertips.",
    speed: "Express Mail",
    find: "Branch Finder",
    proceed: "Click to proceed",
    open: "Check Now",
    view: "Open List",
    submit_title: "New Complaint",
    submit_desc: "Describe the Problem",
    submit_branch: "Post Office Branch",
    submit_date: "Date of Incident",
    submit_evidence: "Photo / Receipt (Optional)",
    submit_btn: "Submit Complaint",
    submit_placeholder_desc: "Please explain your problem in simple words. If you have a tracking number, please mention it here.",
    submit_placeholder_branch: "Post office name or Pincode",
    submit_triage: "Processing your request...",
    submit_confirmed: "Complaint submitted successfully!",
    track_title: "Track Your Request",
    track_placeholder: "Enter Ref Number (e.g. PGC-12345)",
    track_search: "Search",
    track_ref: "REF NUMBER",
    track_timeline_reported: "Reported",
    track_timeline_processing: "In Review",
    track_timeline_resolved: "Resolved",
    track_timeline_closed: "Closed",
    track_logs: "History of Action",
    records_title: "Your Complaints",
    records_empty: "No records found",
    records_empty_sub: "You have not filed any complaints yet.",
    records_total: "Total Records",
    records_locate: "Track",
    footer_text: "POSTY - Grievance Redressal Portal",
    footer_subtext: "Official website for handling citizen issues. Ministry of Communications, Government of India.",
    privacy: "Privacy Policy",
    terms: "Terms of Use",
    charter: "Citizen Charter",
    branch_dir: "Directory"
  },
  hi: {
    brand_name: "POSTY",
    nav_home: "मुख्य पृष्ठ",
    nav_submit: "शिकायत दर्ज करें",
    nav_track: "स्थिति जानें",
    nav_records: "मेरी शिकायतें",
    nav_queue: "कार्य सूची",
    nav_insights: "आंकड़े",
    helpline: "कस्टमर केयर",
    citizen_portal: "नागरिक अनुभाग",
    admin_portal: "कर्मचारी लॉगिन",
    login_title: "POSTY हेल्प पोर्टल",
    login_subtitle: "एआई-आधारित शिकायत विश्लेषण और स्वचालित प्रतिक्रिया प्रणाली",
    login_staff: "विभाग कर्मचारी",
    login_citizen: "नागरिक लॉगिन",
    login_verify: "ओटीपी सत्यापन",
    login_officer: "अधिकारी लॉगिन",
    login_phone: "मोबाइल नंबर",
    login_otp: "ओटीपी कोड",
    login_name: "पूरा नाम",
    login_email: "ईमेल आईडी",
    login_btn_send: "ओटीपी प्राप्त करें",
    login_btn_verify: "जमा करें",
    login_btn_account: "प्रोफ़ाइल बनाएं",
    login_btn_back: "पीछे",
    welcome: "स्वागत है",
    smart_redressal: "शिकायत निवारण प्रणाली",
    active_cases: "लंबित अनुरोध",
    reg: "शिकायत दर्ज करें",
    reg_sub: "देरी से वितरण, खोया सामान, या काउंटर समस्या।",
    track: "स्थिति जांचें",
    track_sub: "अपने अनुरोध की वर्तमान स्थिति देखें।",
    hub: "मेरा इतिहास",
    hub_sub: "अपनी पिछली शिकायतों और उनके उत्तर देखें।",
    resources: "सहायక लिंक",
    resources_sub: "POSTY की महत्वपूर्ण सेवाएं आपके हाथ में।",
    speed: "एक्सप्रेस मेल",
    find: "शाखा खोजें",
    proceed: "आगे बढ़ें",
    open: "अभी जांचें",
    view: "सूची खोलें",
    submit_title: "नई शिकायत",
    submit_desc: "समस्या का विवरण",
    submit_branch: "डाकघर शाखा",
    submit_date: "घटना की तारीख",
    submit_evidence: "फोटो / रसीद (वैकल्फिक)",
    submit_btn: "शिकायत जमा करें",
    submit_placeholder_desc: "कृपया अपनी समस्या सरल शब्दों में बताएं। ट्रैकिंग नंबर यहाँ लिखें।",
    submit_placeholder_branch: "डाकघर का नाम या पिनकोड",
    submit_triage: "अनुरोध प्रोसेस हो रहा है...",
    submit_confirmed: "शिकायत सफलतापूर्वक दर्ज की गई!",
    track_title: "अपना अनुरोध ट्रैक करें",
    track_placeholder: "रेफरेंस नंबर लिखें (जैसे PGC-12345)",
    track_search: "खोजें",
    track_ref: "रेफरेंस नंबर",
    track_timeline_reported: "दर्ज की गई",
    track_timeline_processing: "समीक्षा में",
    track_timeline_resolved: "सुलझ गई",
    track_timeline_closed: "बंद",
    track_logs: "कार्रवाई का इतिहास",
    records_title: "आपकी शिकायतें",
    records_empty: "कोई रिकॉर्ड नहीं मिला",
    records_empty_sub: "आपने अभी तक कोई शिकायत दर्ज नहीं की है।",
    records_total: "कुल रिकॉर्ड",
    records_locate: "ट्रैक",
    footer_text: "POSTY - शिकायत निवारण पोर्टल",
    footer_subtext: "नागरिकों की समस्याओं के समाधान के लिए आधिकारिक वेबसाइट। संचार मंत्रालय, भारत सरकार।",
    privacy: "गोपनीयता नीति",
    terms: "उपयोग की शर्तें",
    charter: "नागरिक चार्टर",
    branch_dir: "निर्देशिका"
  },
  ml: {
    brand_name: "POSTY",
    nav_home: "ഹോം",
    nav_submit: "പരാതി നൽകുക",
    nav_track: "പരാതി ട്രാക്ക് ചെയ്യുക",
    nav_records: "എന്റെ പരാതികൾ",
    welcome: "സ്വാഗതം",
    smart_redressal: "പരാതി പരിഹാര സംവിധാനം",
    active_cases: "നിലവിലുള്ള പരാതികൾ",
    reg: "പുതിയ പരാതി",
    reg_sub: "വിതരണത്തിലെ താമസം, നഷ്ടപ്പെട്ട വസ്തുക്കൾ എന്നിവ അറിയിക്കുക.",
    track: "ട്രാക്ക് ചെയ്യുക",
    track_sub: "പരാതിയുടെ നിലവിലെ സ്ഥിതി പരിശോധിക്കുക.",
    hub: "എന്റെ ഹിസ്റ്ററി",
    hub_sub: "നിങ്ങളുടെ മുൻപത്തെ പരാതികൾ കാണുക.",
    resources: "സഹായ ലിങ്കുകൾ",
    resources_sub: "പ്രധാന പോസ്റ്റി സേവനങ്ങൾ.",
    speed: "സ്പീഡ് പോസ്റ്റ്",
    find: "ബ്രാഞ്ച് കണ്ടെത്തുക",
    proceed: "തുടരുക",
    open: "പരിശോധിക്കുക",
    view: "ലിസ്റ്റ് കാണുക",
    submit_title: "പുതിയ പരാതി",
    submit_desc: "പ്രശ്നം വിവരിക്കുക",
    records_title: "നിങ്ങളുടെ പരാതികൾ",
    login_citizen: "സിറ്റിസൺ ലോഗിൻ",
    footer_text: "POSTY - പരാതി പരിഹാര പോർട്ടൽ",
    footer_subtext: "ഇന്ത്യൻ തപാൽ വകുപ്പിന്റെ ഔദ്യോഗിക വെബ്സൈറ്റ്.",
    login_phone: "മൊബൈൽ നമ്പർ",
    login_btn_send: "OTP നേടുക",
    login_verify: "OTP പരിശോധന",
    login_btn_verify: "സമർപ്പിക്കുക"
  },
  te: {
    brand_name: "POSTY",
    nav_home: "హోమ్",
    nav_submit: "ఫిర్యాదు చేయండి",
    nav_track: "ట్రాక్ చేయండి",
    nav_records: "నా ఫిర్యాదులు",
    welcome: "స్వాగతం",
    smart_redressal: "ఫిర్యాదుల పరిష్కార వ్యవస్థ",
    active_cases: "పెండింగ్ అభ్యర్థనలు",
    reg: "ఫిర్యాదును నమోదు చేయండి",
    reg_sub: "డెలివరీ ఆలస్యం లేదా వస్తువులు పోవడం వంటి సమస్యలు.",
    track: "స్టేటస్ చూడండి",
    track_sub: "మీ ఫిర్యాదు ఏ దశలో ఉందో తెలుసుకోండి.",
    hub: "నా చరిత్ర",
    hub_sub: "మీ మునుపటి ఫిర్యాదులను చూడండి.",
    resources: "ముఖ్యమైన లింకులు",
    resources_sub: "ముఖ్యమైన పోస్టీ సేవలు.",
    speed: "స్పీడ్ పోస్ట్",
    find: "బ్రాంచ్ వెతకండి",
    proceed: "కొనసాగండి",
    open: "ఇప్పుడే చూడండి",
    view: "జాబితా చూడండి",
    submit_title: "కొత్త ఫిర్యాదు",
    submit_desc: "సమస్యను వివరించండి",
    records_title: "మీ ఫిర్యాదులు",
    login_citizen: "సిటిజన్ లాగిన్",
    footer_text: "POSTY - ఫిర్యాదుల పరిష్కార పోర్టల్",
    footer_subtext: "భారత ప్రభుత్వ తపాలా శాఖ అధికారిక వెబ్‌సైట్.",
    login_phone: "మొబైల్ నంబర్",
    login_btn_send: "OTP పొందండి",
    login_verify: "OTP ధృవీకరణ",
    login_btn_verify: "సమర్పించు"
  }
};

type Language = 'en' | 'hi' | 'ml' | 'te';
interface LangContextType {
  lang: Language;
  setLang: (l: Language) => void;
  t: any;
}

export const LangContext = createContext<LangContextType>({
  lang: 'en',
  setLang: () => {},
  t: translations.en
});

const OfficialHeader = ({ 
  user, 
  onLogout, 
  onOpenLive
}: { 
  user: User | null, 
  onLogout: () => void, 
  onOpenLive: () => void
}) => {
  const { lang, setLang, t } = useContext(LangContext);
  const [showNotifications, setShowNotifications] = useState(false);

  const langOptions: { value: Language; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'hi', label: 'हिन्दी' },
    { value: 'ml', label: 'മലയാളം' },
    { value: 'te', label: 'తెలుగు' }
  ];

  return (
    <header className="w-full heritage-arch bg-heritage-parchment transition-all relative z-[100] border-b-2 border-heritage-sandstone/50">
      <div className="bg-heritage-maroon text-heritage-parchment py-1.5 px-4 md:px-12 border-b border-heritage-red/30">
        <div className="max-w-7xl mx-auto flex justify-between items-center text-[10px] md:text-xs font-bold uppercase tracking-widest">
          <div className="flex items-center gap-4">
             <span>भारत सरकार • GOVT OF INDIA</span>
          </div>
          <div className="flex items-center gap-6">
            <button onClick={onOpenLive} className="flex items-center gap-1.5 hover:text-white transition-colors">
              <Mic size={12} /> Live Support
            </button>
            <div className="flex items-center gap-2 group relative">
              <Globe size={12} />
              <select 
                value={lang} 
                onChange={(e) => setLang(e.target.value as Language)}
                className="bg-transparent border-none outline-none text-[10px] md:text-xs font-bold uppercase tracking-widest cursor-pointer hover:text-white transition-colors"
              >
                {langOptions.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-heritage-maroon text-white">{opt.label}</option>
                ))}
              </select>
            </div>
            {user && (
              <button onClick={() => setShowNotifications(!showNotifications)} className="hover:text-white transition-colors">
                 <Bell size={14} />
              </button>
            )}
            <Link to="/login" className="hover:text-white flex items-center gap-1.5 transition-colors">
               <UserCircle size={14} /> <span>{user ? user.name : 'Login'}</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="py-10 px-4 md:px-12">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-10">
          <div className="flex items-center gap-8 shrink-0">
            <StateEmblem className="h-32" />
            <div className="h-20 w-px bg-heritage-sandstone"></div>
            <div className="flex flex-col">
              <PostyLogo className="h-16 text-heritage-maroon" />
              <p className="text-[10px] md:text-xs font-black text-heritage-sandstone uppercase tracking-[0.4em] mt-2 italic">Your voice. Your language. Faster resolution.</p>
            </div>
          </div>
        </div>
      </div>

      <nav className="border-t border-heritage-sandstone/30">
        <div className="max-w-7xl mx-auto px-4 md:px-12 flex flex-col md:flex-row items-center justify-between">
          <ul className="flex flex-wrap gap-2 text-[12px] font-black uppercase tracking-widest w-full md:w-auto">
            {user?.role === 'user' ? (
              <>
                <li><Link to="/" className="block py-5 px-6 hover:text-heritage-red transition-all border-b-4 border-transparent hover:border-heritage-red">{t.nav_home}</Link></li>
                <li><Link to="/submit" className="block py-5 px-6 hover:text-heritage-red transition-all border-b-4 border-transparent hover:border-heritage-red">{t.nav_submit}</Link></li>
                <li><Link to="/track" className="block py-5 px-6 hover:text-heritage-red transition-all border-b-4 border-transparent hover:border-heritage-red">{t.nav_track}</Link></li>
                <li><Link to="/menu" className="block py-5 px-6 hover:text-heritage-red transition-all border-b-4 border-transparent hover:border-heritage-red">{t.nav_records}</Link></li>
              </>
            ) : user ? (
              <>
                <li><Link to="/" className="block py-5 px-6 hover:text-heritage-red transition-all border-b-4 border-transparent hover:border-heritage-red">Command Center</Link></li>
              </>
            ) : null}
          </ul>
          {user && (
            <div className="flex items-center gap-6 py-5 md:py-0">
              <div className="text-right">
                <p className="text-[12px] font-black text-heritage-maroon uppercase leading-none">{user.name}</p>
                <p className="text-[9px] font-bold text-heritage-sandstone uppercase tracking-widest mt-1">{user.role}</p>
              </div>
              <button onClick={onLogout} className="text-heritage-sandstone hover:text-heritage-red p-2.5 bg-white/50 rounded-full transition-all border border-heritage-sandstone/30">
                <LogOut size={18} />
              </button>
            </div>
          )}
        </div>
      </nav>
    </header>
  );
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [lang, setLang] = useState<Language>('en');
  const [isLiveOpen, setIsLiveOpen] = useState(false);
  const [isLoadingBackend, setIsLoadingBackend] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const syncComplaints = async () => {
      try {
        const res = await fetch('/api/complaints');
        if (res.ok) {
          const data = await res.json();
          setComplaints(data);
        } else {
          const savedComplaints = localStorage.getItem('complaints');
          if (savedComplaints) setComplaints(JSON.parse(savedComplaints));
        }
      } catch (e) {
        const savedComplaints = localStorage.getItem('complaints');
        if (savedComplaints) setComplaints(JSON.parse(savedComplaints));
      } finally {
        setIsLoadingBackend(false);
      }
    };
    syncComplaints();
  }, []);

  const handleLogin = (newUser: User) => {
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const handleUpdateComplaints = async (updated: Complaint[]) => {
    setComplaints(updated);
    localStorage.setItem('complaints', JSON.stringify(updated));
  };

  const handleUpdateFeedback = async (id: string, rating: number, comment: string) => {
    const timestamp = new Date().toISOString();
    const updated = complaints.map(c => c.id === id ? { ...c, feedback: { rating, comment, timestamp } } : c);
    setComplaints(updated);
    localStorage.setItem('complaints', JSON.stringify(updated));
  };

  const addComplaint = async (newComplaint: Complaint) => {
    const updated = [newComplaint, ...complaints];
    setComplaints(updated);
    localStorage.setItem('complaints', JSON.stringify(updated));
  };

  const t = translations[lang];

  if (isLoadingBackend) {
    return (
      <div className="fixed inset-0 bg-heritage-sandstone flex flex-col items-center justify-center gap-12">
        <div className="jali-overlay"></div>
        <div className="relative z-10 flex flex-col items-center gap-8">
           <PostyLogo className="h-24 animate-pulse" />
           <div className="flex flex-col items-center gap-4">
              <Loader2 className="animate-spin text-heritage-maroon" size={32} />
              <p className="text-sm font-black uppercase tracking-[0.5em] text-heritage-maroon">Neural Heritage Sync</p>
           </div>
        </div>
      </div>
    );
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      <Router>
        <div className="min-h-screen flex flex-col relative">
          <OfficialHeader 
            user={user} onLogout={handleLogout} 
            onOpenLive={() => setIsLiveOpen(true)}
          />

          {/* Added mb-32 to provide breathing room before the footer */}
          <main className="flex-grow max-w-7xl mx-auto w-full py-16 px-6 mb-32 pillar-shadow bg-heritage-parchment/30 backdrop-blur-sm">
            <div className="animate-expand">
              <Routes>
                <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
                <Route path="/" element={user ? (user.role === 'user' ? <Dashboard user={user} complaints={complaints} /> : <AdminTickets complaints={complaints} user={user} onUpdate={handleUpdateComplaints} />) : <Navigate to="/login" />} />
                <Route path="/submit" element={user?.role === 'user' ? <SubmitComplaint user={user} onSubmit={addComplaint} existingComplaints={complaints} /> : <Navigate to="/login" />} />
                <Route path="/track" element={user?.role === 'user' ? <TrackStatus complaints={complaints} /> : <Navigate to="/login" />} />
                <Route path="/menu" element={user?.role === 'user' ? <ComplaintMenu complaints={complaints} onUpdateFeedback={handleUpdateFeedback} /> : <Navigate to="/login" />} />
              </Routes>
            </div>
          </main>

          <footer className="py-12 bg-heritage-maroon text-heritage-parchment text-center">
            <div className="max-w-7xl mx-auto px-6 space-y-4">
              <p className="text-[12px] font-black uppercase tracking-[0.4em] font-brand">{t.footer_text}</p>
              <p className="text-[10px] opacity-60 font-bold uppercase tracking-widest">{t.footer_subtext}</p>
              <div className="pt-6 flex justify-center gap-8 text-[10px] font-black uppercase tracking-[0.2em] opacity-40">
                <Link to="/" className="hover:text-heritage-sandstone transition-colors">Privacy</Link>
                <Link to="/" className="hover:text-heritage-sandstone transition-colors">Terms</Link>
                <Link to="/" className="hover:text-heritage-sandstone transition-colors">Charter</Link>
              </div>
            </div>
          </footer>

          {user?.role === 'user' && <ChatAssistant complaints={complaints} />}
          {isLiveOpen && <LiveVoiceAssistant onClose={() => setIsLiveOpen(false)} />}
        </div>
      </Router>
    </LangContext.Provider>
  );
};

export default App;
