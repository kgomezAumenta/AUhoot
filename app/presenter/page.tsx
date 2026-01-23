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

        // Clear Active Question first
        setCurrentQuestion(null);
        await supabase.from('game_control').update({ active_question_id: null, is_active: false }).eq('id', 1);

        // Simulate spin duration
        const spinTime = 3000;
        const randomIndex = Math.floor(Math.random() * questions.length);
        const selected = questions[randomIndex];

        await new Promise(resolve => setTimeout(resolve, spinTime));

        setCurrentQuestion(selected);
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
                                className="text-center"
                            >
                                <motion.div
                                    animate={{ rotate: isSpinning ? 360 * 5 : 0 }}
                                    transition={{ duration: 3, ease: 'easeOut' }}
                                    className="w-64 h-64 rounded-full border-8 border-white border-dashed flex items-center justify-center mb-8 mx-auto bg-white/10 backdrop-blur-sm"
                                >
                                    <span className="text-5xl font-bold">?</span>
                                </motion.div>
                                <button
                                    onClick={spinRoulette}
                                    disabled={isSpinning || questions.length === 0}
                                    className="px-12 py-4 bg-white text-black text-2xl font-bold rounded-full shadow-2xl hover:scale-105 transition-transform disabled:opacity-50"
                                >
                                    {isSpinning ? 'GIRANDO...' : 'GIRAR RULETA'}
                                </button>
                                {questions.length === 0 && <p className="mt-4 opacity-75">No hay preguntas cargadas.</p>}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="question"
                                initial={{ y: 50, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                className="w-full bg-white text-black rounded-2xl shadow-2xl p-8 text-center"
                            >
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
