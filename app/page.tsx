'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '@/lib/supabase';
import { Check, X, Loader2, Lock } from 'lucide-react';

export default function ParticipantPage() {
  const [settings, setSettings] = useState<any>(null);
  const [nickname, setNickname] = useState('');
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [joined, setJoined] = useState(false);

  // Game State
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);
  const [result, setResult] = useState<any>(null); // { correct: boolean, score: number }
  const [isAnswering, setIsAnswering] = useState(false);
  const [gameStatus, setGameStatus] = useState('CLOSED');
  const [startTime, setStartTime] = useState<number>(0);

  // 1. Mount: Check Session, Subscriptions, Initial Game State
  useEffect(() => {
    fetchSettings();
    const storedId = localStorage.getItem('auhoot_player_id');
    const storedNick = localStorage.getItem('auhoot_nickname');
    if (storedId && storedNick) {
      setPlayerId(storedId);
      setNickname(storedNick);
      // Don't set Joined=true immediately, verify first
      verifyPlayer(storedId);
    }

    // Realtime Game Control
    const channel = supabase.channel('participant_view')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'game_control' },
        (payload) => {
          const newData = payload.new;

          if (newData.game_status) {
            setGameStatus(newData.game_status);
            if (newData.game_status === 'CLOSED') {
              handleLogout();
            }
          }

          if (newData.is_active && newData.active_question_id) {
            // Only fetch if it's a DIFFERENT question or we don't have one
            // We need to access the current value, but in useEffect closure it might be stale.
            // Using a fetch check inside fetchQuestion or relying on ID comparison in the setter?
            // Simplest: Always fetch, but ensure fetchQuestion doesn't reset result if ID matches?
            // Actually, best to just fetch. The other useEffect handles restoration.
            fetchQuestion(newData.active_question_id);
          } else {
            setCurrentQuestion(null);
            setResult(null);
          }
        }
      )
      .subscribe();

    checkActiveGame();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []); // Run ONCE on mount

  // 2. Question Change: Restore Local State
  useEffect(() => {
    if (!currentQuestion?.id) return;

    // Check if we already answered THIS specific question
    if (localStorage.getItem(`auhoot_answered_${currentQuestion.id}`)) {
      const savedResult = localStorage.getItem(`auhoot_result_${currentQuestion.id}`);
      if (savedResult) {
        setResult(JSON.parse(savedResult));
        setIsAnswering(false); // Ensure input is locked
      }
    }
  }, [currentQuestion?.id]);

  // 3. Player Status Listener
  useEffect(() => {
    if (!playerId) return;

    const channel = supabase.channel('player_status')
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'players', filter: `id=eq.${playerId}` },
        (payload) => {
          handleLogout();
          alert("El juego ha sido reiniciado por el presentador.");
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [playerId]);

  const handleLogout = () => {
    // Clear specific game data but keep player ID if needed? 
    // No, logout means full reset.
    clearAnswerHistory();

    localStorage.removeItem('auhoot_player_id');
    localStorage.removeItem('auhoot_nickname');

    // Reset State instead of Reloading (Fixes Blinking/Loop)
    setPlayerId(null);
    setNickname('');
    setJoined(false);
    setResult(null);
    setCurrentQuestion(null);
    // Note: gameStatus might still be CLOSED, which render loop handles correctly without reloading
  };

  const clearAnswerHistory = () => {
    // Collect keys first to avoid issues while iterating
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('auhoot_answered_') || key.startsWith('auhoot_result_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  };

  const verifyPlayer = async (id: string) => {
    const { data, error } = await supabase.from('players').select('id').eq('id', id).single();
    if (error || !data) {
      // Player not found on server (e.g. fresh restart), force logout
      console.log("Player not valid, forcing logout");
      handleLogout();
    } else {
      setJoined(true);
    }
  };

  const fetchSettings = async () => {
    const { data } = await supabase.from('settings').select('*').single();
    if (data) setSettings(data);
  };

  const checkActiveGame = async () => {
    const { data } = await supabase.from('game_control').select('*').eq('id', 1).single();
    if (data) {
      setGameStatus(data.game_status || 'CLOSED');

      if (data.game_status === 'CLOSED') {
        handleLogout();
      }

      if (data.is_active && data.active_question_id) {
        fetchQuestion(data.active_question_id);
      } else {
        setCurrentQuestion(null);
      }
    }
  };

  const fetchQuestion = async (id: string) => {
    // Avoid double fetching/resetting if ID is same? 
    // No, we want to ensure we have latest data.
    const { data } = await supabase.from('questions').select('*').eq('id', id).single();
    if (data) {
      setCurrentQuestion(data);
      // ONLY reset result if it's a NEW question.
      // But checking currentQuestion.id here is tricky due to closure/async.
      // Instead, we always reset here, and let the `useEffect [currentQuestion.id]` restore it immediately after.
      // This might cause a split-second flash of "unanswered" state.
      // BETTER: Check local storage HERE before resetting.

      const alreadyAnswered = localStorage.getItem(`auhoot_answered_${id}`);
      if (!alreadyAnswered) {
        setResult(null);
        setIsAnswering(false);
        setStartTime(Date.now());
      }

      if (navigator.vibrate) navigator.vibrate(200);
    }
  };

  const joinGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;

    try {
      // Clear any previous session garbage before joining
      clearAnswerHistory();

      const { data, error } = await supabase.from('players').insert([{ nickname }]).select().single();
      if (error) {
        alert('Nickname might be taken, try another!');
        return;
      }

      setPlayerId(data.id);
      localStorage.setItem('auhoot_player_id', data.id);
      localStorage.setItem('auhoot_nickname', nickname);
      setJoined(true);
    } catch (err) {
      alert('Failed to join');
    }
  };

  const submitAnswer = async (index: number) => {
    if (isAnswering || result || !playerId) return;
    setIsAnswering(true);

    const isCorrect = currentQuestion.correct_option === index;
    let newScore = 0;

    if (isCorrect) {
      // Calculate Score: Base + (Remaining Seconds * Factor)
      const now = Date.now();
      const timeTaken = (now - startTime) / 1000;
      const totalTime = settings?.question_timer || 20;
      const remainingTime = Math.max(0, totalTime - timeTaken);

      const basePoints = settings?.points_base || 1000;
      const timeFactor = settings?.points_factor || 10;
      const points = basePoints + Math.floor(remainingTime * timeFactor);

      // Fetch current score first to be safe
      const { data: userData } = await supabase.from('players').select('score').eq('id', playerId).single();
      const currentScore = userData?.score || 0;
      newScore = currentScore + points;

      await supabase.from('players').update({ score: newScore }).eq('id', playerId);
    } else {
      const { data: userData } = await supabase.from('players').select('score').eq('id', playerId).single();
      newScore = userData?.score || 0;
    }

    const resultObj = { correct: isCorrect, score: newScore };
    setResult(resultObj);
    setIsAnswering(false);

    // Save to LocalStorage to prevent refresh cheating
    localStorage.setItem(`auhoot_answered_${currentQuestion.id}`, 'true');
    localStorage.setItem(`auhoot_result_${currentQuestion.id}`, JSON.stringify(resultObj));
  };

  if (!settings) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

  // CLOSED STATE
  if (gameStatus === 'CLOSED') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 font-sans transition-colors duration-500"
        style={{
          backgroundColor: settings.primary_color,
          color: settings.secondary_color,
          fontFamily: 'Inter, sans-serif'
        }}
      >
        {settings.logo_url && (
          <img src={settings.logo_url} alt="Logo" className="h-32 w-auto mb-8 object-contain" />
        )}
        <h1 className="text-3xl font-bold mb-4 text-center">{settings.game_title}</h1>
        <div className="bg-white/10 backdrop-blur-md p-6 rounded-xl border border-white/20 text-center">
          <p className="text-xl font-medium flex items-center justify-center">
            <Lock className="mr-2 w-6 h-6" /> Juego Inactivo
          </p>
          <p className="mt-2 opacity-80 text-sm">Espera a que el presentador inicie la sesión.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex flex-col font-sans transition-colors duration-500"
      style={{
        backgroundColor: settings.primary_color,
        color: settings.secondary_color,
        fontFamily: 'Inter, sans-serif'
      }}
    >
      {/* Login Screen */}
      {!joined && (
        <div className="flex-1 flex flex-col items-center justify-center p-8">
          {settings.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="h-24 w-auto mb-8 object-contain" />
          )}
          <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Unirse al Juego</h2>
            <form onSubmit={joinGame} className="space-y-4">
              <input
                type="text"
                placeholder="Tu Apodo"
                className="w-full p-4 text-lg border rounded-xl text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={15}
              />
              <button
                type="submit"
                className="w-full bg-black text-white py-4 rounded-xl text-xl font-bold hover:opacity-90 transition-opacity"
              >
                ¡Listo para Jugar!
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Waiting Screen */}
      {joined && !currentQuestion && !result && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-pulse">
          {settings.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="h-20 w-auto mb-4 object-contain" />
          )}
          <h2 className="text-xl font-bold mb-8 opacity-90">{settings.game_title}</h2>
          <h1 className="text-3xl font-bold mb-4">¡Estás dentro, {nickname}!</h1>
          <p className="text-xl opacity-80">Mira la pantalla principal...</p>
        </div>
      )}

      {/* Game Interface */}
      {joined && currentQuestion && !result && (
        <div className="flex-1 p-6 flex flex-col h-full max-h-screen pb-safe">
          {/* Question Text Display */}
          <div className="mb-6 p-6 bg-white rounded-2xl shadow-lg text-center">
            <h2 className="text-2xl font-bold text-gray-900 leading-tight">
              {currentQuestion.question_text}
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 flex-1">
            {currentQuestion.options.map((option: string, index: number) => (
              <button
                key={index}
                onClick={() => submitAnswer(index)}
                className={`rounded-2xl shadow-lg active:scale-95 transition-transform flex items-center justify-center p-4 min-h-[80px]
                  ${index === 0 ? 'bg-red-500' : ''}
                  ${index === 1 ? 'bg-blue-500' : ''}
                  ${index === 2 ? 'bg-yellow-500' : ''}
                `}
              >
                <span className="text-white text-xl font-bold leading-tight">{option}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Result Screen */}
      {joined && result && (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`flex-1 flex flex-col items-center justify-center p-8 text-center
            ${result.correct ? 'bg-green-600' : 'bg-red-600'}
            transition-colors duration-500
          `}
          style={{ color: 'white' }}
        >
          {/* Branding on Result Screen */}
          {settings.logo_url && (
            <img src={settings.logo_url} alt="Logo" className="h-16 w-auto mb-2 object-contain" />
          )}
          <p className="text-lg font-bold mb-8 opacity-80">{settings.game_title}</p>

          {result.correct ? (
            <Check className="w-32 h-32 mb-4" />
          ) : (
            <X className="w-32 h-32 mb-4" />
          )}

          {result.correct ? (
            <Check className="w-32 h-32 mb-4" />
          ) : (
            <X className="w-32 h-32 mb-4" />
          )}

          <h2 className="text-4xl font-bold mb-2">
            {result.correct ? '¡Correcto!' : '¡Incorrecto!'}
          </h2>

          {!result.correct && currentQuestion && (
            <div className="mt-4 p-4 bg-white/20 rounded-xl">
              <p className="text-sm font-bold uppercase mb-1">La respuesta era:</p>
              <p className="text-xl font-bold">{currentQuestion.options[currentQuestion.correct_option]}</p>
            </div>
          )}

          <div className="mt-8 bg-black/20 p-4 rounded-xl">
            <p className="text-sm opacity-80 uppercase tracking-widest">Puntaje Total</p>
            <p className="text-5xl font-mono font-bold">{result.score}</p>
          </div>

          <p className="mt-12 opacity-80 animate-pulse">Esperando la siguiente pregunta...</p>
        </motion.div>
      )}
    </div>
  );
}
