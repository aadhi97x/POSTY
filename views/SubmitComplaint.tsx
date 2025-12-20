
import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Complaint, ComplaintStatus } from '../types';
import { LangContext } from '../App';
import { analyzeComplaint, extractDetailsFromImage, analyzeVoiceRecording } from '../services/geminiService';
import { 
  ArrowLeft, Camera, FileText, MapPin, Calendar, Loader2, Mic, CheckCircle2, X, Hash, Sparkles, CircleStop, Timer, ShieldAlert, Zap, User as UserIcon, Map
} from 'lucide-react';

interface SubmitProps {
  user: User;
  onSubmit: (newComplaint: Complaint) => void;
  existingComplaints?: Complaint[];
}

const SubmitComplaint: React.FC<SubmitProps> = ({ user, onSubmit, existingComplaints = [] }) => {
  const navigate = useNavigate();
  const { t } = useContext(LangContext);
  const [description, setDescription] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [postOffice, setPostOffice] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [image, setImage] = useState<string | null>(null);
  
  // Postcard Details
  const [senderName, setSenderName] = useState('');
  const [senderAddress, setSenderAddress] = useState('');
  const [senderPin, setSenderPin] = useState('');
  
  const [receiverName, setReceiverName] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [receiverPin, setReceiverPin] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);
  const [extractSuccess, setExtractSuccess] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const startRecording = async () => {
    setVoiceError(null);
    audioChunksRef.current = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        processAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordDuration(0);
      timerRef.current = window.setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setVoiceError("Microphone access denied or unavailable.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsAnalyzingVoice(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        const result = await analyzeVoiceRecording({ base64Audio, mimeType: blob.type });
        if (result) {
          setDescription(prev => prev + (prev.length > 0 ? '\n' : '') + result);
        } else {
          setVoiceError("Could not analyze voice. Please try again.");
        }
        setIsAnalyzingVoice(false);
      };
    } catch (err) {
      console.error(err);
      setVoiceError("Analysis failed.");
      setIsAnalyzingVoice(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setExtractSuccess(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExtractDetails = async () => {
    if (!image) return;
    setIsExtracting(true);
    setVoiceError(null);
    try {
      const details = await extractDetailsFromImage(image);
      if (details) {
        if (details.trackingNumber) setTrackingNumber(details.trackingNumber);
        if (details.postOffice) setPostOffice(details.postOffice);
        
        if (details.senderName) setSenderName(details.senderName);
        if (details.senderAddress) setSenderAddress(details.senderAddress);
        if (details.senderPin) setSenderPin(details.senderPin);
        
        if (details.receiverName) setReceiverName(details.receiverName);
        if (details.receiverAddress) setReceiverAddress(details.receiverAddress);
        if (details.receiverPin) setReceiverPin(details.receiverPin);
        
        setExtractSuccess(true);
        setTimeout(() => setExtractSuccess(false), 4000);
      } else {
        setVoiceError("Could not extract details from the image.");
      }
    } catch (e) {
      setVoiceError("Connection failed.");
    }
    setIsExtracting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setIsSubmitting(true);
    
    try {
      const context = existingComplaints.slice(0, 3).map(c => c.description).join('\n');
      const analysis = await analyzeComplaint({
        description,
        imageBase64: image || undefined,
        context,
        trackingNumber
      });
      
      const newComplaint: Complaint = {
        id: `PGC-${Math.floor(Math.random() * 90000) + 10000}`,
        userId: user.id, userName: user.name, description, trackingNumber, postOffice, date, imageUrl: image || undefined,
        status: ComplaintStatus.NEW, analysis: analysis as any,
        updates: [{ timestamp: new Date().toISOString(), author: 'System', message: 'Complaint Logged.', isInternal: false, type: 'message' }],
        escalationLevel: 0,
        lastActivityAt: new Date().toISOString(),
        slaPaused: false,
        sender: { name: senderName, address: senderAddress, pinCode: senderPin },
        receiver: { name: receiverName, address: receiverAddress, pinCode: receiverPin }
      };

      onSubmit(newComplaint);
      setTimeout(() => navigate('/menu'), 1500);
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  return (
    <div className="max-w-5xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <button onClick={() => navigate('/')} className="flex items-center gap-3 text-heritage-sandstone hover:text-heritage-red mb-12 transition-all font-black text-xs uppercase tracking-widest group">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> {t.nav_home}
      </button>

      <div className="parchment-card rounded-[3.5rem] overflow-hidden shadow-2xl relative">
        {(isAnalyzingVoice || isExtracting) && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
            <div className="w-24 h-24 rounded-full border-4 border-heritage-red border-t-transparent animate-spin mb-8" />
            <h3 className="text-2xl font-black uppercase tracking-tighter text-heritage-maroon">Analysing Data</h3>
          </div>
        )}

        <div className="bg-heritage-maroon/5 p-16 border-b border-heritage-sandstone/20 flex flex-col md:flex-row justify-between items-center gap-8">
          <div>
            <h2 className="text-4xl font-black uppercase tracking-tight text-heritage-maroon leading-none italic">Register Grievance</h2>
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-heritage-red mt-4">Support Terminal Active</p>
          </div>
          <div className="flex gap-4">
             <div className="text-right hidden md:block">
                <p className="text-[10px] font-black uppercase text-heritage-sandstone tracking-widest">Form Status</p>
                <p className="text-xs font-black uppercase text-heritage-maroon">Official Draft</p>
             </div>
             <div className="w-12 h-12 bg-heritage-maroon rounded-xl flex items-center justify-center text-heritage-parchment shadow-lg">
                <FileText size={24} />
             </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-16 space-y-16">
          {voiceError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-8 rounded-3xl flex items-center gap-6 text-red-600 dark:text-red-400 animate-in slide-in-from-top-4">
              <ShieldAlert size={24} className="shrink-0" />
              <p className="text-xs font-black uppercase tracking-widest">{voiceError}</p>
              <button type="button" onClick={() => setVoiceError(null)} className="ml-auto p-2 hover:bg-red-100 rounded-xl transition-colors"><X size={20} /></button>
            </div>
          )}

          {/* DOCUMENT EVIDENCE UPLOAD & NEURAL EXTRACT */}
          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black text-heritage-sandstone uppercase tracking-widest flex items-center gap-3"><Camera size={16} className="text-heritage-red" /> Consignment Evidence</label>
              {image && (
                <button 
                  type="button" 
                  onClick={handleExtractDetails} 
                  disabled={isExtracting} 
                  className={`flex items-center gap-3 text-[10px] font-black uppercase tracking-widest px-8 py-4 rounded-2xl border-2 transition-all shadow-xl ${extractSuccess ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-heritage-maroon text-heritage-parchment border-heritage-maroon hover:bg-heritage-red'}`}
                >
                  {isExtracting ? <Loader2 className="animate-spin" size={16} /> : extractSuccess ? <CheckCircle2 size={16} /> : <Zap size={16} />} 
                  {extractSuccess ? "Details Auto-Filled" : "Auto-fill Details"}
                </button>
              )}
            </div>
            <div className="border-4 border-dashed border-heritage-sandstone/30 rounded-[3.5rem] p-10 text-center hover:bg-heritage-sandstone/10 transition-all relative group cursor-pointer overflow-hidden">
              {image ? (
                <div className="relative inline-block group/img">
                  <img src={image} alt="Preview" className="max-h-64 mx-auto rounded-3xl shadow-2xl transition-transform border-4 border-white" />
                  <button onClick={(e) => { e.preventDefault(); setImage(null); }} className="absolute -top-4 -right-4 bg-heritage-maroon text-white p-3 rounded-full shadow-2xl hover:scale-110 transition-all border-4 border-heritage-parchment"><X size={20} /></button>
                </div>
              ) : (
                <div className="space-y-4 py-8">
                  <Camera className="text-heritage-sandstone/40 mx-auto" size={48} />
                  <p className="text-[12px] font-black text-heritage-sandstone uppercase tracking-[0.4em] italic">Upload Image of Postcard or Consignment Receipt</p>
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                </div>
              )}
            </div>
          </div>

          {/* POSTCARD REPLICA INPUTS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 bg-white/30 p-10 rounded-[3rem] border-2 border-heritage-sandstone/20 relative">
             <div className="absolute top-0 left-1/2 bottom-0 w-px bg-heritage-sandstone/20 hidden lg:block" />
             
             {/* SENDER BLOCK (FROM) */}
             <div className="space-y-8">
                <div className="flex items-center gap-3 text-heritage-maroon">
                   <UserIcon size={20} />
                   <h3 className="text-xs font-black uppercase tracking-widest italic underline decoration-heritage-red decoration-2">Dispatch Details (From)</h3>
                </div>
                <div className="space-y-4">
                   <input type="text" placeholder="Sender Name" className="w-full p-4 bg-white/50 border-b-2 border-heritage-sandstone/30 outline-none focus:border-heritage-red transition-all font-bold text-base" value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                   <textarea rows={3} placeholder="Full Address of Origin" className="w-full p-4 bg-white/50 border-b-2 border-heritage-sandstone/30 outline-none focus:border-heritage-red transition-all font-bold text-base resize-none" value={senderAddress} onChange={(e) => setSenderAddress(e.target.value)} />
                   <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-heritage-sandstone uppercase">PIN</span>
                      <input type="text" maxLength={6} placeholder="6-digit PIN" className="w-32 p-4 bg-white/50 border-b-2 border-heritage-sandstone/30 outline-none focus:border-heritage-red transition-all font-black text-lg text-center tracking-widest" value={senderPin} onChange={(e) => setSenderPin(e.target.value)} />
                   </div>
                </div>
             </div>

             {/* RECEIVER BLOCK (TO) */}
             <div className="space-y-8">
                <div className="flex items-center gap-3 text-heritage-maroon">
                   <MapPin size={20} />
                   <h3 className="text-xs font-black uppercase tracking-widest italic underline decoration-heritage-red decoration-2">Destination Details (To)</h3>
                </div>
                <div className="space-y-4">
                   <input type="text" placeholder="Recipient Name" className="w-full p-4 bg-white/50 border-b-2 border-heritage-sandstone/30 outline-none focus:border-heritage-red transition-all font-bold text-base" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} />
                   <textarea rows={3} placeholder="Recipient Address" className="w-full p-4 bg-white/50 border-b-2 border-heritage-sandstone/30 outline-none focus:border-heritage-red transition-all font-bold text-base resize-none" value={receiverAddress} onChange={(e) => setReceiverAddress(e.target.value)} />
                   <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-heritage-sandstone uppercase">PIN</span>
                      <input type="text" maxLength={6} placeholder="6-digit PIN" className="w-32 p-4 bg-white/50 border-b-2 border-heritage-sandstone/30 outline-none focus:border-heritage-red transition-all font-black text-lg text-center tracking-widest" value={receiverPin} onChange={(e) => setReceiverPin(e.target.value)} />
                   </div>
                </div>
             </div>
          </div>

          {/* OFFICIAL TRACKING & DATE */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-heritage-sandstone uppercase tracking-widest flex items-center gap-3"><Hash size={16} className="text-heritage-red" /> Consignment Number</label>
              <input type="text" placeholder="e.g. EF591712355IN" className="w-full p-6 bg-white/50 border-2 border-heritage-sandstone/30 text-heritage-ink rounded-2xl outline-none focus:border-heritage-red transition-all font-black text-lg tracking-wider" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-heritage-sandstone uppercase tracking-widest flex items-center gap-3"><Map size={16} className="text-heritage-red" /> Handling Office</label>
              <input type="text" required placeholder="Booking Post Office" className="w-full p-6 bg-white/50 border-2 border-heritage-sandstone/30 text-heritage-ink rounded-2xl outline-none focus:border-heritage-red transition-all font-black text-lg" value={postOffice} onChange={(e) => setPostOffice(e.target.value)} />
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-heritage-sandstone uppercase tracking-widest flex items-center gap-3"><Calendar size={16} className="text-heritage-red" /> Transaction Date</label>
              <input type="date" required className="w-full p-6 bg-white/50 border-2 border-heritage-sandstone/30 text-heritage-ink rounded-2xl outline-none focus:border-heritage-red transition-all font-black text-lg" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          {/* DESCRIPTION & VOICE */}
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <label className="text-xs font-black text-heritage-maroon uppercase tracking-widest flex items-center gap-4 italic">
                <FileText size={20} className="text-heritage-red" /> Nature of Grievance
              </label>
              
              <div className="flex items-center gap-4">
                {isRecording && (
                   <div className="flex items-center gap-3 bg-red-100 dark:bg-red-900/20 px-4 py-2 rounded-2xl animate-pulse">
                      <Timer size={14} className="text-heritage-red" />
                      <span className="text-xs font-black text-heritage-red">{formatTime(recordDuration)}</span>
                   </div>
                )}
                <button 
                  type="button" 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex items-center gap-4 px-10 py-4 rounded-2xl text-[11px] font-black uppercase transition-all shadow-md active:scale-95 ${isRecording ? 'bg-black text-white ring-8 ring-slate-100 dark:ring-slate-800' : 'bg-heritage-red text-white hover:bg-heritage-maroon'}`}
                >
                  {isRecording ? <CircleStop size={18} /> : <Mic size={18} />} 
                  {isRecording ? 'Stop & Transcribe' : 'Voice Memo Support'}
                </button>
              </div>
            </div>
            
            <div className="relative group">
               <textarea required rows={8} placeholder="Briefly describe the issue (e.g., Delay in delivery, Item not received, etc.)." className="w-full p-10 bg-white/50 border-2 border-heritage-sandstone/30 rounded-[2.5rem] outline-none focus:border-heritage-red transition-all font-bold text-lg leading-relaxed placeholder:text-heritage-sandstone/40 italic" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="pt-12">
            <button type="submit" disabled={isSubmitting} className="w-full bg-heritage-maroon text-heritage-parchment py-10 rounded-[2.5rem] font-black uppercase text-base tracking-[0.5em] hover:bg-heritage-red transition shadow-2xl flex items-center justify-center gap-6 active:scale-[0.98] disabled:opacity-50">
              {isSubmitting ? <><Loader2 className="animate-spin" size={24} /> Processing...</> : <><CheckCircle2 size={32} /> Secure Archive & Submit</>}
            </button>
          </div>
        </form>
      </div>
      
      <div className="mt-12 text-center opacity-40">
         <p className="text-[10px] font-black text-heritage-sandstone uppercase tracking-[0.4em]">Official Redressal Portal • Support Protocol</p>
      </div>
    </div>
  );
};

export default SubmitComplaint;
