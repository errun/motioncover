"use client";

import { useState, useCallback } from "react";
import { Download, Play, Scissors, Image, Video, X, Loader2, Maximize, Minimize } from "lucide-react";

type TabType = "resizer" | "maker";
type FitMode = "fit" | "fill";
interface Template { id: string; name: string; color: string; }

const TEMPLATES: Template[] = [
  { id: "rain", name: "Rain", color: "#3B82F6" },
  { id: "neon", name: "Neon", color: "#EC4899" },
  { id: "vinyl", name: "Vinyl", color: "#F59E0B" },
  { id: "abstract", name: "Abstract", color: "#8B5CF6" },
  { id: "particles", name: "Particles", color: "#10B981" },
];

export default function StudioPage() {
  const [activeTab, setActiveTab] = useState<TabType>("resizer");
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const [albumArt, setAlbumArt] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<Template>(TEMPLATES[0]);
  const [fitMode, setFitMode] = useState<FitMode>("fill");
  const [duration, setDuration] = useState(5);
  const [showModal, setShowModal] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleFileDrop = useCallback((e: React.DragEvent, setter: (url: string) => void) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) setter(URL.createObjectURL(file));
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => {
    const file = e.target.files?.[0];
    if (file) setter(URL.createObjectURL(file));
  }, []);

  const handleExport = useCallback(() => {
    setShowProgress(true);
    setTimeout(() => { setShowProgress(false); setShowModal(true); }, 2000);
  }, []);

  const handleSubmitEmail = useCallback(() => {
    if (email) {
      setSubmitted(true);
      setTimeout(() => { setShowModal(false); setSubmitted(false); setEmail(""); }, 2000);
    }
  }, [email]);

  return (
    <main className="min-h-screen bg-[#121212] text-white">
      <Header />
      <TabNav activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {activeTab === "resizer" ? (
          <ResizerModule
            file={uploadedFile}
            setFile={setUploadedFile}
            fitMode={fitMode}
            setFitMode={setFitMode}
            duration={duration}
            setDuration={setDuration}
            onExport={handleExport}
            onDrop={handleFileDrop}
            onSelect={handleFileSelect}
          />
        ) : (
          <MakerModule
            art={albumArt}
            setArt={setAlbumArt}
            template={selectedTemplate}
            setTemplate={setSelectedTemplate}
            templates={TEMPLATES}
            onExport={handleExport}
            onDrop={handleFileDrop}
            onSelect={handleFileSelect}
          />
        )}
      </div>
      {showProgress && <ProgressOverlay />}
      {showModal && (
        <EmailModal
          email={email}
          setEmail={setEmail}
          submitted={submitted}
          onSubmit={handleSubmitEmail}
          onClose={() => setShowModal(false)}
        />
      )}
    </main>
  );
}

function Header() {
  return (
    <header className="border-b border-zinc-800 bg-[#181818]">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#1DB954] flex items-center justify-center">
            <Play className="w-4 h-4 text-black fill-black" />
          </div>
          <h1 className="text-xl font-bold">Spotify Canvas Studio</h1>
        </div>
        <p className="text-xs text-zinc-500 hidden sm:block">Create stunning 9:16 Canvas</p>
      </div>
    </header>
  );
}

function TabNav({ activeTab, setActiveTab }: { activeTab: TabType; setActiveTab: (t: TabType) => void }) {
  return (
    <nav className="border-b border-zinc-800 bg-[#181818]/50">
      <div className="max-w-6xl mx-auto px-4 flex gap-1">
        <TabBtn active={activeTab === "resizer"} onClick={() => setActiveTab("resizer")} icon={<Scissors className="w-4 h-4" />} label="The Resizer" />
        <TabBtn active={activeTab === "maker"} onClick={() => setActiveTab("maker")} icon={<Image className="w-4 h-4" />} label="The Maker" />
      </div>
    </nav>
  );
}

function TabBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${active ? "border-[#1DB954] text-white" : "border-transparent text-zinc-400 hover:text-white"}`}>
      {icon}{label}
    </button>
  );
}

function PhonePreview({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[200px] h-[356px] bg-black rounded-[24px] border-4 border-zinc-700 overflow-hidden shadow-2xl">
      <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-1 bg-zinc-700 rounded-full" />
      <div className="w-full h-full pt-4">{children}</div>
    </div>
  );
}

function DropZone({ onDrop, onSelect, hasFile, accept, icon, label }: { onDrop: (e: React.DragEvent) => void; onSelect: (e: React.ChangeEvent<HTMLInputElement>) => void; hasFile: boolean; accept: string; icon: React.ReactNode; label: string }) {
  return (
    <label onDrop={onDrop} onDragOver={(e) => e.preventDefault()} className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${hasFile ? "border-[#1DB954] bg-[#1DB954]/10" : "border-zinc-700 hover:border-zinc-500 bg-zinc-900/30"}`}>
      {icon}
      <span className="mt-2 text-sm text-zinc-400">{label}</span>
      <span className="text-xs text-zinc-600 mt-1">or click to browse</span>
      <input type="file" accept={accept} onChange={onSelect} className="hidden" />
    </label>
  );
}

function ProgressOverlay() {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 p-8 rounded-2xl text-center space-y-4 max-w-sm">
        <Loader2 className="w-12 h-12 text-[#1DB954] animate-spin mx-auto" />
        <p className="text-lg font-medium">Processing your Canvas...</p>
        <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
          <div className="h-full bg-[#1DB954] animate-pulse" style={{ width: "60%" }} />
        </div>
      </div>
    </div>
  );
}

function EmailModal({ email, setEmail, submitted, onSubmit, onClose }: { email: string; setEmail: (e: string) => void; submitted: boolean; onSubmit: () => void; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 p-8 rounded-2xl max-w-md w-full mx-4 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-zinc-500 hover:text-white"><X className="w-5 h-5" /></button>
        {submitted ? (
          <div className="text-center py-8">
            <div className="w-16 h-16 rounded-full bg-[#1DB954] flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-black" />
            </div>
            <h3 className="text-xl font-bold mb-2">Check your email!</h3>
            <p className="text-zinc-400">Your Canvas download link has been sent.</p>
          </div>
        ) : (
          <>
            <h3 className="text-xl font-bold mb-2">Your Canvas is ready!</h3>
            <p className="text-zinc-400 mb-6">Enter your email to receive the download link.</p>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="your@email.com" className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg focus:outline-none focus:border-[#1DB954] mb-4" />
            <button onClick={onSubmit} className="w-full py-3 bg-[#1DB954] text-black font-bold rounded-full hover:bg-[#1ed760] transition-colors">Send Download Link</button>
          </>
        )}
      </div>
    </div>
  );
}

interface ResizerProps {
  file: string | null;
  setFile: (f: string | null) => void;
  fitMode: FitMode;
  setFitMode: (m: FitMode) => void;
  duration: number;
  setDuration: (d: number) => void;
  onExport: () => void;
  onDrop: (e: React.DragEvent, setter: (url: string) => void) => void;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => void;
}

function ResizerModule({ file, setFile, fitMode, setFitMode, duration, setDuration, onExport, onDrop, onSelect }: ResizerProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">The Resizer</h2>
          <p className="text-zinc-400">Upload your video or image and we&apos;ll convert it to 9:16 Canvas format.</p>
        </div>
        <DropZone onDrop={(e) => onDrop(e, setFile)} onSelect={(e) => onSelect(e, setFile)} hasFile={!!file} accept="video/*,image/*" icon={<Video className="w-10 h-10 text-zinc-500" />} label="Drop video or image here" />
        {file && (
          <div className="space-y-4">
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Fit Mode</label>
              <div className="flex gap-2">
                <button onClick={() => setFitMode("fill")} className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${fitMode === "fill" ? "bg-[#1DB954] text-black" : "bg-zinc-800 text-white"}`}><Maximize className="w-4 h-4" />Fill</button>
                <button onClick={() => setFitMode("fit")} className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 ${fitMode === "fit" ? "bg-[#1DB954] text-black" : "bg-zinc-800 text-white"}`}><Minimize className="w-4 h-4" />Fit</button>
              </div>
            </div>
            <div>
              <label className="text-sm text-zinc-400 mb-2 block">Duration: {duration}s</label>
              <input type="range" min="3" max="8" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full accent-[#1DB954]" />
            </div>
            <button onClick={onExport} className="w-full py-3 bg-[#1DB954] text-black font-bold rounded-full hover:bg-[#1ed760] transition-colors flex items-center justify-center gap-2"><Download className="w-5 h-5" />Export Canvas</button>
          </div>
        )}
      </div>
      <div className="flex justify-center">
        <PhonePreview>
          {file ? (
            <div className={`w-full h-full ${fitMode === "fill" ? "object-cover" : "object-contain"} bg-zinc-900`}>
              {file.includes("video") ? <video src={file} className="w-full h-full object-cover" autoPlay loop muted /> : <img src={file} alt="Preview" className={`w-full h-full ${fitMode === "fill" ? "object-cover" : "object-contain"}`} />}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-zinc-900 text-zinc-600"><Video className="w-12 h-12" /></div>
          )}
        </PhonePreview>
      </div>
    </div>
  );
}

interface MakerProps {
  art: string | null;
  setArt: (a: string | null) => void;
  template: Template;
  setTemplate: (t: Template) => void;
  templates: Template[];
  onExport: () => void;
  onDrop: (e: React.DragEvent, setter: (url: string) => void) => void;
  onSelect: (e: React.ChangeEvent<HTMLInputElement>, setter: (url: string) => void) => void;
}

function MakerModule({ art, setArt, template, setTemplate, templates, onExport, onDrop, onSelect }: MakerProps) {
  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">The Maker</h2>
          <p className="text-zinc-400">Upload album art and choose an animated template.</p>
        </div>
        <DropZone onDrop={(e) => onDrop(e, setArt)} onSelect={(e) => onSelect(e, setArt)} hasFile={!!art} accept="image/*" icon={<Image className="w-10 h-10 text-zinc-500" />} label="Drop album art here" />
        <div>
          <span className="text-sm text-zinc-400 mb-3 block">Choose Template</span>
          <div className="grid grid-cols-5 gap-2">
            {templates.map((t) => (
              <button key={t.id} onClick={() => setTemplate(t)} className={`aspect-square rounded-lg flex items-center justify-center text-xs font-medium transition-all ${template.id === t.id ? "ring-2 ring-[#1DB954] ring-offset-2 ring-offset-[#121212]" : ""}`} style={{ backgroundColor: t.color }}>{t.name}</button>
            ))}
          </div>
        </div>
        {art && (
          <button onClick={onExport} className="w-full py-3 bg-[#1DB954] text-black font-bold rounded-full hover:bg-[#1ed760] transition-colors flex items-center justify-center gap-2"><Download className="w-5 h-5" />Export Canvas</button>
        )}
      </div>
      <div className="flex justify-center">
        <PhonePreview>
          <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${template.color}40, ${template.color}20)` }}>
            {art ? (
              <div className="relative">
                <img src={art} alt="Album Art" className="w-32 h-32 rounded-lg shadow-2xl" />
                <div className="absolute inset-0 rounded-lg animate-pulse" style={{ boxShadow: `0 0 40px ${template.color}80` }} />
              </div>
            ) : (
              <div className="w-32 h-32 rounded-lg bg-zinc-800 flex items-center justify-center"><Image className="w-8 h-8 text-zinc-600" /></div>
            )}
          </div>
        </PhonePreview>
      </div>
    </div>
  );
}

