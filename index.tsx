import { GoogleGenAI } from '@google/genai';
import React, { useState, useCallback, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { TOOLS_CONFIG, TOOL_CATEGORIES, ToolConfig } from './constants';
import { ThinkingIcon } from './components/Icons';
import DottedGlowBackground from './components/DottedGlowBackground';

// Types for persistent history
interface SavedResource {
  id: string;
  toolName: string;
  categoryName: string;
  content: string;
  timestamp: number;
}

function App() {
  const [activeCategory, setActiveCategory] = useState(TOOL_CATEGORIES[0].id);
  const [selectedTool, setSelectedTool] = useState<ToolConfig>(TOOLS_CONFIG[0]);
  const [promptInput, setPromptInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [output, setOutput] = useState('');
  const [savedResources, setSavedResources] = useState<SavedResource[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [apiStatus, setApiStatus] = useState<'online' | 'error' | 'idle'>('idle');
  
  const outputRef = useRef<HTMLDivElement>(null);

  // Load history on mount
  useEffect(() => {
    const history = localStorage.getItem('everyspark_history');
    if (history) {
      try {
        setSavedResources(JSON.parse(history));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }
    // Check API status
    setApiStatus(process.env.API_KEY ? 'online' : 'error');
  }, []);

  // Update selected tool when category changes
  useEffect(() => {
    const firstOfCat = TOOLS_CONFIG.find(t => t.categoryId === activeCategory);
    if (firstOfCat) setSelectedTool(firstOfCat);
  }, [activeCategory]);

  // Save history when updated
  useEffect(() => {
    localStorage.setItem('everyspark_history', JSON.stringify(savedResources));
  }, [savedResources]);

  const filteredTools = TOOLS_CONFIG.filter(t => t.categoryId === activeCategory);

  const handleGenerate = async () => {
    if (isGenerating) return;
    if (!process.env.API_KEY) {
      setOutput("### Setup Required\nPlease configure your EverySpark environment with a valid API key to begin generating resources.");
      return;
    }

    setIsGenerating(true);
    setOutput('');
    
    // Ensure the terminal view is in focus
    const terminal = document.getElementById('terminal-view');
    if (terminal) {
      terminal.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const systemInstruction = `
        You are EverySpark AI, a high-tier corporate-grade educational assistant specialized for South African schools.
        Your goal is to provide elite-level resources that are CAPS-aligned and professionally formatted.
        Always use South African English (e.g., 'Grade', 'Learner', 'Assessment').
        Tone: Professional, empowering, and structured like a top-tier consultancy document.
      `.trim();

      const userPrompt = `
        Tool: ${selectedTool.name}
        Context: ${promptInput || 'General high-quality example for ' + selectedTool.name}
        Task: ${selectedTool.basePrompt}
        
        Provide the response in clean, beautifully formatted Markdown. 
        Include sections for 'Strategic Objectives', 'Implementation Steps', and 'Outcome Metrics'.
      `.trim();

      const responseStream = await ai.models.generateContentStream({
        model: 'gemini-3-flash-preview',
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        config: {
          systemInstruction,
          temperature: 0.7,
        }
      });

      let accumulated = '';
      for await (const chunk of responseStream) {
        accumulated += chunk.text;
        setOutput(accumulated);
      }

      const newResource: SavedResource = {
        id: Date.now().toString(),
        toolName: selectedTool.name,
        categoryName: TOOL_CATEGORIES.find(c => c.id === activeCategory)?.name || '',
        content: accumulated,
        timestamp: Date.now(),
      };
      setSavedResources(prev => [newResource, ...prev].slice(0, 15));
    } catch (error: any) {
      console.error("Generation error:", error);
      const msg = error?.message?.includes('API_KEY') 
        ? "### Authentication Error\nYour API session is not active. Please check your configuration."
        : "### Network Interruption\nThe Spark network is experiencing high latency. Please try again.";
      setOutput(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(output);
    setShowCopySuccess(true);
    setTimeout(() => setShowCopySuccess(false), 2000);
  };

  const downloadResource = () => {
    if (!output) return;
    const blob = new Blob([output], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `everyspark-${selectedTool.id}-${Date.now()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const printResource = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>EverySpark Resource - ${selectedTool.name}</title>
            <style>
              body { font-family: sans-serif; padding: 40px; line-height: 1.6; color: #333; }
              h1, h2, h3 { color: #000; border-bottom: 2px solid #fbbf24; padding-bottom: 5px; }
              p { margin-bottom: 15px; }
              li { margin-bottom: 10px; }
              .footer { margin-top: 50px; font-size: 10px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
            </style>
          </head>
          <body>
            <div style="text-align: right; font-weight: bold; color: #fbbf24;">EverySpark.io</div>
            ${output.replace(/\n/g, '<br/>').replace(/### (.*)/g, '<h3>$1</h3>').replace(/\*\* (.*)\*\*/g, '<strong>$1</strong>')}
            <div class="footer text-right">Generated via EverySpark AI - South African National Education Asset</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  };

  const shareResource = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `EverySpark AI Resource: ${selectedTool.name}`,
          text: output.slice(0, 100) + "...",
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share failed', err);
      }
    } else {
      copyToClipboard();
      alert("Sharing not supported on this browser. Content copied to clipboard instead.");
    }
  };

  const clearHistory = () => {
    if (confirm("Clear all saved sparks? This cannot be undone.")) {
      setSavedResources([]);
      localStorage.removeItem('everyspark_history');
    }
  };

  const loadFromHistory = (resource: SavedResource) => {
    setOutput(resource.content);
    setShowHistory(false);
    const terminal = document.getElementById('terminal-view');
    if (terminal) {
      terminal.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Robust scrolling to prevent fragment-related blank page issues
  const scrollToId = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToTop = (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col selection:bg-amber-200 scroll-smooth">
      {/* Navbar */}
      <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 h-20 shadow-sm">
          <div className="max-w-7xl mx-auto px-6 h-full flex justify-between items-center">
              <div className="flex items-center gap-3 group cursor-pointer" onClick={scrollToTop}>
                  <div className="bg-slate-900 p-2 rounded-lg group-hover:bg-amber-500 transition-colors">
                      <i className="fa-solid fa-bolt-lightning text-amber-400 group-hover:text-slate-900 text-xl"></i>
                  </div>
                  <span className="font-extrabold text-2xl tracking-tighter uppercase text-slate-900">Every<span className="text-amber-500">Spark</span></span>
              </div>
              <div className="hidden md:flex items-center gap-8">
                  <button onClick={() => scrollToId('demo')} className="text-sm font-bold text-slate-600 hover:text-amber-600 transition">Interactive Demo</button>
                  <button 
                    onClick={() => setShowHistory(true)}
                    className="text-sm font-bold text-slate-600 hover:text-amber-600 transition flex items-center gap-2"
                  >
                    <i className="fa-solid fa-clock-rotate-left"></i> History
                  </button>
                  <div className="h-6 w-px bg-slate-200"></div>
                  <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest ${apiStatus === 'online' ? 'text-green-500' : 'text-red-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${apiStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`}></span>
                    {apiStatus}
                  </div>
                  <a href="https://www.backabuddy.co.za/home" target="_blank" rel="noopener noreferrer" className="bg-slate-900 text-white px-8 py-3 rounded-full font-bold hover:bg-amber-500 hover:text-slate-900 transition-all shadow-lg active:scale-95">
                      Sponsor Spark
                  </a>
              </div>
          </div>
          <div className="sa-accent"></div>
      </nav>

      {/* Hero */}
      <header className="premium-gradient text-white py-32 relative overflow-hidden">
          <DottedGlowBackground opacity={0.4} gap={24} speedScale={0.3} />
          <div className="max-w-7xl mx-auto px-6 relative z-10 text-center lg:text-left">
              <div className="max-w-4xl mx-auto lg:mx-0">
                  <div className="inline-flex items-center gap-2 bg-amber-500/20 text-amber-400 px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase mb-8 border border-amber-500/30">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                      South African Digital Public Good
                  </div>
                  <h1 className="text-6xl lg:text-8xl font-extrabold mb-8 leading-[1]">
                      Intelligence <br/><span className="spark-accent italic">Democratized.</span>
                  </h1>
                  <p className="text-xl lg:text-2xl text-slate-300 mb-12 leading-relaxed font-medium">
                      EverySpark puts world-class corporate AI into the hands of every educator, empowering South African schools to lead the digital frontier.
                  </p>
                  <div className="flex flex-col sm:row gap-6 justify-center lg:justify-start">
                      <button onClick={() => scrollToId('demo')} className="bg-amber-500 text-slate-900 px-10 py-5 rounded-2xl font-black text-lg hover:scale-105 transition shadow-2xl flex items-center justify-center">
                          EXPERIENCE THE AI
                      </button>
                      <button onClick={() => scrollToId('strategic-impact')} className="border-2 border-slate-700 bg-white/5 backdrop-blur-sm text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-white/10 transition flex items-center justify-center">
                          THE STRATEGY
                      </button>
                  </div>
              </div>
          </div>
          <div className="absolute -right-40 -top-40 w-[600px] h-[600px] bg-amber-500/10 blur-[150px] rounded-full"></div>
      </header>

      {/* Impact Ticker */}
      <div className="bg-slate-900 py-6 text-white/60 text-[10px] font-black uppercase tracking-[0.3em] overflow-hidden whitespace-nowrap border-b border-slate-800">
        <div className="flex gap-20 animate-marquee items-center">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-20">
              <span>CAPS-Aligned Frameworks</span>
              <span className="text-amber-500 italic">5+ Hours Saved/Week</span>
              <span>10,000+ Schools Targeted</span>
              <span className="text-amber-500 italic">Zero-Cost Deployment</span>
              <span>Executive Reliability</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sandbox Demo */}
      <section id="demo" className="py-24 bg-white scroll-mt-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-black mb-6 text-slate-900">The EverySpark Sandbox</h2>
            <p className="text-slate-500 text-xl max-w-2xl mx-auto italic leading-relaxed">
              Experience the tools that bridge the excellence gap between high-tier consultancy and public education.
            </p>
          </div>

          <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 bg-slate-50 rounded-[3rem] p-4 lg:p-12 border border-slate-200 shadow-xl">
            {/* Controls */}
            <div className="lg:col-span-4 space-y-8">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">1. Focus Domain</label>
                <div className="grid grid-cols-2 gap-2">
                  {TOOL_CATEGORIES.map(cat => (
                    <button 
                      key={cat.id}
                      onClick={() => setActiveCategory(cat.id)}
                      className={`p-4 rounded-2xl text-xs font-black transition-all flex flex-col items-center gap-2 border-2 ${activeCategory === cat.id ? 'bg-slate-900 text-white border-slate-900 shadow-xl scale-105' : 'bg-white text-slate-400 border-white hover:border-amber-200'}`}
                    >
                      <i className={`fa-solid ${cat.icon} text-xl ${activeCategory === cat.id ? 'text-amber-400' : 'text-slate-200'}`}></i>
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">2. Select Module</label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {filteredTools.map(tool => (
                    <button 
                      key={tool.id}
                      onClick={() => setSelectedTool(tool)}
                      className={`w-full text-left p-4 rounded-xl text-sm font-bold border-2 transition-all ${selectedTool.id === tool.id ? 'border-amber-500 bg-amber-50 text-slate-900 shadow-sm' : 'border-transparent bg-white text-slate-500 hover:bg-slate-100'}`}
                    >
                      <div className="flex justify-between items-center">
                        <span>{tool.name}</span>
                        {selectedTool.id === tool.id && <i className="fa-solid fa-chevron-right text-[10px] text-amber-500"></i>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 block">3. Personalize Context</label>
                <div className="space-y-4">
                  <textarea 
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Provide specific details about your school, grade, or scenario..."
                    className="w-full p-5 rounded-2xl border border-slate-200 bg-white focus:ring-4 focus:ring-amber-500/20 focus:border-amber-500 outline-none h-40 transition-all resize-none font-medium text-slate-700 shadow-inner"
                  />
                  
                  <div className="bg-amber-50 border border-amber-100 p-4 rounded-xl relative group overflow-hidden border-l-4 border-l-amber-400">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-600">Guided Example</span>
                      <button 
                        onClick={() => setPromptInput(selectedTool.examplePrompt)}
                        className="text-[10px] font-black bg-amber-500 text-slate-900 px-3 py-1 rounded-full hover:bg-slate-900 hover:text-white transition-all shadow-sm active:scale-95"
                      >
                        AUTO-FILL
                      </button>
                    </div>
                    <p className="text-xs text-amber-800 font-medium italic leading-relaxed">{selectedTool.examplePrompt}</p>
                  </div>
                </div>
              </div>

              <button 
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full py-6 rounded-2xl font-black text-xl transition-all flex items-center justify-center gap-4 shadow-2xl ${isGenerating ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-amber-500 text-slate-900 hover:scale-[1.03] active:scale-95 hover:shadow-amber-500/30'}`}
              >
                {isGenerating ? <ThinkingIcon /> : <i className="fa-solid fa-sparkles"></i>}
                {isGenerating ? 'PROCESSING SPARK...' : 'SPARK RESOURCE'}
              </button>
            </div>

            {/* Output Display */}
            <div id="terminal-view" className="lg:col-span-8 bg-white rounded-[2.5rem] border border-slate-200 shadow-inner overflow-hidden flex flex-col min-h-[750px]">
              <div className="bg-slate-900 px-8 py-4 text-white flex justify-between items-center border-b border-slate-800">
                <div className="flex items-center gap-4">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/50"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/50"></div>
                  </div>
                  <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 ml-4 uppercase">Professional Output Generator</span>
                </div>
                {output && !isGenerating && (
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={copyToClipboard}
                      className="text-[10px] font-black bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition flex items-center gap-2"
                      title="Copy to clipboard"
                    >
                      <i className={showCopySuccess ? "fa-solid fa-check text-green-400" : "fa-regular fa-copy"}></i> 
                    </button>
                    <button 
                      onClick={printResource}
                      className="text-[10px] font-black bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition flex items-center gap-2"
                      title="Print resource"
                    >
                      <i className="fa-solid fa-print"></i>
                    </button>
                    <button 
                      onClick={shareResource}
                      className="text-[10px] font-black bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition flex items-center gap-2"
                      title="Share resource"
                    >
                      <i className="fa-solid fa-share-nodes"></i>
                    </button>
                    <div className="h-4 w-px bg-slate-700 mx-1"></div>
                    <button 
                      onClick={downloadResource}
                      className="text-[10px] font-black bg-amber-500 text-slate-900 hover:bg-amber-400 px-4 py-1.5 rounded-full transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 active:scale-95"
                    >
                      <i className="fa-solid fa-file-export"></i> EXPORT (.MD)
                    </button>
                  </div>
                )}
              </div>
              
              <div className="flex-1 p-8 lg:p-12 overflow-y-auto custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-fixed relative">
                <div ref={outputRef} className="max-w-3xl mx-auto">
                  {!output && !isGenerating && (
                    <div className="h-full flex flex-col items-center justify-center text-center opacity-30 py-32">
                      <div className="w-24 h-24 rounded-full border-2 border-dashed border-slate-400 flex items-center justify-center mb-8 bg-slate-50">
                        <i className="fa-solid fa-file-lines text-4xl"></i>
                      </div>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">Workspace Primed</h3>
                      <p className="font-medium text-slate-600">Select a leadership or educational module to generate your first asset.</p>
                      <div className="mt-8 flex gap-4">
                        <div className="h-1 w-12 bg-slate-300 rounded-full"></div>
                        <div className="h-1 w-12 bg-amber-400 rounded-full"></div>
                        <div className="h-1 w-12 bg-slate-300 rounded-full"></div>
                      </div>
                    </div>
                  )}
                  {isGenerating && !output && (
                    <div className="h-full flex flex-col items-center justify-center py-32 gap-6">
                      <div className="relative">
                        <div className="w-20 h-20 border-4 border-amber-100 rounded-full"></div>
                        <div className="w-20 h-20 border-4 border-amber-500 border-t-transparent rounded-full animate-spin absolute inset-0"></div>
                        <i className="fa-solid fa-bolt-lightning absolute inset-0 flex items-center justify-center text-amber-500 text-2xl animate-pulse"></i>
                      </div>
                      <p className="text-amber-600 font-black tracking-widest text-xs animate-pulse">ENGAGING STRATEGIC MODELS...</p>
                      <div className="flex gap-1">
                        <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce delay-100"></span>
                        <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce delay-200"></span>
                        <span className="w-1 h-1 bg-amber-500 rounded-full animate-bounce delay-300"></span>
                      </div>
                    </div>
                  )}
                  <div className="markdown-content">
                    {output.split('\n').map((line, i) => {
                      if (line.startsWith('###')) {
                        return <h3 key={i} className="text-3xl font-black text-slate-900 mt-12 mb-6 border-b-4 border-amber-400 inline-block pb-1">{line.replace('###', '').trim()}</h3>;
                      }
                      if (line.startsWith('**')) {
                        return <p key={i} className="font-bold text-slate-900 text-lg mb-2 mt-6 flex items-center gap-2">
                          <i className="fa-solid fa-angle-right text-amber-500 text-xs"></i>
                          {line.replace(/\*\*/g, '').trim()}
                        </p>;
                      }
                      if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                        return <li key={i} className="ml-6 mb-3 text-slate-700 list-none flex items-start gap-4 transition-all hover:translate-x-1">
                          <span className="text-amber-500 font-black mt-1 bg-amber-50 w-5 h-5 flex items-center justify-center rounded text-[10px]">⚡</span>
                          <span className="flex-1">{line.replace(/^[-*]/, '').trim()}</span>
                        </li>;
                      }
                      return line.trim() ? <p key={i} className="mb-5 text-slate-600 leading-relaxed font-medium text-base">{line}</p> : <div key={i} className="h-2"></div>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Strategic Impact Section */}
      <section id="strategic-impact" className="py-24 bg-slate-900 text-white relative overflow-hidden scroll-mt-20">
        <DottedGlowBackground color="rgba(251, 191, 36, 0.05)" glowColor="rgba(251, 191, 36, 0.4)" speedScale={0.2} />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <h2 className="text-5xl font-black mb-8 leading-tight">Closing the <br/><span className="text-amber-500 italic">Excellence Gap.</span></h2>
              <div className="space-y-8">
                <div className="flex gap-6 group">
                  <div className="w-14 h-14 bg-amber-500 rounded-2xl flex-shrink-0 flex items-center justify-center text-slate-900 text-2xl font-black transition-transform group-hover:rotate-12">1</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 group-hover:text-amber-400 transition-colors">National Digital Infrastructure</h4>
                    <p className="text-slate-400 font-medium leading-relaxed">We provide a state-of-the-art AI ecosystem designed specifically for the South African education landscape, free for public interest.</p>
                  </div>
                </div>
                <div className="flex gap-6 group">
                  <div className="w-14 h-14 bg-amber-500 rounded-2xl flex-shrink-0 flex items-center justify-center text-slate-900 text-2xl font-black transition-transform group-hover:rotate-12">2</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 group-hover:text-amber-400 transition-colors">Strategic Empowerment</h4>
                    <p className="text-slate-400 font-medium leading-relaxed">By treating every Principal as a CEO, we inject elite corporate productivity methods into school management.</p>
                  </div>
                </div>
                <div className="flex gap-6 group">
                  <div className="w-14 h-14 bg-amber-500 rounded-2xl flex-shrink-0 flex items-center justify-center text-slate-900 text-2xl font-black transition-transform group-hover:rotate-12">3</div>
                  <div>
                    <h4 className="text-xl font-bold mb-2 group-hover:text-amber-400 transition-colors">Automated Equity</h4>
                    <p className="text-slate-400 font-medium leading-relaxed">A teacher in a rural school now has the exact same quality of AI planning resources as a teacher in a top private academy.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white/5 backdrop-blur-md rounded-[3.5rem] p-12 border border-white/10 shadow-2xl relative">
              <div className="absolute top-8 right-8 text-amber-500/20 text-8xl font-black opacity-20 select-none">2025</div>
              <h3 className="text-3xl font-black mb-8 italic text-amber-500">The Implementation Roadmap</h3>
              <p className="text-lg font-medium text-slate-300 mb-10 leading-relaxed">
                By 2026, EverySpark aims to reduce the administrative burden of South African educators by 60%, returning millions of hours to direct classroom teaching.
              </p>
              <div className="grid grid-cols-2 gap-8 mb-10">
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div className="text-4xl font-black text-white mb-2">Free</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Public Access</div>
                </div>
                <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                  <div className="text-4xl font-black text-amber-500">85%</div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Efficiency Boost</div>
                </div>
              </div>
              <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-amber-500 w-[82%] animate-pulse"></div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black tracking-widest">
                <span className="text-slate-500 uppercase">System Readiness</span>
                <span className="text-amber-500">82.4% ACTIVE</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* History Side Drawer */}
      {showHistory && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowHistory(false)}></div>
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h2 className="text-2xl font-black text-slate-900">Spark Vault</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your Generated Assets</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="bg-slate-200 hover:bg-slate-300 w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-900 transition-all text-xl">
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              {savedResources.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center opacity-40 text-center px-10">
                  <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
                    <i className="fa-solid fa-cloud-arrow-up text-3xl"></i>
                  </div>
                  <p className="font-bold text-slate-900">The vault is empty.</p>
                  <p className="text-xs text-slate-500 mt-2">Generate a resource in the sandbox to preserve it here.</p>
                </div>
              ) : (
                savedResources.map(res => (
                  <div 
                    key={res.id} 
                    onClick={() => loadFromHistory(res)}
                    className="p-5 rounded-2xl border border-slate-100 hover:border-amber-400 hover:shadow-xl cursor-pointer transition-all bg-white group relative overflow-hidden"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <span className="text-[10px] font-black uppercase tracking-widest bg-amber-50 text-amber-600 px-3 py-1 rounded-full border border-amber-100">
                        {res.categoryName}
                      </span>
                      <span className="text-[10px] font-bold text-slate-300">
                        {new Date(res.timestamp).toLocaleDateString()}
                      </span>
                    </div>
                    <h4 className="font-black text-slate-900 mb-2 group-hover:text-amber-600 transition-colors">{res.toolName}</h4>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{res.content.replace(/[#*]/g, '').slice(0, 100)}...</p>
                  </div>
                ))
              )}
            </div>
            {savedResources.length > 0 && (
              <div className="p-6 border-t border-slate-100 bg-slate-50">
                <button 
                  onClick={clearHistory}
                  className="w-full py-4 text-xs font-black uppercase tracking-widest text-red-500 hover:bg-red-50 transition-colors rounded-xl flex items-center justify-center gap-2"
                >
                  <i className="fa-regular fa-trash-can"></i> Clear Vault
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-500 py-20 border-t border-slate-800">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-12 gap-16">
              <div className="md:col-span-5">
                  <div className="flex items-center gap-3 mb-6 group cursor-pointer" onClick={scrollToTop}>
                      <div className="bg-amber-500 p-1.5 rounded-lg shadow-lg shadow-amber-500/20 group-hover:scale-110 transition-transform">
                          <i className="fa-solid fa-bolt-lightning text-slate-900 text-lg"></i>
                      </div>
                      <span className="font-extrabold text-2xl tracking-tighter uppercase text-white">Every<span className="text-amber-500">Spark</span></span>
                  </div>
                  <p className="text-sm leading-relaxed max-w-sm font-medium">EverySpark is a South African National Interest project dedicated to the digital transformation of public education through high-tier AI deployment.</p>
                  <div className="mt-8 pt-8 border-t border-slate-800">
                    <p className="text-amber-500 font-black text-xs uppercase tracking-widest">Connect with the project</p>
                    <div className="flex gap-6 mt-4 text-2xl">
                        <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 cursor-pointer transition-all hover:-translate-y-1">
                          <i className="fa-brands fa-linkedin"></i>
                        </a>
                        <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 cursor-pointer transition-all hover:-translate-y-1">
                          <i className="fa-brands fa-square-x-twitter"></i>
                        </a>
                        <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="hover:text-amber-400 cursor-pointer transition-all hover:-translate-y-1">
                          <i className="fa-brands fa-instagram"></i>
                        </a>
                    </div>
                  </div>
              </div>
              <div className="md:col-span-3">
                  <h4 className="text-white font-black uppercase tracking-widest text-xs mb-6">Explore</h4>
                  <ul className="space-y-4 text-sm font-medium">
                      <li><button onClick={() => scrollToId('demo')} className="hover:text-amber-500 transition-colors text-left">AI Sandbox</button></li>
                      <li><button onClick={() => scrollToId('strategic-impact')} className="hover:text-amber-500 transition-colors text-left">Implementation</button></li>
                      <li><a href="https://www.backabuddy.co.za/home" target="_blank" rel="noopener noreferrer" className="hover:text-amber-500 transition-colors">BackaBuddy Page</a></li>
                      <li><button onClick={() => setShowHistory(true)} className="hover:text-amber-500 transition-colors text-left">Saved Resources</button></li>
                  </ul>
              </div>
              <div className="md:col-span-4 text-right">
                  <div className="mb-8">
                    <p className="text-xs uppercase tracking-[0.3em] font-black text-slate-400 mb-2">Developed in South Africa</p>
                    <div className="sa-accent w-32 ml-auto shadow-lg shadow-red-500/10"></div>
                  </div>
                  <p className="text-xs font-bold text-slate-600 mb-4">© 2024 EverySpark SA. All rights reserved.</p>
                  <p className="text-[10px] text-slate-700 italic">Built for the children of the Rainbow Nation.</p>
              </div>
          </div>
      </footer>
    </div>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}