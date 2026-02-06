'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Save, RotateCcw, Upload, FileSpreadsheet, Lock, Unlock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import LoginScreen from '@/components/LoginScreen';

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('branding');
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        const session = localStorage.getItem('auhoot_admin_session');
        if (session === 'true') setIsAuthenticated(true);
    }, []);

    const handleLoginSuccess = () => {
        setIsAuthenticated(true);
        localStorage.setItem('auhoot_admin_session', 'true');
    };

    if (!isAuthenticated) return <LoginScreen onSuccess={handleLoginSuccess} />;

    return (
        <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
            <header className="mb-8 flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <h1 className="text-3xl font-bold text-gray-900">AUhoot Admin (Supabase)</h1>
                    <button
                        onClick={() => {
                            localStorage.removeItem('auhoot_admin_session');
                            setIsAuthenticated(false);
                        }}
                        className="text-sm text-red-500 hover:underline"
                    >
                        Cerrar Sesión
                    </button>
                </div>
                <nav className="flex space-x-4 bg-white p-2 rounded-lg shadow">
                    {['branding', 'questions', 'control'].map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-4 py-2 rounded-md capitalize transition-colors ${activeTab === tab
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {tab === 'branding' ? 'Marca' : tab === 'questions' ? 'Preguntas' : 'Control'}
                        </button>
                    ))}
                </nav>
            </header>

            <main className="max-w-4xl mx-auto">
                <AnimatePresence mode="wait">
                    {activeTab === 'branding' && <BrandingTab key="branding" />}
                    {activeTab === 'questions' && <QuestionsTab key="questions" />}
                    {activeTab === 'control' && <ControlTab key="control" />}
                </AnimatePresence>
            </main>
        </div>
    );
}

function BrandingTab() {
    const [settings, setSettings] = useState({
        logo_url: '',
        primary_color: '#000000',
        secondary_color: '#ffffff',
        game_title: '',
        question_timer: 20,
        points_base: 1000,
        points_factor: 10,
        questions_limit: 10,
    });
    const [uploading, setUploading] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        const { data } = await supabase.from('settings').select('*').single();
        if (data) setSettings(data);
    };

    const saveSettings = async () => {
        setLoading(true);
        await supabase.from('settings').update(settings).eq('id', 1);
        setLoading(false);
        alert('Settings saved!');
    };

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;

        setUploading(true);
        const file = e.target.files[0];
        const fileExt = file.name.split('.').pop();
        const fileName = `logo-${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('branding')
            .upload(filePath, file);

        if (uploadError) {
            console.error('Upload Error Details:', uploadError);
            alert(`Error uploading image: ${uploadError.message}`);
            setUploading(false);
            return;
        }

        const { data } = supabase.storage.from('branding').getPublicUrl(filePath);
        setSettings({ ...settings, logo_url: data.publicUrl });
        setUploading(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-xl shadow-lg"
        >
            <h2 className="text-xl font-semibold mb-6">Configuración de Marca</h2>
            <div className="grid gap-6">
                <div>
                    <label className="block text-sm font-medium mb-2">Título del Juego</label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded"
                        value={settings.game_title}
                        onChange={(e) =>
                            setSettings({ ...settings, game_title: e.target.value })
                        }
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Tiempo por Pregunta (segundos)</label>
                    <input
                        type="number"
                        min="5"
                        max="300"
                        className="w-full p-2 border rounded"
                        value={settings.question_timer}
                        onChange={(e) =>
                            setSettings({ ...settings, question_timer: parseInt(e.target.value) || 20 })
                        }
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Puntos Base (por acierto)</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded"
                            value={settings.points_base}
                            onChange={(e) =>
                                setSettings({ ...settings, points_base: parseInt(e.target.value) || 0 })
                            }
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Bonus Tiempo (pts/segundo)</label>
                        <input
                            type="number"
                            className="w-full p-2 border rounded"
                            value={settings.points_factor}
                            onChange={(e) =>
                                setSettings({ ...settings, points_factor: parseInt(e.target.value) || 0 })
                            }
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">Límite de Preguntas</label>
                    <input
                        type="number"
                        min="1"
                        className="w-full p-2 border rounded"
                        value={settings.questions_limit || 10}
                        onChange={(e) =>
                            setSettings({ ...settings, questions_limit: parseInt(e.target.value) || 10 })
                        }
                    />
                    <p className="text-xs text-gray-500 mt-1">El juego terminará después de esta cantidad de preguntas.</p>
                </div>

                {/* Supabase Storage Upload */}
                <div>
                    <label className="block text-sm font-medium mb-2">Subir Logo</label>
                    <div className="flex items-center space-x-4">
                        {settings.logo_url && (
                            <img src={settings.logo_url} className="h-12 w-12 object-contain border p-1 rounded" />
                        )}
                        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded flex items-center space-x-2">
                            <Upload size={16} />
                            <span>{uploading ? 'Subiendo...' : 'Elegir Imagen'}</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Color Primario
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="color"
                                className="h-10 w-20 rounded"
                                value={settings.primary_color}
                                onChange={(e) =>
                                    setSettings({ ...settings, primary_color: e.target.value })
                                }
                            />
                            <span className="text-sm text-gray-500">
                                {settings.primary_color}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Color Secundario
                        </label>
                        <div className="flex items-center space-x-2">
                            <input
                                type="color"
                                className="h-10 w-20 rounded"
                                value={settings.secondary_color}
                                onChange={(e) =>
                                    setSettings({ ...settings, secondary_color: e.target.value })
                                }
                            />
                            <span className="text-sm text-gray-500">
                                {settings.secondary_color}
                            </span>
                        </div>
                    </div>
                </div>
                <button
                    onClick={saveSettings}
                    disabled={loading}
                    className="bg-green-600 text-white px-6 py-2 rounded-lg font-medium flex items-center justify-center space-x-2 hover:bg-green-700 disabled:opacity-50"
                >
                    <Save size={18} />
                    <span>{loading ? 'Guardando...' : 'Guardar Cambios'}</span>
                </button>
            </div>
        </motion.div >
    );
}

function QuestionsTab() {
    const [questions, setQuestions] = useState<any[]>([]);
    const [form, setForm] = useState({
        question_text: '',
        options: ['', '', '', ''],
        correct_option: 0,
    });
    const [uploadingExcel, setUploadingExcel] = useState(false);

    const fetchQuestions = async () => {
        const { data } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
        if (data) setQuestions(data);
    };

    useEffect(() => {
        fetchQuestions();
    }, []);

    const createQuestion = async () => {
        if (!form.question_text || form.options.some((o) => !o))
            return alert('Fill all fields');

        await supabase.from('questions').insert([form]);

        setForm({
            question_text: '',
            options: ['', '', '', ''],
            correct_option: 0,
        });
        fetchQuestions();
    };

    const deleteQuestion = async (id: string) => {
        if (!confirm('Are you sure?')) return;
        await supabase.from('questions').delete().eq('id', id);
        fetchQuestions();
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check for valid configuration
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project')) {
            alert('CRITICAL ERROR: Supabase is not configured.\nPlease update .env.local with your real Supabase URL and Anon Key.');
            return;
        }

        setUploadingExcel(true);

        try {
            // Dynamic import to avoid chunk load errors
            const XLSX = await import('xlsx');

            const reader = new FileReader();

            reader.onload = async (evt) => {
                try {
                    const bstr = evt.target?.result;
                    const wb = XLSX.read(bstr, { type: 'binary' });
                    const wsname = wb.SheetNames[0];
                    const ws = wb.Sheets[wsname];
                    const data: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

                    // New Format: [Question, Opt1, Opt2, Opt3, CorrectIndex(1-3)]
                    const rows = data.filter(row => row.length >= 5);
                    const newQuestions = [];

                    for (let i = 0; i < rows.length; i++) {
                        const row = rows[i];
                        if (row[0] === 'Question' || row[0] === 'Pregunta') continue;

                        const questionText = row[0];
                        const options = [
                            String(row[1] || ''),
                            String(row[2] || ''),
                            String(row[3] || '')
                        ];
                        // Correct index is in Column E (index 4)
                        const correctVal = parseInt(row[4]);
                        const correctOption = isNaN(correctVal) ? 0 : Math.max(0, Math.min(2, correctVal - 1));

                        if (questionText && options.every(o => o)) {
                            newQuestions.push({
                                question_text: questionText,
                                options,
                                correct_option: correctOption
                            });
                        }
                    }

                    if (newQuestions.length > 0) {
                        const { error } = await supabase.from('questions').insert(newQuestions);
                        if (error) throw error;
                        alert(`Successfully imported ${newQuestions.length} questions!`);
                        fetchQuestions();
                    } else {
                        alert('No valid questions found. Ensure 5 columns: Question, Opt1, Opt2, Opt3, Correct(1-3)');
                    }

                } catch (error: any) {
                    console.error(error);
                    alert('Error parsing Excel: ' + error.message);
                } finally {
                    setUploadingExcel(false);
                    if (e.target) e.target.value = '';
                }
            };
            reader.readAsBinaryString(file);
        } catch (err) {
            console.error("Failed to load xlsx", err);
            alert("Failed to load Excel parser.");
            setUploadingExcel(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
        >
            <div className="bg-white p-6 rounded-xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Add New Question</h2>
                    <label className="cursor-pointer bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 text-sm shadow-sm transition-colors">
                        <FileSpreadsheet size={18} />
                        <span>{uploadingExcel ? 'Importing...' : 'Import Excel'}</span>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            className="hidden"
                            onChange={handleExcelUpload}
                            disabled={uploadingExcel}
                        />
                    </label>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Question</label>
                        <input
                            type="text"
                            className="w-full p-2 border rounded"
                            value={form.question_text}
                            onChange={(e) => setForm({ ...form, question_text: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {form.options.map((opt, idx) => (
                            <div key={idx}>
                                <label className="block text-xs font-medium mb-1 text-gray-500">
                                    Option {idx + 1}
                                </label>
                                <div className="flex items-center space-x-2">
                                    <input
                                        type="radio"
                                        name="correct"
                                        checked={form.correct_option === idx}
                                        onChange={() => setForm({ ...form, correct_option: idx })}
                                    />
                                    <input
                                        type="text"
                                        className="w-full p-2 border rounded text-sm"
                                        value={opt}
                                        onChange={(e) => {
                                            const newOpts = [...form.options];
                                            newOpts[idx] = e.target.value;
                                            setForm({ ...form, options: newOpts });
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <button
                        onClick={createQuestion}
                        className="w-full bg-blue-600 text-white py-2 rounded-lg flex items-center justify-center space-x-2 hover:bg-blue-700"
                    >
                        <Plus size={18} />
                        <span>Add Question</span>
                    </button>
                </div>
            </div>

            <div className="bg-white p-6 rounded-xl shadow-lg">
                <h2 className="text-xl font-semibold mb-4">Question Bank</h2>
                <div className="space-y-2">
                    {questions.map((q) => (
                        <div
                            key={q.id}
                            className="flex items-center justify-between p-3 border rounded bg-gray-50 hover:bg-gray-100"
                        >
                            <div>
                                <p className="font-medium">{q.question_text}</p>
                                <p className="text-xs text-gray-500">
                                    Ans: {q.options[q.correct_option]}
                                </p>
                            </div>
                            <button
                                onClick={() => deleteQuestion(q.id)}
                                className="text-red-500 hover:text-red-700 p-2"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}

function ControlTab() {
    const [gameStatus, setGameStatus] = useState('CLOSED');

    useEffect(() => {
        fetchStatus();
    }, []);

    const fetchStatus = async () => {
        const { data } = await supabase.from('game_control').select('game_status').eq('id', 1).single();
        if (data && data.game_status) setGameStatus(data.game_status);
    };

    const toggleGameStatus = async () => {
        const newStatus = gameStatus === 'OPEN' ? 'CLOSED' : 'OPEN';
        await supabase.from('game_control').update({ game_status: newStatus }).eq('id', 1);
        setGameStatus(newStatus);

        if (newStatus === 'CLOSED') {
            // Also deactivate current question just in case
            await supabase.from('game_control').update({ active_question_id: null, is_active: false }).eq('id', 1);
        }
    };

    const resetGame = async () => {
        if (
            !confirm(
                '¿Estás SEGURO? Esto borrará el puntaje de todos los jugadores y reiniciará el juego.'
            )
        )
            return;

        // 1. Delete all players
        await supabase.from('players').delete().neq('nickname', '___'); // Delete all rows
        // 2. Reset active question AND Close Game to force logout
        await supabase.from('game_control').update({ active_question_id: null, is_active: false, game_status: 'CLOSED' }).eq('id', 1);
        setGameStatus('CLOSED');

        alert('El juego ha sido reiniciado');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
        >
            {/* Game Status Toggle */}
            <div className="bg-white p-6 rounded-xl shadow-lg flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-semibold mb-1">Estado del Juego</h2>
                    <p className={`text-lg font-bold ${gameStatus === 'OPEN' ? 'text-green-600' : 'text-red-600'}`}>
                        {gameStatus === 'OPEN' ? '🟢 ABIERTO (Jugadores pueden unirse)' : '🔴 CERRADO (Juego Inactivo)'}
                    </p>
                </div>
                <button
                    onClick={toggleGameStatus}
                    className={`px-8 py-3 rounded-lg font-bold shadow transition-colors text-white
                        ${gameStatus === 'OPEN' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}
                    `}
                >
                    {gameStatus === 'OPEN' ? <span className="flex items-center"><Lock className="mr-2" /> CERRAR JUEGO</span> : <span className="flex items-center"><Unlock className="mr-2" /> ABRIR JUEGO</span>}
                </button>
            </div>


            <div className="bg-white p-6 rounded-xl shadow-lg border-l-4 border-red-500">
                <h2 className="text-xl font-bold text-red-600 mb-4 flex items-center">
                    <RotateCcw className="mr-2" /> Zona de Peligro
                </h2>
                <p className="text-gray-600 mb-6">
                    Esta acción eliminará a todos los jugadores de la tabla de posiciones y desactivará cualquier pregunta activa. Úsala solo para iniciar una nueva sesión completa.
                </p>
                <button
                    onClick={resetGame}
                    className="bg-red-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-red-700 transition w-full md:w-auto"
                >
                    REINICIAR JUEGO (BORRAR TODO)
                </button>
            </div>
        </motion.div>
    );
}
