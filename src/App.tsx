/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Code2, 
  Search, 
  Zap, 
  ShieldAlert, 
  FileCode, 
  History, 
  Moon, 
  Sun, 
  Play, 
  Copy, 
  Download, 
  Trash2, 
  Upload,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Github,
  Terminal,
  Layout,
  Cpu,
  FolderOpen,
  FileArchive,
  Link as LinkIcon,
  FolderTree,
  FileText,
  X,
  Menu,
  Settings,
  ShieldCheck,
  MessageSquare,
  Sparkles,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';
import { analyzeCode, AnalysisResult, CodeIssue } from './services/mockAi';

interface FileItem {
  name: string;
  content: string;
  language: string;
  path?: string;
}

interface HistoryItem {
  id: number;
  language: string;
  date: string;
  score: number;
  code: string;
}

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [language, setLanguage] = useState('auto');
  const [code, setCode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [languageError, setLanguageError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState<number>(-1);
  const [isProjectMode, setIsProjectMode] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [urlType, setUrlType] = useState<'github' | 'link'>('link');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [userApiKey, setUserApiKey] = useState('');
  const [tempApiKey, setTempApiKey] = useState('');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const [activeOptimizedFileIndex, setActiveOptimizedFileIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState<{
    show: boolean;
    type: 'info' | 'error' | 'warning' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const zipInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLDivElement>(null);

  const handleEditorScroll = () => {
    if (textareaRef.current && lineNumbersRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  };

  const detectLanguage = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (ext === 'py') return 'python';
    if (ext === 'c') return 'c';
    if (ext === 'cpp' || ext === 'cc' || ext === 'h' || ext === 'cxx') return 'cpp';
    if (ext === 'java') return 'java';
    if (ext === 'js' || ext === 'jsx') return 'javascript';
    if (ext === 'ts' || ext === 'tsx') return 'typescript';
    if (ext === 'go') return 'go';
    if (ext === 'rs') return 'rust';
    if (ext === 'rb') return 'ruby';
    if (ext === 'php') return 'php';
    if (ext === 'swift') return 'swift';
    if (ext === 'kt' || ext === 'kts') return 'kotlin';
    if (ext === 'sh' || ext === 'bash') return 'bash';
    if (ext === 'sql') return 'sql';
    if (ext === 'html') return 'html';
    if (ext === 'css') return 'css';
    return 'auto'; // default
  };

  const guessLanguageByContent = (text: string) => {
    if (!text || text.length < 10) return 'auto';
    
    const patterns = [
      { lang: 'html', regex: /<html|<\?xml|<!DOCTYPE html>|<body|<div/i },
      { lang: 'react', regex: /import React|from ['"]react['"]|className=|useState\(/ },
      { lang: 'sql', regex: /SELECT .* FROM|UPDATE .* SET|INSERT INTO|CREATE TABLE/i },
      { lang: 'php', regex: /<\?php|\$[a-zA-Z_\x7f-\xff][a-zA-Z0-9_\x7f-\xff]*\s*=/ },
      { lang: 'python', regex: /def \w+\(|import \w+|print\(|for \w+ in |elif |None/ },
      { lang: 'java', regex: /public class |System\.out\.println|public static void main/ },
      { lang: 'cpp', regex: /#include\s*<[a-zA-Z0-9_]+>|std::cout|using namespace std;/ },
      { lang: 'c', regex: /#include\s*<stdio\.h>|printf\(|malloc\(/ },
      { lang: 'go', regex: /package main|import \(\n\s*"fmt"|func main\(\)/ },
      { lang: 'rust', regex: /fn \w+\(|println!|let mut |pub struct/ },
      { lang: 'ruby', regex: /def \w+(.*?)\n(.*?)\nend|puts |require ['"][a-z_]+['"]/ },
      { lang: 'swift', regex: /import Swift|import Foundation|func \w+\(|let \w+ = |var \w+:/ },
      { lang: 'kotlin', regex: /fun \w+\(|val \w+ = |var \w+:|println\(/ },
      { lang: 'bash', regex: /#!/ },
      { lang: 'css', regex: /[a-zA-Z0-9_-]+\s*\{[\s\S]*?:[\s\S]*?;/ },
      { lang: 'typescript', regex: /interface \w+ |type \w+ = |:\s*[A-Z][A-Za-z]+(\[\])?\s*=| as [A-Z]/ },
      { lang: 'javascript', regex: /console\.log\(|function\s*\(|=>|const\s/ }
    ];

    for (const { lang, regex } of patterns) {
      if (regex.test(text)) return lang;
    }
    return 'auto';
  };

  useEffect(() => {
    if (language === 'auto' && code.length > 15) {
      const guessed = guessLanguageByContent(code);
      if (guessed !== 'auto') {
        setLanguage(guessed);
      }
    }
  }, [code, language]);

  // Toggle Dark Mode
  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark');
    } else {
      document.body.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Check API Health
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/health");
        if (response.ok) {
          const data = await response.json();
          console.log("API Health Check:", data);
        } else {
          console.error("API Health Check failed:", response.status);
        }
      } catch (error) {
        console.error("API Health Check error:", error);
      }
    };
    checkHealth();
  }, []);

  const SUPPORTED_LANGUAGES = ['auto', 'python', 'java', 'c', 'cpp', 'javascript', 'typescript', 'go', 'rust', 'ruby', 'php', 'swift', 'kotlin', 'bash', 'sql', 'html', 'css', 'react'];

  // Load API Key from localStorage
  useEffect(() => {
    const savedKey = localStorage.getItem('groq_api_key') || localStorage.getItem('gemini_api_key');
    if (savedKey) {
      setUserApiKey(savedKey);
      setTempApiKey(savedKey);
    }
  }, []);

  const handleSaveSettings = () => {
    localStorage.setItem('groq_api_key', tempApiKey);
    setUserApiKey(tempApiKey);
    setShowSettingsModal(false);
  };

  const handleAnalyze = async (manualCode?: any, manualLang?: any) => {
    const codeToAnalyze = typeof manualCode === 'string' ? manualCode : code;
    const langToAnalyze = typeof manualLang === 'string' ? manualLang : language;
    
    if (!codeToAnalyze.trim()) return;
    setIsAnalyzing(true);
    setResult(null); // Clear previous result
    setLanguageError(null); // Clear previous language error
    setActiveOptimizedFileIndex(0); // Reset file index
    try {
      const analysisResult = await analyzeCode(codeToAnalyze, langToAnalyze, userApiKey);
      setResult(analysisResult);
      
      // Add to history
      const historyItem = {
        id: Date.now(),
        language: langToAnalyze,
        date: new Date().toLocaleString(),
        score: analysisResult.score || 0,
        code: codeToAnalyze
      };
      setHistory(prev => [historyItem, ...prev].slice(0, 10));
    } catch (error: any) {
      console.error("Analysis failed:", error);
      const errorMsg = error?.message || error?.toString() || "";
      if (
        errorMsg.includes("Language Mismatch") || 
        errorMsg.includes("does not appear to be valid") || 
        errorMsg.toLowerCase().includes("mismatch")
      ) {
         setLanguageError(errorMsg);
      } else if (errorMsg.includes("429") || errorMsg.toLowerCase().includes("quota")) {
         setLanguageError("The AI API is currently rate limited (429 Too Many Requests). Please wait a minute and try again.");
      } else {
         setNotification({
           show: true,
           type: 'error',
           title: 'Analysis Failed',
           message: errorMsg || "Unknown error"
         });
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleChat = async () => {
    if (!chatInput.trim()) return;
    
    const userMessage = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsChatTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          code,
          analysis: result,
          history: chatMessages,
          apiKey: userApiKey
        })
      });

      if (!response.ok) throw new Error("Chat failed");
      const data = await response.json();
      setChatMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
    } catch (error) {
      console.error("Chat error:", error);
      setChatMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I'm having trouble connecting to the chat service. Please try again later." }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  const handleBatchAnalyze = async () => {
    if (files.length === 0) return;
    
    // Concatenate all project files into a single string with clear file headers
    const batchedCode = files.map(f => `\n\n// --- File: ${f.path || f.name} ---\n\n${f.content}`).join("");
    
    // Determine the primary language based on the most common file extension
    const langCounts = files.reduce((acc, curr) => {
      acc[curr.language] = (acc[curr.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const primaryLang = Object.keys(langCounts).reduce((a, b) => langCounts[a] > langCounts[b] ? a : b);

    // Automatically trigger analysis
    executeBatchAnalysis(batchedCode, primaryLang);
  };

  const executeBatchAnalysis = (batchedCode: string, primaryLang: string) => {
    setCode(batchedCode);
    setIsProjectMode(true);
    setLanguage(primaryLang);
    handleAnalyze(batchedCode, primaryLang);
  };

  const traverseFileTree = async (entry: any, path = ""): Promise<FileItem[]> => {
    const files: FileItem[] = [];
    if (entry.isFile) {
      const file = await new Promise<File>((resolve) => entry.file(resolve));
      const content = await file.text();
      const lang = detectLanguage(file.name);
      files.push({
        name: file.name,
        path: path + file.name,
        content,
        language: lang
      });
    } else if (entry.isDirectory) {
      const reader = entry.createReader();
      const entries = await new Promise<any[]>((resolve) => reader.readEntries(resolve));
      for (const child of entries) {
        const childFiles = await traverseFileTree(child, path + entry.name + "/");
        files.push(...childFiles);
      }
    }
    return files;
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const items = e.dataTransfer.items;
    if (!items) return;

    const droppedFiles: FileItem[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry();
      if (entry) {
        const files = await traverseFileTree(entry);
        droppedFiles.push(...files);
      }
    }

    if (droppedFiles.length > 0) {
      setFiles(prev => [...prev, ...droppedFiles]);
      setNotification({
        show: true,
        type: 'confirm',
        title: 'Project Detected',
        message: `You dropped ${droppedFiles.length} files. Would you like to analyze this project now?`,
        onConfirm: () => {
          setNotification(null);
          // Briefly wait for state update or use local variable
          const allFiles = [...files, ...droppedFiles];
          const batchedCode = allFiles.map(f => `\n\n// --- File: ${f.path || f.name} ---\n\n${f.content}`).join("");
          const langCounts = allFiles.reduce((acc, curr) => {
            acc[curr.language] = (acc[curr.language] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          const primaryLang = Object.keys(langCounts).reduce((a, b) => langCounts[a] > langCounts[b] ? a : b);
          executeBatchAnalysis(batchedCode, primaryLang);
        }
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        const lang = detectLanguage(file.name);
        
        const newFile: FileItem = {
          name: file.name,
          content: content,
          language: lang
        };
        
        setFiles([newFile]);
        setActiveFileIndex(0);
        setCode(content);
        setLanguage(lang);
        setIsProjectMode(false);
      };
      reader.readAsText(file);
    }
  };

  const handleFolderUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = event.target.files;
    if (!filesList || filesList.length === 0) return;

    const newFiles: FileItem[] = [];
    const promises = Array.from(filesList).map((file: File) => {
      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          newFiles.push({
            name: file.name,
            content: content,
            language: detectLanguage(file.name),
            path: (file as any).webkitRelativePath
          });
          resolve();
        };
        reader.readAsText(file);
      });
    });

    Promise.all(promises).then(() => {
      const filteredFiles = newFiles.filter(f => 
        SUPPORTED_LANGUAGES.includes(f.language)
      );
      if (filteredFiles.length > 0) {
        setFiles(filteredFiles);
        setActiveFileIndex(0);
        setCode(filteredFiles[0].content);
        setLanguage(filteredFiles[0].language);
        setIsProjectMode(true);
      }
    });
  };

  const handleZipUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const zip = new JSZip();
      const contents = await zip.loadAsync(file);
      const newFiles: FileItem[] = [];

      for (const [path, zipEntry] of Object.entries(contents.files)) {
        if (!zipEntry.dir) {
          const content = await zipEntry.async('string');
          const name = path.split('/').pop() || path;
          const lang = detectLanguage(name);
          
          if (SUPPORTED_LANGUAGES.includes(lang)) {
            newFiles.push({
              name,
              content,
              language: lang,
              path
            });
          }
        }
      }

      if (newFiles.length > 0) {
        setFiles(newFiles);
        setActiveFileIndex(0);
        setCode(newFiles[0].content);
        setLanguage(newFiles[0].language);
        setIsProjectMode(true);
      }
    } catch (error) {
      console.error("Failed to process ZIP", error);
      setNotification({
        show: true,
        type: 'error',
        title: 'ZIP Processing Failed',
        message: 'Failed to process ZIP file. Please ensure it contains valid source files.'
      });
    }
  };

  const handleUrlFetch = async () => {
    if (!urlInput.trim()) return;
    
    try {
      setIsAnalyzing(true);
      const response = await fetch(`/api/fetch-url?url=${encodeURIComponent(urlInput)}`);
      if (!response.ok) throw new Error("Failed to fetch URL");
      
      const content = await response.text();
      const name = urlInput.split('/').pop() || 'fetched_file';
      const lang = detectLanguage(name);

      const newFile: FileItem = {
        name,
        content,
        language: lang
      };

      setFiles([newFile]);
      setActiveFileIndex(0);
      setCode(content);
      setLanguage(lang);
      setIsProjectMode(false);
      setShowUrlModal(false);
      setUrlInput('');
    } catch (error: any) {
      console.error("URL fetch failed", error);
      setNotification({
        show: true,
        type: 'error',
        title: 'Fetch Failed',
        message: `Failed to fetch URL: ${error.message}`
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const selectFile = (index: number) => {
    setActiveFileIndex(index);
    setCode(files[index].content);
    setLanguage(files[index].language);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  const downloadCode = (text: string, filename: string) => {
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = filename;
    document.body.appendChild(element);
    element.click();
  };

  return (
    <div className="min-h-screen font-sans">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 glass-card rounded-none border-x-0 border-t-0 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-1.5 rounded-lg">
            <Code2 className="text-white w-6 h-6" />
          </div>
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">AI Code Reviewer</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600 dark:text-slate-400">
          <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="hover:text-primary transition-colors">Home</button>
          <button onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">Code Review</button>
          <button onClick={() => document.getElementById('docs')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">Documentation</button>
          <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">About</button>
        </div>

        <div className="flex items-center gap-2 md:gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            aria-label="Toggle theme"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-slate-200" /> : <Moon className="w-5 h-5 text-slate-700" />}
          </button>
          <button 
            onClick={() => { setTempApiKey(userApiKey); setShowSettingsModal(true); }}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors text-slate-700 dark:text-slate-200"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="md:hidden sticky top-[60px] z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-lg"
          >
            <div className="flex flex-col p-4 space-y-4 text-sm font-medium text-slate-600 dark:text-slate-400">
              <button onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setIsMobileMenuOpen(false); }} className="text-left py-2 hover:text-primary flex items-center gap-2">
                Home
              </button>
              <button onClick={() => { document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); setIsMobileMenuOpen(false); }} className="text-left py-2 hover:text-primary flex items-center gap-2">
                Code Review
              </button>
              <button onClick={() => { document.getElementById('docs')?.scrollIntoView({ behavior: 'smooth' }); setIsMobileMenuOpen(false); }} className="text-left py-2 hover:text-primary flex items-center gap-2">
                Documentation
              </button>
              <button onClick={() => { document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); setIsMobileMenuOpen(false); }} className="text-left py-2 hover:text-primary flex items-center gap-2">
                About
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main 
        className="max-w-7xl mx-auto px-6 py-12 space-y-32 relative"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        {/* Drag Overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] glass-card m-6 border-4 border-dashed border-primary flex flex-col items-center justify-center p-12 bg-primary/5 backdrop-blur-md"
            >
              <div className="bg-primary/20 p-12 rounded-full mb-8 shadow-2xl shadow-primary/20">
                <Upload className="w-24 h-24 text-primary animate-bounce" />
              </div>
              <h2 className="text-5xl font-black mb-4 tracking-tighter">Drop Project Folder Here</h2>
              <p className="text-primary font-black uppercase tracking-[0.3em] text-sm">Analyze your entire project in seconds</p>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Hero Section */}
        <section id="home" className="flex flex-col lg:flex-row items-center gap-12 py-10">
          <div className="flex-1 space-y-6 text-center lg:text-left">
              <motion.h1 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-tight text-slate-900 dark:text-white"
              >
                Expert <span className="text-primary italic">8-Point</span> AI<br className="hidden md:block" /> Code Analysis
              </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto lg:mx-0 font-medium"
            >
              Get surgical <span className="text-accent font-bold">Direct Fixes</span> for Syntax, Logic, Performance, and Memory issues. Our 2.0 engine implements every optimization automatically.
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-4"
            >
              <button 
                onClick={() => document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto bg-primary text-white px-8 py-3.5 rounded-xl font-semibold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
              >
                Start Reviewing Code
              </button>
              
              <div className="flex flex-wrap justify-center lg:justify-start gap-2 w-full sm:w-auto">
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="glass-card px-4 py-3 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm"
                  title="Upload File"
                >
                  <Upload className="w-4 h-4" />
                  File
                </button>
                <button 
                  onClick={() => folderInputRef.current?.click()}
                  className="glass-card px-4 py-3 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm"
                  title="Upload Folder"
                >
                  <FolderOpen className="w-4 h-4" />
                  Folder
                </button>
                <button 
                  onClick={() => zipInputRef.current?.click()}
                  className="glass-card px-4 py-3 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm"
                  title="Upload ZIP"
                >
                  <FileArchive className="w-4 h-4" />
                  ZIP
                </button>
                <button 
                  onClick={() => { setUrlType('github'); setShowUrlModal(true); }}
                  className="glass-card px-4 py-3 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm"
                  title="GitHub Repo"
                >
                  <Github className="w-4 h-4" />
                  GitHub
                </button>
                <button 
                  onClick={() => { setUrlType('link'); setShowUrlModal(true); }}
                  className="glass-card px-4 py-3 rounded-xl font-semibold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm"
                  title="Fetch from URL"
                >
                  <LinkIcon className="w-4 h-4" />
                  Link
                </button>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
                accept=".py,.c,.cpp,.java,.js,.ts,.tsx,.jsx,.txt"
              />
              <input 
                type="file" 
                ref={folderInputRef} 
                onChange={handleFolderUpload} 
                className="hidden" 
                {...({ webkitdirectory: "", directory: "" } as any)}
              />
              <input 
                type="file" 
                ref={zipInputRef} 
                onChange={handleZipUpload} 
                className="hidden" 
                accept=".zip"
              />
            </motion.div>
          </div>
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex-1 relative"
          >
            <div className="bg-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-700 overflow-hidden">
              <div className="flex items-center gap-2 mb-4 border-b border-slate-800 pb-3">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <span className="text-xs text-slate-500 dark:text-slate-400 ml-2 font-mono">reviewer.py</span>
              </div>
              <pre className="font-mono text-sm text-blue-400 overflow-x-auto">
                <code>{`def analyze(code):
    # AI Analysis in progress...
    results = ai.process(code)
    return results.optimize()`}</code>
              </pre>
            </div>
            {/* Floating elements */}
            <div className="absolute -top-6 -right-6 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3 animate-bounce">
              <Zap className="text-yellow-500 w-6 h-6" />
              <div>
                <p className="text-xs font-bold">Optimization</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">+45% Performance</p>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Main Workspace */}
        <section id="workspace" className="space-y-8 scroll-mt-24">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold tracking-tight">Code Review Workspace</h2>
            <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
              <Terminal className="w-4 h-4" />
              <span>VS Code Style Interface</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Project Explorer (Sidebar) */}
            {isProjectMode && (
              <div className="lg:col-span-3 glass-card flex flex-col h-[600px]">
                <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                  <h3 className="font-bold text-sm flex items-center gap-2">
                    <FolderTree className="w-4 h-4" />
                    Project Explorer
                  </h3>
                  <button onClick={() => setIsProjectMode(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                  {files.map((file, idx) => (
                    <button
                      key={idx}
                      onClick={() => selectFile(idx)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-colors ${
                        activeFileIndex === idx 
                          ? 'bg-primary text-white' 
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span className="truncate">{file.path || file.name}</span>
                    </button>
                  ))}
                </div>
                <div className="p-2 border-t border-slate-200 dark:border-slate-700">
                  <button 
                    onClick={handleBatchAnalyze}
                    className="w-full bg-accent/10 hover:bg-accent/20 text-accent py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-2"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    Batch Analyze Project
                  </button>
                </div>
              </div>
            )}

            {/* Left Side: Editor */}
            <div className={`${isProjectMode ? 'lg:col-span-6' : 'lg:col-span-6'} space-y-4`}>
              <div className="glass-card glow-primary overflow-hidden flex flex-col min-h-[600px] border-slate-200/60 dark:border-slate-800/60">
                {/* Window Header */}
                <div className="bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-md px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    <div className="flex gap-1.5">
                      <div className="window-dot bg-red-400/80" />
                      <div className="window-dot bg-yellow-400/80" />
                      <div className="window-dot bg-green-400/80" />
                    </div>
                    <div className="flex items-center gap-3">
                      <select 
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[11px] font-bold uppercase tracking-wider rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary/40 appearance-none cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
                      >
                        {SUPPORTED_LANGUAGES.map(lang => (
                           <option key={lang} value={lang}>{lang === 'auto' ? 'Auto Detect' : lang}</option>
                        ))}
                      </select>
                      <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 font-mono truncate max-w-[150px]">
                        {files[activeFileIndex]?.name || `main.${language === 'auto' ? 'txt' : language}`}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => setCode('')}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors text-slate-400 hover:text-red-500 dark:text-slate-500"
                      title="Clear Code"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 relative code-editor-container group min-h-[500px]">
                  <div 
                    ref={lineNumbersRef}
                    className="line-numbers bg-slate-50/30 dark:bg-slate-900/30 py-8 font-mono"
                  >
                    {Array.from({ length: Math.max(25, (code || "").split('\n').length) }).map((_, i) => (
                      <div key={i} className="leading-6 text-[11px] pr-3">{i + 1}</div>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      e.target.style.height = 'inherit';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    onFocus={(e) => {
                      e.target.style.height = 'inherit';
                      e.target.style.height = `${e.target.scrollHeight}px`;
                    }}
                    placeholder={`Paste your ${language} code here...`}
                    wrap="off"
                    className="w-full min-h-[600px] pl-16 pr-4 py-8 bg-transparent resize-none focus:outline-none font-mono text-sm leading-6 dark:text-slate-300 placeholder:text-slate-400/50 overflow-hidden"
                    spellCheck={false}
                  />
                </div>

                <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 bg-slate-50/30 dark:bg-slate-900/30">
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !code}
                    className="flex-1 bg-primary text-white py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20 active:scale-[0.98]"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>AI Analyzing...</span>
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        <span>Analyze Code</span>
                      </>
                    )}
                  </button>
                  <button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || !code}
                    className="flex-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 py-2.5 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-50 transition-all active:scale-[0.98]"
                  >
                    <Zap className="w-4 h-4 text-warning" />
                    <span>Quick Optimize</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Right Side: Results */}
            <div className={`${isProjectMode ? 'lg:col-span-3' : 'lg:col-span-6'} space-y-6`}>
              <AnimatePresence mode="wait">
                {languageError ? (
                  <motion.div 
                    key="languageError"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="glass-card h-[600px] flex flex-col items-center justify-center text-center p-8 space-y-6 border-red-200 dark:border-red-900/30"
                  >
                    <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-3xl">
                      <ShieldAlert className="w-12 h-12 text-error" />
                    </div>
                    <div className="space-y-4 max-w-sm">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {languageError.includes("rate limited") ? "Rate Limit Exceeded" : "Language Mismatch"}
                      </h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                        {languageError}
                      </p>
                      <button 
                        onClick={() => setLanguageError(null)}
                        className="px-6 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-bold transition-transform active:scale-95"
                      >
                        Dismiss
                      </button>
                    </div>
                  </motion.div>
                ) : !result && !isAnalyzing ? (
                  <motion.div 
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="glass-card h-[600px] flex flex-col items-center justify-center text-center p-12 space-y-6 border-dashed border-2 border-slate-200 dark:border-slate-800 shadow-none bg-transparent"
                  >
                    <div className="bg-slate-100 dark:bg-slate-800/50 p-6 rounded-3xl">
                      <Layout className="w-12 h-12 text-slate-300 dark:text-slate-600" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white">Ready to Review</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[240px] leading-relaxed font-medium">Paste your code or upload a file to start the AI analysis.</p>
                    </div>
                  </motion.div>
                ) : isAnalyzing ? (
                  <motion.div 
                    key="loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="glass-card h-[600px] flex flex-col items-center justify-center p-8 space-y-8"
                  >
                    <div className="relative">
                      <div className="w-24 h-24 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
                      <Cpu className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary w-10 h-10 animate-pulse" />
                    </div>
                    <div className="text-center space-y-3">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">AI is Reviewing...</h3>
                      <div className="flex flex-col gap-1 items-center">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] animate-pulse">Running Security Checks</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Profiling Performance</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-40">Analyzing Big O</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="results"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="min-h-[600px] flex flex-col space-y-4"
                  >
                    {/* Quality Score Header */}
                    <div className="glass-card p-6 border-slate-200/60 dark:border-slate-800/60 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950">
                      <div className="flex items-start justify-between">
                        <div className="space-y-4 flex-1">
                          <div className="flex flex-col gap-1">
                             <span className="text-[9px] font-black uppercase tracking-[0.3em] text-primary animate-pulse">Analysis complete</span>
                             <h3 className="font-black text-2xl tracking-tight text-slate-900 dark:text-white">Code Intelligence</h3>
                             <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-1">Detected Language: <span className="text-primary">{result.language}</span></p>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="px-4 py-2 rounded-2xl bg-indigo-50/50 dark:bg-indigo-900/20 border border-indigo-100/50 dark:border-indigo-800/30 text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-300">
                               Advanced Review Active
                            </div>
                          </div>
                        </div>
                        
                        <div className="relative flex items-center justify-center ml-4">
                           <div className="w-20 h-20 rounded-full border-4 border-primary/20 flex items-center justify-center">
                              <div className="text-center">
                                 <Zap className="w-6 h-6 text-primary mx-auto" />
                                 <span className="text-[8px] font-black uppercase text-slate-400">Expert AI</span>
                              </div>
                           </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="glass-card p-6 flex items-center justify-between border-primary/20 bg-primary/5">
                        <div className="flex items-center gap-4">
                           <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg ${
                             (result.score || 0) >= 80 ? 'bg-emerald-500 text-white shadow-emerald-500/20' :
                             (result.score || 0) >= 50 ? 'bg-amber-500 text-white shadow-amber-500/20' :
                             'bg-red-500 text-white shadow-red-500/20'
                           }`}>
                             {result.score || 0}
                           </div>
                           <div>
                             <h4 className="text-lg font-black tracking-tight">Optimization Score</h4>
                             <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Expert Code Quality Metric</p>
                           </div>
                        </div>
                        <div className="hidden sm:block text-right">
                           <p className="text-xl font-black italic text-primary">
                             {(result.score || 0) >= 80 ? 'EXCELLENT' : (result.score || 0) >= 50 ? 'NEEDS WORK' : 'SUBOPTIMAL'}
                           </p>
                           <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">AI Analysis Conclusion</p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Syntax Errors */}
                      <div className="glass-card flex flex-col border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <FileCode className="w-4 h-4 text-red-500" />
                             <h4 className="font-black text-[10px] uppercase tracking-wider">Syntax Analysis</h4>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-[9px] font-black">{result.syntaxErrors.length}</span>
                        </div>
                        <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {result.syntaxErrors.length > 0 ? result.syntaxErrors.map((err, i) => (
                            <div key={i} className="space-y-2 p-3 rounded-xl bg-red-50/20 dark:bg-red-950/5 border border-red-100/30">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-slate-400">LINE {err.line}</span>
                                  {err.file && (
                                    <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 max-w-[100px] truncate">
                                      {err.file}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[8px] font-black bg-red-500 text-white px-1 py-0.5 rounded">CRITICAL</span>
                              </div>
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{err.issue}</p>
                              <div className="p-2 bg-white/50 dark:bg-black/20 rounded-lg text-[10px] font-mono whitespace-pre-wrap border border-red-200/10">
                                <span className="text-primary font-black uppercase text-[9px] mr-1">FIX:</span> {err.fix}
                              </div>
                            </div>
                          )) : (
                            <div className="py-8 text-center text-xs text-slate-400 italic">No syntax errors found.</div>
                          )}
                        </div>
                      </div>

                      {/* Logical Issues */}
                      <div className="glass-card flex flex-col border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <Zap className="w-4 h-4 text-amber-500" />
                             <h4 className="font-black text-[10px] uppercase tracking-wider">Logical Analysis</h4>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 text-[9px] font-black">{result.logicalIssues.length}</span>
                        </div>
                        <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {result.logicalIssues.length > 0 ? result.logicalIssues.map((issue, i) => (
                            <div key={i} className="flex gap-2 p-3 rounded-xl bg-amber-50/20 dark:bg-amber-950/5 border border-amber-100/30">
                              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{issue}</p>
                            </div>
                          )) : (
                            <div className="py-8 text-center text-xs text-slate-400 italic">No logical flaws detected.</div>
                          )}
                        </div>
                      </div>

                      {/* Performance */}
                      <div className="glass-card flex flex-col border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <Cpu className="w-4 h-4 text-emerald-500" />
                             <h4 className="font-black text-[10px] uppercase tracking-wider">Performance</h4>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 text-[9px] font-black">{result.optimizations.length}</span>
                        </div>
                        <div className="p-4 space-y-3 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {result.optimizations.length > 0 ? result.optimizations.map((opt, i) => (
                            <div key={i} className="flex gap-2 p-3 rounded-xl bg-emerald-50/20 dark:bg-emerald-950/5 border border-emerald-100/30">
                              <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 flex-shrink-0" />
                              <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{opt}</p>
                            </div>
                          )) : (
                            <div className="py-8 text-center text-xs text-slate-400 italic">Code is optimally performing.</div>
                          )}
                        </div>
                      </div>

                      {/* Memory & Edge Cases */}
                      <div className="glass-card flex flex-col border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40">
                        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                             <ShieldAlert className="w-4 h-4 text-indigo-500" />
                             <h4 className="font-black text-[10px] uppercase tracking-wider">Memory & Edge Cases</h4>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 text-[9px] font-black">{result.memoryIssues.length + result.edgeCases.length}</span>
                        </div>
                        <div className="p-4 space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                          {result.memoryIssues.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Memory & Safety</p>
                              {result.memoryIssues.map((issue, i) => (
                                <div key={i} className="flex gap-2 p-2 rounded-lg bg-indigo-50/20 dark:bg-indigo-950/5 border border-indigo-100/20">
                                  <div className="mt-1 w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0" />
                                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{issue}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          {result.edgeCases.length > 0 && (
                            <div className="space-y-2">
                              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest px-1">Edge Conditions</p>
                              {result.edgeCases.map((issue, i) => (
                                <div key={i} className="flex gap-2 p-2 rounded-lg bg-blue-50/20 dark:bg-blue-950/5 border border-blue-100/20">
                                  <div className="mt-1 w-1 h-1 rounded-full bg-blue-400 flex-shrink-0" />
                                  <p className="text-[11px] font-medium text-slate-600 dark:text-slate-400">{issue}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          {result.memoryIssues.length === 0 && result.edgeCases.length === 0 && (
                             <div className="py-8 text-center text-xs text-slate-400 italic">No memory or edge case issues.</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* Optimized Code Section */}
        {result && (
          <motion.section 
            id="optimized-workspace"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8 pt-16 border-t border-slate-200 dark:border-slate-800/60"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1 text-center sm:text-left">
                 <h3 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">Optimized Transformation</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Fully correct, idiomatic & algorithmic version</p>
              </div>
              <div className="flex items-center justify-center gap-3">
                <button 
                  onClick={() => copyToClipboard(result.optimizedFiles && result.optimizedFiles.length > 0 ? result.optimizedFiles[activeOptimizedFileIndex].content : result.optimizedCode)}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white rounded-2xl font-black text-xs transition-all shadow-sm active:scale-95 group"
                >
                  <Copy className="w-4 h-4" />
                  COPY CODE
                </button>
                <button 
                  onClick={() => {
                    const content = result.optimizedFiles && result.optimizedFiles.length > 0 ? result.optimizedFiles[activeOptimizedFileIndex].content : result.optimizedCode;
                    const filename = result.optimizedFiles && result.optimizedFiles.length > 0 ? result.optimizedFiles[activeOptimizedFileIndex].path : `optimized_${result.language.toLowerCase()}.${result.language.toLowerCase() === 'python' ? 'py' : result.language.toLowerCase() === 'javascript' ? 'js' : 'txt'}`;
                    downloadCode(content, filename);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white rounded-2xl font-black text-xs transition-all shadow-sm active:scale-95"
                >
                  <Download className="w-4 h-4" />
                  DOWNLOAD
                </button>
              </div>
            </div>

            {/* File Switcher for Projects */}
            {result.optimizedFiles && result.optimizedFiles.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar border-b border-slate-200 dark:border-slate-800">
                {result.optimizedFiles.map((file, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveOptimizedFileIndex(idx)}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap border ${
                      activeOptimizedFileIndex === idx 
                        ? 'bg-primary text-white border-primary shadow-lg shadow-primary/20' 
                        : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-800 hover:border-primary/50'
                    }`}
                  >
                    {file.path}
                  </button>
                ))}
              </div>
            )}
            
            <div className="glass-card glow-accent bg-slate-900 dark:bg-black p-8 rounded-[2.5rem] overflow-hidden border-slate-800 shadow-2xl relative min-h-[400px]">
              <div className="absolute top-6 right-8 flex gap-2 opacity-20 group-hover:opacity-100 transition-opacity">
                 <Zap className="w-4 h-4 text-emerald-400 fill-emerald-400" />
              </div>
              {result.optimizedFiles && result.optimizedFiles.length > 0 && (
                <div className="absolute top-6 left-8 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">{result.optimizedFiles[activeOptimizedFileIndex].path}</span>
                </div>
              )}
              <pre className="font-mono text-sm text-emerald-400/90 overflow-x-auto whitespace-pre-wrap leading-relaxed custom-scrollbar max-h-none min-h-[400px] selection:bg-primary/30 mt-8">
                <code>{result.optimizedFiles && result.optimizedFiles.length > 0 ? result.optimizedFiles[activeOptimizedFileIndex].content : result.optimizedCode}</code>
              </pre>
            </div>
          </motion.section>
        )}

        {/* Review History */}
        {history.length > 0 && (
          <section className="space-y-6 pt-12 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <History className="w-6 h-6 text-slate-400" />
              <h3 className="text-2xl font-bold">Review History</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {history.map((item) => (
                <div key={item.id} className="glass-card p-5 flex items-center justify-between group hover:border-primary/50 transition-colors cursor-pointer" onClick={() => { setCode(item.code); document.getElementById('workspace')?.scrollIntoView({ behavior: 'smooth' }); }}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase text-primary">{item.language}</span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">{item.date}</span>
                    </div>
                    <p className="text-sm font-bold">Score: {item.score}/100</p>
                  </div>
                  <button 
                    className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 group-hover:bg-primary group-hover:text-white transition-all"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Documentation Section */}
        <section id="docs" className="space-y-12 py-10 border-t border-slate-200 dark:border-slate-800 scroll-mt-24">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-extrabold">Expert Documentation</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">Master the AI Code Reviewer 8-Point Analysis Engine and understand how we transform your code.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="glass-card p-6 space-y-3 border-red-500/20">
              <div className="bg-red-500/10 w-10 h-10 rounded-lg flex items-center justify-center text-red-500 text-lg font-black italic">1</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Syntax Analysis</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Deep scanning across 18+ languages for missing semicolons, improper scoping, and reference errors.</p>
            </div>
            <div className="glass-card p-6 space-y-3 border-amber-500/20">
              <div className="bg-amber-500/10 w-10 h-10 rounded-lg flex items-center justify-center text-amber-500 text-lg font-black italic">2</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Logical Analysis</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Detecting infinite loops, off-by-one errors, and redundant conditions that break functionality.</p>
            </div>
            <div className="glass-card p-6 space-y-3 border-emerald-500/20">
              <div className="bg-emerald-500/10 w-10 h-10 rounded-lg flex items-center justify-center text-emerald-500 text-lg font-black italic">3</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Performance</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Surgical O(n²) to O(n) optimizations using HashMaps, Sets, and efficient iteration patterns.</p>
            </div>
            <div className="glass-card p-6 space-y-3 border-blue-500/20">
              <div className="bg-blue-500/10 w-10 h-10 rounded-lg flex items-center justify-center text-blue-500 text-lg font-black italic">4</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Memory & Safety</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">C/C++ leak detection, null pointer checks, and buffer overflow prevention for mission-critical systems.</p>
            </div>
            <div className="glass-card p-6 space-y-3 border-indigo-500/20">
              <div className="bg-indigo-500/10 w-10 h-10 rounded-lg flex items-center justify-center text-indigo-500 text-lg font-black italic">5</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Code Quality</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Enforcing best practices, consistent naming, and structural improvements for readability.</p>
            </div>
            <div className="glass-card p-6 space-y-3 border-pink-500/20">
              <div className="bg-pink-500/10 w-10 h-10 rounded-lg flex items-center justify-center text-pink-500 text-lg font-black italic">6</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Security Scan</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Identifying sanitization gaps, hardcoded credentials, and common OWASP vulnerabilities.</p>
            </div>
            <div className="glass-card p-6 space-y-3 border-cyan-500/20">
              <div className="bg-cyan-500/10 w-10 h-10 rounded-lg flex items-center justify-center text-cyan-500 text-lg font-black italic">7</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Edge Cases</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Ensuring stability against empty inputs, boundary conditions, and unexpected data types.</p>
            </div>
            <div className="glass-card p-6 space-y-3 border-violet-500/20">
              <div className="bg-violet-500/10 w-10 h-10 rounded-lg flex items-center justify-center text-violet-500 text-lg font-black italic">8</div>
              <h4 className="font-black text-xs uppercase tracking-widest">Modernization</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Suggesting modern language features (ES6+, Python 3.10+, Java 17) for efficiency.</p>
            </div>
          </div>

          <div className="glass-card p-8 space-y-8 bg-slate-950 text-white border-primary/30 shadow-2xl">
             <div className="flex items-center gap-4 border-b border-white/10 pb-4">
                <ShieldCheck className="w-8 h-8 text-primary" />
                <h3 className="text-2xl font-black italic">The AI Code Reviewer Standard</h3>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <h4 className="font-black text-primary uppercase text-xs tracking-tighter">I. Structural Parity Rule</h4>
                   <p className="text-xs text-slate-300 leading-relaxed">Our "Direct Fix" model ensures that every optimization preserves your original code's variable names and function structure unless a major algorithmic overhaul is required.</p>
                </div>
                <div className="space-y-4">
                   <h4 className="font-black text-accent uppercase text-xs tracking-tighter">II. Mandatory Fix Implementation</h4>
                   <p className="text-xs text-slate-300 leading-relaxed">Unlike basic linters, every defect listed in our analysis is GUARANTEED to be resolved in the final optimized output.</p>
                </div>
             </div>
          </div>
        </section>

        {/* About Section */}
        <section id="about" className="space-y-12 py-10 border-t border-slate-200 dark:border-slate-800 scroll-mt-24">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-extrabold">Expert Engineering</h2>
            <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">Redefining the boundary between AI insights and production-ready code.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h3 className="text-3xl font-bold">The Vision</h3>
              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                AI Code Reviewer 2.0 is more than a linter—it's a mentor. By integrating advanced 8-Point Analysis with context-aware chat, we provide the depth of a senior engineer's review in seconds. Our mission is to move beyond "suggestions" and deliver "guaranteed improvements."
              </p>
            </div>
            <div className="glass-card p-10 bg-primary/5 border-primary/20 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all" />
              <blockquote className="text-xl italic font-black text-slate-700 dark:text-slate-300 relative z-10">
                "Our technology ensures that optimized code is not just better, but truly correct. We treat every line of your project with the precision of a compiler and the insight of a human reviewer."
              </blockquote>
              <div className="mt-8 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                   <Code2 className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-extrabold text-sm tracking-tight text-slate-900 dark:text-white uppercase">The Core Team</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">Lead Optimization Architects</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-2xl font-bold text-center">Our Tech Stack</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {['React', 'TypeScript', 'Tailwind CSS', 'Python', 'FastAPI', 'Gemini AI'].map(tech => (
                <span key={tech} className="px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-sm font-medium">
                  {tech}
                </span>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* URL Modal */}
      <AnimatePresence>
        {showUrlModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card w-full max-w-md p-6 space-y-6"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  {urlType === 'github' ? <Github className="w-5 h-5" /> : <LinkIcon className="w-5 h-5" />}
                  {urlType === 'github' ? 'Import from GitHub' : 'Fetch from URL'}
                </h3>
                <button onClick={() => setShowUrlModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  {urlType === 'github' ? 'Repository or File URL' : 'Direct File URL'}
                </label>
                <input 
                  type="text" 
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder={urlType === 'github' ? 'https://github.com/user/repo' : 'https://example.com/main.py'}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  {urlType === 'github' ? 'Note: For private repos, ensure you provide a raw file link or public access.' : 'Ensure the link points directly to a raw code file.'}
                </p>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => setShowUrlModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-lg font-medium border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUrlFetch}
                  disabled={!urlInput.trim() || isAnalyzing}
                  className="flex-1 bg-primary text-white px-4 py-2.5 rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {isAnalyzing ? 'Fetching...' : 'Fetch Content'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettingsModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="glass-card w-full max-w-md p-8 space-y-8 shadow-2xl border-primary/20"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-primary/10 p-2 rounded-xl">
                    <Settings className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black tracking-tight">API Settings</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Configure your Groq AI</p>
                  </div>
                </div>
                <button onClick={() => setShowSettingsModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Groq API Key
                  </label>
                  <div className="relative">
                    <input 
                      type="password" 
                      value={tempApiKey}
                      onChange={(e) => setTempApiKey(e.target.value)}
                      placeholder="Paste your API key here..."
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-5 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all font-mono text-sm"
                    />
                    <Zap className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-warning opacity-50" />
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-500 dark:text-slate-400 px-1">
                    Your API key is stored locally in your browser and never sent to our servers except to authorize AI requests. 
                    <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1 font-bold">Get a free key here.</a>
                  </p>
                </div>

                <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-800/20">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mb-2">Pro Tip</h4>
                  <p className="text-[11px] text-indigo-700 dark:text-indigo-300 leading-relaxed">
                    If you hit rate limits, providing your own API key usually allows for more requests and faster response times.
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                <button 
                  onClick={() => setShowSettingsModal(false)}
                  className="flex-1 px-6 py-3.5 rounded-2xl font-bold text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSaveSettings}
                  className="flex-1 bg-primary text-white px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Custom Notification/Confirmation Modal */}
      <AnimatePresence>
        {notification?.show && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="glass-card w-full max-w-md p-8 space-y-6 shadow-2xl border-slate-200/50 dark:border-slate-800/50"
            >
              <div className="flex flex-col items-center text-center space-y-4">
                <div className={`p-4 rounded-3xl ${
                  notification.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-500' :
                  notification.type === 'warning' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-500' :
                  notification.type === 'confirm' ? 'bg-primary/10 text-primary' :
                  'bg-blue-50 dark:bg-blue-900/20 text-blue-500'
                }`}>
                  {notification.type === 'error' ? <ShieldAlert className="w-10 h-10" /> :
                   notification.type === 'confirm' ? <Zap className="w-10 h-10" /> :
                   <AlertCircle className="w-10 h-10" />}
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-black tracking-tight">{notification.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">
                    {notification.message}
                  </p>
                </div>
              </div>

              <div className="flex gap-4 pt-2">
                {notification.type === 'confirm' ? (
                  <>
                    <button 
                      onClick={() => setNotification(null)}
                      className="flex-1 px-6 py-3.5 rounded-2xl font-bold text-sm border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={notification.onConfirm}
                      className="flex-1 bg-primary text-white px-6 py-3.5 rounded-2xl font-bold text-sm hover:bg-primary-dark shadow-lg shadow-primary/20 transition-all active:scale-95"
                    >
                      Continue
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setNotification(null)}
                    className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-6 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-95"
                  >
                    Close
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Minimized Footer */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-8 mt-20">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <Code2 className="text-primary w-5 h-5" />
            <span className="font-bold text-lg">AI Code Reviewer</span>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-sm text-slate-500 dark:text-slate-400">
            <button onClick={() => document.getElementById('docs')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">Documentation</button>
            <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-primary transition-colors">About</button>
            <a href="#" className="hover:text-primary transition-colors">Privacy</a>
            <a href="#" className="hover:text-primary transition-colors">Terms</a>
          </div>

          <div className="flex items-center gap-4">
            <a href="#" className="text-slate-400 hover:text-primary transition-colors"><Github className="w-5 h-5" /></a>
            <a href="#" className="text-slate-400 hover:text-primary transition-colors"><Terminal className="w-5 h-5" /></a>
            <span className="text-xs text-slate-400 ml-4">© 2026 AI Code Reviewer</span>
          </div>
        </div>
      </footer>

      {/* Floating Chat Interface */}
      <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-4 pointer-events-none">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.9, y: 20, filter: 'blur(10px)' }}
              className="w-[380px] h-[520px] glass-card flex flex-col shadow-2xl border-primary/20 pointer-events-auto overflow-hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl"
            >
              {/* Chat Header */}
              <div className="bg-primary p-4 flex items-center justify-between text-white shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm uppercase tracking-tighter">AI Analysis Assistant</h4>
                    <p className="text-[9px] opacity-70 font-bold uppercase tracking-widest">Context-Aware Mentor</p>
                  </div>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                {chatMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                    <div className="bg-slate-100 dark:bg-slate-800 p-4 rounded-full">
                       <Sparkles className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-black uppercase text-slate-500">Ask anything</p>
                      <p className="text-[10px] uppercase font-bold tracking-widest">About code, review, or optimizations</p>
                    </div>
                  </div>
                ) : (
                  chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
                      <div className={`max-w-[85%] p-3 rounded-2xl text-xs leading-relaxed ${
                        msg.role === 'user' 
                          ? 'bg-primary text-white font-medium rounded-tr-none' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-tl-none border border-slate-200 dark:border-slate-700'
                      }`}>
                         {msg.content}
                      </div>
                    </div>
                  ))
                )}
                {isChatTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl rounded-tl-none flex gap-1">
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input */}
              <div className="p-4 border-t border-slate-100 dark:border-slate-800">
                <div className="relative flex gap-2">
                  <input 
                    type="text" 
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleChat()}
                    placeholder="Type your question..."
                    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <button 
                    onClick={handleChat}
                    disabled={!chatInput.trim() || isChatTyping}
                    className="bg-primary text-white p-2.5 rounded-xl hover:bg-primary-dark transition-all disabled:opacity-50 shadow-lg shadow-primary/20 active:scale-90"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <button 
          onClick={() => setIsChatOpen(!isChatOpen)}
          className="w-14 h-14 bg-primary text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all pointer-events-auto relative group overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
          {isChatOpen ? <X className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
          
          {!isChatOpen && (
            <span className="absolute -top-1 -right-1 bg-accent w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 animate-pulse" />
          )}
        </button>
      </div>
    </div>
  );
}
