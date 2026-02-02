'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Trophy, LogOut } from 'lucide-react';
import QRCode from 'react-qr-code';
import LoginScreen from '@/components/LoginScreen';

export default function PresenterPage() {
    const [settings, setSettings] = useState<any>(null);
    const [questions, setQuestions] = useState<any[]>([]);
    const [currentQuestion, setCurrentQuestion] = useState<any>(null);
    const [leaderboard, setLeaderboard] = useState<any[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [timer, setTimer] = useState(0);

    // New States
    const [viewMode, setViewMode] = useState<'lobby' | 'roulette' | 'question' | 'recap'>('lobby');
    const [totalPlayers, setTotalPlayers] = useState(0);

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
        if (viewMode === 'question' && timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else if (viewMode === 'question' && timer === 0) {
            // Time's up!
            handleTimeUp();
        }
        return () => clearInterval(interval);
    }, [viewMode, timer]);

    const handleTimeUp = async () => {
        // Transition to Recap
        setViewMode('recap');
        // We do NOT clear currentQuestion here yet, so we can show the answer
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
        // Fetch top 20
        const { data } = await supabase
            .from('players')
            .select('*')
            .order('score', { ascending: false })
            .limit(20);
        if (data) setLeaderboard(data);

        // Fetch Total Count
        const { count } = await supabase
            .from('players')
            .select('*', { count: 'exact', head: true });
        if (count !== null) setTotalPlayers(count);
    };

    const startRoulette = () => {
        setViewMode('roulette');
    };

    const spinRoulette = async () => {
        if (questions.length === 0 || isSpinning) return;

        setIsSpinning(true);

        // Sound Effect
        try {
            const audio = new Audio('/spin.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log("Audio autoplay blocked", e));
        } catch (err) {
            console.error(err);
        }

        // Clear Active Question first
        setCurrentQuestion(null);
        await supabase.from('game_control').update({ active_question_id: null, is_active: false }).eq('id', 1);

        // Simulate spin duration
        const spinTime = 4000;
        const randomIndex = Math.floor(Math.random() * questions.length);
        const selected = questions[randomIndex];

        await new Promise(resolve => setTimeout(resolve, spinTime));

        await new Promise(resolve => setTimeout(resolve, spinTime));

        setCurrentQuestion(selected);
        setTimer(settings.question_timer || 20);
        setIsSpinning(false);
        setViewMode('question');

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
                fontFamily: 'Inter, sans-serif'
            }}
        >
            {/* Logout Button */}
            <button
                onClick={() => {
                    localStorage.removeItem('auhoot_presenter_session');
                    setIsAuthenticated(false);
                }}
                className="fixed top-8 right-8 bg-white/10 backdrop-blur p-2 rounded-full hover:bg-white/20 transition z-50"
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

            <main className="flex w-full max-w-[90%] space-x-12">
                {/* Left: Main Area (Lobby / Roulette / Question / Recap) */}
                <section className="flex-1 flex flex-col items-center justify-center min-h-[60vh]">
                    <AnimatePresence mode="wait">

                        {/* LOBBY VIEW */}
                        {viewMode === 'lobby' && (
                            <motion.div
                                key="lobby"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className="flex flex-col items-center text-center bg-white p-12 rounded-3xl shadow-2xl"
                            >
                                <h2 className="text-4xl font-bold text-gray-800 mb-8">¡Únete para jugar!</h2>
                                <div className="bg-white p-4 rounded-xl shadow-inner border border-gray-100 mb-8">
                                    <QRCode
                                        value="https://tabcin.aumenta.do"
                                        size={300}
                                        bgColor="#FFFFFF"
                                        fgColor="#000000"
                                        level="H"
                                    />
                                </div>
                                <p className="text-2xl font-mono font-bold text-gray-600 mb-8">tabcin.aumenta.do</p>

                                <button
                                    onClick={startRoulette}
                                    className="px-12 py-4 bg-green-600 text-white text-2xl font-bold rounded-full shadow-lg hover:bg-green-700 hover:scale-105 transition transform"
                                >
                                    INICIAR JUEGO
                                </button>
                            </motion.div>
                        )}

                        {/* ROULETTE VIEW */}
                        {viewMode === 'roulette' && (
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
                                    {/* Outer Rim */}
                                    <div className="absolute inset-0 rounded-full bg-red-700 shadow-2xl flex items-center justify-center">
                                        {/* Lights */}
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

                                    {/* Wheel */}
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
                        )}

                        {/* QUESTION VIEW */}
                        {viewMode === 'question' && currentQuestion && (
                            <motion.div
                                key="question"
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="w-full bg-white text-black rounded-2xl shadow-2xl p-8 text-center relative"
                            >
                                {/* Timer */}
                                <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full flex items-center justify-center border-4 border-white shadow-xl text-4xl font-black
                                    ${timer <= 5 ? 'bg-red-600 animate-ping' : 'bg-blue-600'} text-white
                                `}>
                                    <div className={`w-full h-full rounded-full flex items-center justify-center ${timer <= 5 ? 'bg-red-600' : 'bg-blue-600'}`}>
                                        {timer}
                                    </div>
                                </div>

                                <h2 className="text-4xl font-bold mb-8 leading-tight">{currentQuestion.question_text}</h2>
                                <div className="grid grid-cols-2 gap-6">
                                    {currentQuestion.options.map((opt: string, idx: number) => (
                                        <div
                                            key={idx}
                                            className={`p-8 rounded-xl text-2xl font-bold text-white shadow-md flex items-center justify-center
                                                ${idx === 0 ? 'bg-red-500' : ''}
                                                ${idx === 1 ? 'bg-blue-500' : ''}
                                                ${idx === 2 ? 'bg-yellow-500' : ''}
                                                ${idx === 3 ? 'bg-green-500' : ''}
                                            `}
                                        >
                                            {opt}
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* RECAP VIEW (ANSWER) */}
                        {viewMode === 'recap' && currentQuestion && (
                            <motion.div
                                key="recap"
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="w-full bg-white text-black rounded-3xl shadow-2xl p-10 text-center relative border-8 border-yellow-400"
                            >
                                <h3 className="text-2xl text-gray-400 font-bold uppercase tracking-widest mb-4">Respuesta Correcta</h3>
                                <h2 className="text-3xl font-bold mb-8 opacity-60">{currentQuestion.question_text}</h2>

                                <div className={`p-8 rounded-2xl text-4xl font-black text-white shadow-lg mb-8 transform scale-105 border-4 border-white ring-4 ring-yellow-400
                                   ${currentQuestion.correct_option === 0 ? 'bg-red-500' : ''}
                                   ${currentQuestion.correct_option === 1 ? 'bg-blue-500' : ''}
                                   ${currentQuestion.correct_option === 2 ? 'bg-yellow-500' : ''}
                                   ${currentQuestion.correct_option === 3 ? 'bg-green-500' : ''}
                               `}>
                                    {currentQuestion.options[currentQuestion.correct_option]}
                                </div>

                                <button
                                    onClick={() => setViewMode('roulette')}
                                    className="px-10 py-4 bg-indigo-600 text-white text-xl font-bold rounded-xl shadow hover:bg-indigo-700 transition"
                                >
                                    Siguiente Ronda (Jugar)
                                </button>
                            </motion.div>
                        )}

                    </AnimatePresence>
                </section>

                {/* Right: Leaderboard & Stats */}
                <aside className="w-1/3 flex flex-col gap-6">
                    {/* Total Users Counter - Fixed at top of sidebar */}
                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-white/80 text-sm font-bold uppercase tracking-wider">Jugadores</span>
                            <span className="text-white/80 text-sm font-bold uppercase tracking-wider">Conectados</span>
                        </div>
                        <div className="flex items-center justify-center w-16 h-16 rounded-full bg-white text-blue-600 text-3xl font-black shadow-lg">
                            {totalPlayers}
                        </div>
                    </div>

                    <div className="flex-1 bg-white/20 backdrop-blur-md rounded-2xl p-6 shadow-xl border border-white/30 overflow-hidden flex flex-col">
                        <div className="flex items-center space-x-3 mb-6 border-b border-white/30 pb-4 shrink-0">
                            <Trophy className="w-8 h-8 text-yellow-300" />
                            <h2 className="text-2xl font-bold">Tabla de Posiciones</h2>
                        </div>

                        <div className="space-y-3 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-white/50 scrollbar-track-transparent">
                            {leaderboard.length === 0 ? (
                                <p className="text-center opacity-70 italic">Esperando jugadores...</p>
                            ) : (
                                leaderboard.map((player, idx) => (
                                    <motion.div
                                        key={player.id}
                                        layout
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        className="flex items-center justify-between bg-white text-black px-4 py-3 rounded-xl shadow-sm"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm
                                                ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-gray-200 text-gray-600'}
                                            `}>
                                                {idx + 1}
                                            </div>
                                            <span className="font-bold text-lg truncate max-w-[140px]">{player.nickname}</span>
                                        </div>
                                        <span className="font-mono font-bold text-xl text-indigo-600">
                                            {player.score}
                                        </span>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    </div>
                </aside>
            </main>
        </div>
    );
}
