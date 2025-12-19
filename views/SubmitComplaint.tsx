import React, { useState, useContext, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Complaint, ComplaintStatus } from '../types';
import { LangContext } from '../App';
import { analyzeComplaint, extractDetailsFromImage, analyzeVoiceRecording } from '../services/geminiService';
import { 
  ArrowLeft, Camera, FileText, MapPin, Calendar, Loader2, Mic, CheckCircle2, X, Hash, Sparkles, CircleStop, Timer, ShieldAlert
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
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzingVoice, setIsAnalyzingVoice] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recordDuration, setRecordDuration] = useState(0);

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
        // Updated to pass a single object argument matching the new service signature
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
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleExtractDetails = async () => {
    if (!image) return;
    setIsExtracting(true);
    try {
      const details = await extractDetailsFromImage(image);
      if (details) {
        if (details.trackingNumber) setTrackingNumber(details.trackingNumber);
        if (details.postOffice) setPostOffice(details.postOffice);
      }
    } catch (e) {}
    setIsExtracting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    setIsSubmitting(true);
    
    try {
      const context = existingComplaints.slice(0, 3).map(c => c.description).join('\n');
      const analysis = await analyzeComplaint(description, image || undefined, context, trackingNumber);
      
      const newComplaint: Complaint = {
        id: `PGC-${Math.floor(Math.random() * 90000) + 10000}`,
        userId: user.id, userName: user.name, description, trackingNumber, postOffice, date, imageUrl: image || undefined,
        status: ComplaintStatus.NEW, analysis: analysis as any,
        updates: [{ timestamp: new Date().toISOString(), author: 'System', message: 'Complaint Logged.', isInternal: false, type: 'message' }],
        escalationLevel: 0,
        lastActivityAt: new Date().toISOString(),
        slaPaused: false
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
    <div className="max-w-4xl mx-auto py-12 px-6 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <button onClick={() => navigate('/')} className="flex items-center gap-3 text-slate-400 hover:text-indiapost-red mb-12 transition-all font-black text-xs uppercase tracking-widest group">
        <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" /> {t.nav_home}
      </button>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-[3.5rem] overflow-hidden shadow-2xl relative">
        {isAnalyzingVoice && (
          <div className="absolute inset-0 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md z-50 flex flex-col items-center justify-center p-12 text-center animate-in fade-in duration-300">
            <div className="w-24 h-24 rounded-full border-4 border-indiapost-red border-t-transparent animate-spin mb-8" />
            <h3 className="text-2xl font-black uppercase tracking-tighter text-slate-900 dark:text-white">Neural Analysis In Progress</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.4em] mt-4">Transcribing, Translating & Refining Grievance...</p>
          </div>
        )}

        <div className="bg-slate-50 dark:bg-slate-800 p-16 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">Register Grievance</h2>
          <p className="text-[11px] font-bold uppercase tracking-[0.4em] text-indiapost-red mt-4">Intelligence Support Active</p>
        </div>

        <form onSubmit={handleSubmit} className="p-16 space-y-16">
          {voiceError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-8 rounded-3xl flex items-center gap-6 text-red-600 dark:text-red-400 animate-in slide-in-from-top-4">
              <ShieldAlert size={24} className="shrink-0" />
              <p className="text-xs font-black uppercase tracking-widest">{voiceError}</p>
              <button type="button" onClick={() => setVoiceError(null)} className="ml-auto p-2 hover:bg-red-100 rounded-xl transition-colors"><X size={20} /></button>
            </div>
          )}

          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <label className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-widest flex items-center gap-4">
                <FileText size={20} className="text-indiapost-red" /> Problem Description
              </label>
              
              <div className="flex items-center gap-4">
                {isRecording && (
                   <div className="flex items-center gap-3 bg-red-100 dark:bg-red-900/20 px-4 py-2 rounded-2xl animate-pulse">
                      <Timer size={14} className="text-indiapost-red" />
                      <span className="text-xs font-black text-indiapost-red">{formatTime(recordDuration)}</span>
                   </div>
                )}
                <button 
                  type="button" 
                  onClick={isRecording ? stopRecording : startRecording}
                  className={`flex items-center gap-4 px-10 py-4 rounded-2xl text-[11px] font-black uppercase transition-all shadow-md active:scale-95 ${isRecording ? 'bg-black text-white ring-8 ring-slate-100 dark:ring-slate-800' : 'bg-indiapost-red text-white hover:bg-red-800'}`}
                >
                  {isRecording ? <CircleStop size={18} /> : <Mic size={18} />} 
                  {isRecording ? 'Finish & Analyze' : 'Record Voice Memo'}
                </button>
              </div>
            </div>
            
            <div className="relative group">
               <textarea required rows={8} placeholder="Describe your issue... Use our voice recording feature for AI transcription and translation." className="w-full p-10 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-[2.5rem] outline-none focus:border-black transition-all font-medium text-lg leading-relaxed placeholder:text-slate-300" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3"><Hash size={16} className="text-indiapost-red" /> Tracking ID</label>
              <input type="text" placeholder="e.g. EB123456789IN" className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-black transition-all font-bold text-lg" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3"><MapPin size={16} className="text-indiapost-red" /> Post Office</label>
              <input type="text" required placeholder="Office name or Pincode" className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-black transition-all font-bold text-lg" value={postOffice} onChange={(e) => setPostOffice(e.target.value)} />
            </div>
            <div className="space-y-4">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3"><Calendar size={16} className="text-indiapost-red" /> Date</label>
              <input type="date" required className="w-full p-6 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl outline-none focus:border-black transition-all font-bold text-lg" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-8">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-3"><Camera size={16} className="text-indiapost-red" /> Evidence Upload</label>
              {image && (
                <button type="button" onClick={handleExtractDetails} disabled={isExtracting} className="flex items-center gap-3 text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl border-2 border-slate-200 dark:border-slate-800 hover:bg-black hover:text-white transition-all">
                  {isExtracting ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />} Neural Extract
                </button>
              )}
            </div>
            <div className="border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[3.5rem] p-16 text-center hover:bg-slate-50 transition-all relative group cursor-pointer">
              {image ? (
                <div className="relative inline-block group/img">
                  <img src={image} alt="Preview" className="max-h-80 mx-auto rounded-3xl shadow-2xl transition-transform" />
                  <button onClick={(e) => { e.preventDefault(); setImage(null); }} className="absolute -top-6 -right-6 bg-black text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-all"><X size={24} /></button>
                </div>
              ) : (
                <div className="space-y-6 py-12">
                  <Camera className="text-slate-300 mx-auto" size={40} />
                  <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Click to Upload Document Evidence</p>
                  <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleImageChange} />
                </div>
              )}
            </div>
          </div>

          <div className="pt-12">
            <button type="submit" disabled={isSubmitting} className="w-full bg-black dark:bg-white dark:text-black text-white py-10 rounded-[2.5rem] font-black uppercase text-base tracking-[0.5em] hover:bg-slate-800 transition shadow-2xl flex items-center justify-center gap-6 active:scale-[0.98] disabled:opacity-50">
              {isSubmitting ? <><Loader2 className="animate-spin" size={24} /> Processing Intelligence...</> : <><CheckCircle2 size={32} /> Dispatch Grievance</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SubmitComplaint;
