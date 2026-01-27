'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Trophy, LogOut } from 'lucide-react';
import LoginScreen from '@/components/LoginScreen';

export default function PresenterPage() {
    const [settings, setSettings] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [timer, setTimer] = useState(0);

    useEffect(() => {
        const session = localStorage.getItem('auhoot_presenter_session');
        if (session === 'true') setIsAuthenticated(true);

        // 1. Fetch Branding & Questions
        fetchDisplayData();

        // 2. Realtime Leaderboard (Players table changes)
        const channel = supabase.channel('presenter_view')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'players' },
                (payload) => {
                    fetchLeaderboard();
                }
            )
            .subscribe();

        fetchLeaderboard(); // Initial load

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Countdown Timer Effect
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (currentQuestion && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (currentQuestion && timer === 0) {
            // Time's up!
            handleTimeUp();
        }
        return () => clearInterval(interval);
    }, [currentQuestion, timer]);

    const handleTimeUp = async () => {
        // Close question / Stop Game
        setCurrentQuestion(null);
        await supabase.from('game_control').update({ active_question_id: null, is_active: false }).eq('id', 1);
    };

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
        localStorage.setItem('auhoot_presenter_session', 'true');
    };

    const fetchDisplayData = async () => {
        const { data: settingsData } = await supabase.from('settings').select('*').single();
        if (settingsData) setSettings(settingsData);

        const { data: questionsData } = await supabase.from('questions').select('*');
        if (questionsData) setQuestions(questionsData);
    };

    const fetchLeaderboard = async () => {
        const { data } = await supabase
            .from('players')
            .select('*')
            .order('score', { ascending: false })
            .order('score', { ascending: false })
            .limit(20);
        if (data) setLeaderboard(data);
    };

    const spinRoulette = async () => {
        if (questions.length === 0 || isSpinning) return;

        setIsSpinning(true);

        // Sound Effect
        try {
            const audio = new Audio('/spin.mp3'); // Ensure this file exists in public/
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio autoplay blocked", e));
        } catch (err) {
            console.error(err);
        }

        // Clear Active Question first
        setCurrentQuestion(null);
        await supabase.from('game_control').update({ active_question_id: null, is_active: false }).eq('id', 1);

        // Simulate spin duration
        const spinTime = 4000; // Increased duration for better effect
        const randomIndex = Math.floor(Math.random() * questions.length);
        const selected = questions[randomIndex];

        await new Promise(resolve => setTimeout(resolve, spinTime));

        await new Promise(resolve => setTimeout(resolve, spinTime));

        setCurrentQuestion(selected);
        setTimer(settings.question_timer || 20); // Default 20s
        setIsSpinning(false);

        // Update Game Control to show question to everyone
        await supabase.from('game_control').update({ active_question_id: selected.id, is_active: true }).eq('id', 1);
    };

    if (!isAuthenticated) return <LoginScreen onSuccess={handleLoginSuccess} />;
    if (!settings) return <div className="p-8 text-center text-white font-bold text-xl">Cargando Estudio...</div>;

    return (
        <div
            className="min-h-screen flex flex-col items-center justify-center p-8 font-sans transition-colors duration-500"
            style={{
                backgroundColor: settings.primary_color,
                color: settings.secondary_color,
                fontFamily: 'Inter, sans-serif' // Fallback or add to settings if needed
            }}
        >
            {/* Logout Button */}
            <button
                onClick={() => {
                    localStorage.removeItem('auhoot_presenter_session');
                    setIsAuthenticated(false);
                }}
                className="fixed top-8 right-8 bg-white/10 backdrop-blur p-2 rounded-full hover:bg-white/20 transition"
                title="Cerrar Sesión"
            >
                <LogOut className="w-6 h-6 text-white" />
            </button>

            {/* Branding Header */}
            <header className="absolute top-8 left-8 flex flex-col space-y-2">
                {settings.logo_url && (
                    <img src={settings.logo_url} alt="Logo" className="h-32 w-auto object-contain" />
                )}
                <h1 className="text-3xl font-bold tracking-tight opacity-90">{settings.game_title}</h1>
            </header>

            <main className="flex w-full max-w-6xl space-x-12">
                {/* Left: Roulette / Question Area */}
                <section className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                    <AnimatePresence mode="wait">
                        {!currentQuestion ? (
                            <motion.div
                                key="roulette"
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.8, opacity: 0 }}
                                className="text-center relative"
                            >
                                {/* Pointer */}
                                <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-20">
                                    <div className="w-0 h-0 border-l-[25px] border-l-transparent border-t-[50px] border-t-yellow-400 border-r-[25px] border-r-transparent drop-shadow-2xl filter drop-shadow-lg"></div>
                                </div>

                                <div className="relative w-[500px] h-[500px] mx-auto mb-12">
                                    {/* Outer Rim with Lights */}
                                    <div className="absolute inset-0 rounded-full bg-red-700 shadow-2xl flex items-center justify-center">
                                        {/* Light Bulbs */}
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <div
                                                key={i}
                                                className="absolute w-4 h-4 bg-yellow-200 rounded-full shadow-[0_0_10px_rgba(253,224,71,0.8)]"
                                                style={{
                                                    top: '50%',
                                                    left: '50%',
                                                    transform: `rotate(${i * 30}deg) translate(240px) rotate(-${i * 30}deg)`
                                                }}
                                            />
                                        ))}
                                    </div>

                                    {/* The Wheel */}
                                    <motion.div
                                        animate={{ rotate: isSpinning ? 360 * 6 + Math.floor(Math.random() * 360) : 0 }}
                                        transition={{ duration: 4, ease: [0.2, 0.8, 0.2, 1] }}
                                        className="absolute inset-[20px] rounded-full overflow-hidden border-4 border-white/50"
                                        style={{
                                            background: `conic-gradient(
                                                #ef4444 0deg 30deg, 
                                                #f97316 30deg 60deg, 
                                                #eab308 60deg 90deg, 
                                                #84cc16 90deg 120deg, 
                                                #22c55e 120deg 150deg, 
                                                #10b981 150deg 180deg, 
                                                #06b6d4 180deg 210deg, 
                                                #3b82f6 210deg 240deg, 
                                                #6366f1 240deg 270deg, 
                                                #8b5cf6 270deg 300deg, 
                                                #d946ef 300deg 330deg, 
                                                #f43f5e 330deg 360deg
                                            )`
                                        }}
                                    >
                                        {/* Segments (Visual separation lines if needed, or rely on gradient) */}
                                        <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
                                    </motion.div>

                                    {/* Center Hub */}
                                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-white rounded-full shadow-[inset_0_2px_10px_rgba(0,0,0,0.2)] flex items-center justify-center border-8 border-gray-100 z-10">
                                        <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-400 rounded-full flex items-center justify-center">
                                            <span className="text-2xl font-black text-gray-600 select-none">?</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={spinRoulette}
                                    disabled={isSpinning || questions.length === 0}
                                    className="px-16 py-6 bg-gradient-to-b from-yellow-400 to-yellow-600 text-white text-3xl font-black rounded-full shadow-[0_10px_0_rgb(161,98,7)] hover:translate-y-1 hover:shadow-[0_5px_0_rgb(161,98,7)] active:translate-y-2 active:shadow-none transition-all uppercase tracking-wider transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSpinning ? '¡Girando!' : 'Girar Ahora'}
                                </button>
                                {questions.length === 0 && <p className="mt-6 text-xl font-medium opacity-80">⚠ Carga preguntas en el Admin para empezar.</p>}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="question"
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="w-full bg-white text-black rounded-2xl shadow-2xl p-8 text-center relative"
                            >
                                {/* Timer Display */}
                                <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full flex items-center justify-center border-4 border-white shadow-xl text-4xl font-black
                                    ${timer <= 5 ? 'bg-red-600 animate-ping' : 'bg-blue-600'} text-white
                                `}>
                                    <div className={`w-full h-full rounded-full flex items-center justify-center ${timer <= 5 ? 'bg-red-600' : 'bg-blue-600'}`}>
                                        {timer}
                                    </div>
                                </div>

                                <h2 className="text-3xl font-bold mb-8">{currentQuestion.question_text}</h2>
                                <div className="grid grid-cols-3 gap-4">
                                    {currentQuestion.options.map((opt: string, idx: number) => (
                                        <div
                                            key={idx}
                                            className={`p-4 rounded-xl text-xl font-medium text-white shadow-md
                        ${idx === 0 ? 'bg-red-500' : ''}
                        ${idx === 1 ? 'bg-blue-500' : ''}
                        ${idx === 2 ? 'bg-yellow-500' : ''}
                      `}
                                        >
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                                <button
                                    onClick={() => {
                                        setCurrentQuestion(null);
                                        supabase.from('game_control').update({ active_question_id: null, is_active: false }).eq('id', 1);
                                    }}
                                    className="mt-8 px-6 py-2 text-gray-500 hover:text-gray-900 underline"
                                >
                                    Volver a la Ruleta
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </section>

                {/* Right: Leaderboard */}
                <aside className="w-1/3 bg-white/20 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30">
                    <div className="flex items-center space-x-3 mb-6 border-b border-white/30 pb-4">
                        <Trophy className="w-8 h-8 text-yellow-300" />
                        <h2 className="text-2xl font-bold">Tabla de Posiciones</h2>
                    </div>

                    <div className="space-y-4">
                        {leaderboard.length === 0 ? (
                            <p className="text-center opacity-70 italic">Esperando jugadores...</p>
                        ) : (
                            leaderboard.map((player, idx) => (
                                <motion.div
                                    key={player.id}
                                    layout
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="flex items-center justify-between bg-white text-black px-3 py-1.5 rounded shadow-sm"
                                >
                                    <div className="flex items-center space-x-2">
                                        <span className="font-bold text-gray-500 text-sm w-5">#{idx + 1}</span>
                                        <span className="font-semibold text-base truncate max-w-[150px]">{player.nickname}</span>
                                    </div>
                                    <span className="font-mono font-bold text-lg text-purple-600">
                                        {player.score}
                                    </span>
                                </motion.div>
                            ))
                        )}
                    </div>
                </aside>
            </main>
        </div>
    );
}
