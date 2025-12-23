
import React, { useEffect, useState } from 'react';
import { UserData, InterviewResult } from '../types';
import { sendToTelegram } from '../services/telegramService';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface ResultsViewProps {
  userData: UserData;
  result: InterviewResult;
}

const ResultsView: React.FC<ResultsViewProps> = ({ userData, result }) => {
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  const chartData = [
    { name: 'Score', value: result.score },
    { name: 'Gap', value: 100 - result.score },
  ];

  const COLORS = ['#f97316', 'rgba(255,255,255,0.05)'];

  useEffect(() => {
    const handleSend = async () => {
      setIsSending(true);
      try {
        await sendToTelegram(userData, result);
        setSent(true);
      } catch (err) {
        console.error("Transmission fault", err);
      } finally {
        setIsSending(false);
      }
    };
    handleSend();
  }, [userData, result]);

  return (
    <div className="max-w-5xl mx-auto w-full animate-fade-in pb-20">
      {/* Header Summary */}
      <div className="relative mb-12 p-1 bg-gradient-to-r from-orange-500/20 via-white/5 to-transparent rounded-[3rem]">
        <div className="bg-slate-950/80 backdrop-blur-3xl rounded-[2.9rem] p-10 md:p-14 flex flex-col md:flex-row items-center gap-10 border border-white/5 shadow-2xl">
          
          {/* Score Visualization */}
          <div className="relative w-48 h-48 md:w-64 md:h-64 shrink-0">
             <div className="absolute inset-0 rounded-full bg-orange-500/5 blur-3xl animate-pulse"></div>
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={chartData}
                   cx="50%"
                   cy="50%"
                   innerRadius="75%"
                   outerRadius="90%"
                   paddingAngle={0}
                   dataKey="value"
                   stroke="none"
                   startAngle={90}
                   endAngle={-270}
                 >
                   {chartData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index]} className="transition-all duration-1000" />
                   ))}
                 </Pie>
               </PieChart>
             </ResponsiveContainer>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl md:text-7xl font-black text-white italic tracking-tighter">{result.score}</span>
                <span className="text-[10px] font-black text-orange-500 tracking-[0.4em] uppercase">Percentile</span>
             </div>
          </div>

          <div className="flex-1 text-center md:text-left">
            <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter italic mb-4 leading-none uppercase">ASSESSMENT<br/>LOCKED</h2>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-6">
              <div className="bg-white/5 px-4 py-1.5 rounded-full border border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                ID: {userData.name.split(' ')[0]}_{Math.floor(Math.random()*999)}
              </div>
              <div className="bg-orange-500/10 px-4 py-1.5 rounded-full border border-orange-500/20 text-[10px] font-bold text-orange-500 uppercase tracking-widest">
                CERTIFIED V2.4
              </div>
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-lg font-medium">
              "{result.feedback}"
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Strengths */}
        <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 shadow-xl hover:border-green-500/30 transition-colors">
          <header className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Technical Proficiencies</h3>
          </header>
          <div className="flex flex-wrap gap-3">
            {result.strengths.map((s, i) => (
              <div key={i} className="px-5 py-3 bg-slate-950/80 rounded-2xl border border-white/5 text-sm font-bold text-green-400 shadow-inner">
                {s}
              </div>
            ))}
            {result.strengths.length === 0 && <span className="text-slate-600 text-xs italic">No specific strengths logged.</span>}
          </div>
        </div>

        {/* Weaknesses */}
        <div className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-[2rem] border border-white/5 shadow-xl hover:border-red-500/30 transition-colors">
          <header className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em]">Vulnerability Gaps</h3>
          </header>
          <div className="flex flex-wrap gap-3">
            {result.weaknesses.map((w, i) => (
              <div key={i} className="px-5 py-3 bg-slate-950/80 rounded-2xl border border-white/5 text-sm font-bold text-red-400 shadow-inner">
                {w}
              </div>
            ))}
            {result.weaknesses.length === 0 && <span className="text-slate-600 text-xs italic">Zero critical failures identified.</span>}
          </div>
        </div>
      </div>

      {/* Telegram Transmission Box */}
      <div className="mt-12 flex flex-col items-center">
        <div className={`px-10 py-5 rounded-full border transition-all duration-700 flex items-center gap-4 shadow-2xl ${sent ? 'bg-green-500/10 border-green-500/30 text-green-400' : 'bg-slate-900/50 border-white/10 text-slate-400'}`}>
           {isSending ? (
             <>
               <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
               <span className="text-xs font-black uppercase tracking-widest">Transmitting Technical Dossier...</span>
             </>
           ) : sent ? (
             <>
               <svg className="w-6 h-6 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
                 <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
               </svg>
               <span className="text-xs font-black uppercase tracking-widest">Report Verified on Telegram Node</span>
             </>
           ) : (
             <span className="text-xs font-black uppercase tracking-widest text-red-500">Node Transmission Error</span>
           )}
        </div>
        <button 
          onClick={() => window.location.reload()}
          className="mt-8 text-[9px] font-black text-slate-600 uppercase tracking-[0.5em] hover:text-white transition-colors underline decoration-slate-800 underline-offset-8"
        >
          Exit Assessment Interface
        </button>
      </div>
    </div>
  );
};

export default ResultsView;
