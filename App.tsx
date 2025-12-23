
import React, { useState } from 'react';
import { AppStage, UserData, InterviewResult } from './types';
import RegistrationForm from './components/RegistrationForm';
import InterviewSession from './components/InterviewSession';
import ResultsView from './components/ResultsView';

const App: React.FC = () => {
  const [stage, setStage] = useState<AppStage>(AppStage.REGISTRATION);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [result, setResult] = useState<InterviewResult | null>(null);

  const handleRegistration = (data: UserData) => {
    setUserData(data);
    setStage(AppStage.PREPARATION);
  };

  const startInterview = () => {
    setStage(AppStage.INTERVIEW);
  };

  const finishInterview = (interviewResult: InterviewResult) => {
    setResult(interviewResult);
    setStage(AppStage.COMPLETED);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-950 selection:bg-orange-500/30">
      <header className="fixed top-0 w-full p-8 text-center z-10">
        <div className="inline-flex items-center gap-3 bg-slate-900/50 backdrop-blur-xl px-6 py-2 rounded-full border border-white/5 shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
          <h1 className="text-sm font-black uppercase tracking-[0.3em] text-orange-400">
            AWS Architecture Assessor
          </h1>
        </div>
      </header>

      <main className="w-full max-w-6xl mt-24">
        {stage === AppStage.REGISTRATION && (
          <RegistrationForm onComplete={handleRegistration} />
        )}

        {stage === AppStage.PREPARATION && (
          <div className="bg-slate-900/50 backdrop-blur-xl p-12 rounded-[2.5rem] border border-slate-800 shadow-2xl animate-fade-in text-center max-w-2xl mx-auto ring-1 ring-white/5">
            <h2 className="text-4xl font-black mb-4 tracking-tighter italic text-white">READY, {userData?.name}?</h2>
            <p className="text-slate-500 text-sm mb-10 leading-relaxed font-medium uppercase tracking-widest">
              Secured Session • Technical Evaluation • AWS Standard v2024
            </p>
            
            <div className="grid grid-cols-2 gap-4 mb-10 text-left">
               <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800">
                  <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Duration</h4>
                  <p className="text-xl font-bold text-white">08:00 MIN</p>
               </div>
               <div className="bg-slate-950 p-5 rounded-3xl border border-slate-800">
                  <h4 className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-2">Focus</h4>
                  <p className="text-xl font-bold text-white">NETWORKING</p>
               </div>
            </div>

            <button
              onClick={startInterview}
              className="group relative px-12 py-5 bg-white text-black rounded-full font-black uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(255,255,255,0.1)]"
            >
              Initiate Assessment
              <div className="absolute inset-0 rounded-full group-hover:blur-xl transition-all duration-500 opacity-0 group-hover:opacity-20 bg-white" />
            </button>
          </div>
        )}

        {stage === AppStage.INTERVIEW && userData && (
          <InterviewSession userData={userData} onComplete={finishInterview} />
        )}

        {stage === AppStage.COMPLETED && result && userData && (
          <ResultsView userData={userData} result={result} />
        )}
      </main>

      <footer className="fixed bottom-6 text-slate-700 font-black text-[9px] uppercase tracking-[0.4em]">
        Proprietary AWS AI Engine • Unauthorized Duplication Strictly Prohibited
      </footer>
    </div>
  );
};

export default App;
