'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Save, RotateCcw, Upload, FileSpreadsheet } from 'lucide-react';
import { supabase } from '@/lib/supabase';


export default function AdminPage() {
    const [activeTab, setActiveTab] = useState('branding');

    return (
        <div className="min-h-screen bg-gray-100 p-8 font-sans text-gray-800">
            <header className="mb-8 flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900">AUhoot Admin (Supabase)</h1>
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
                            {tab}
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
            <h2 className="text-xl font-semibold mb-6">Branding Configuration</h2>
            <div className="grid gap-6">
                <div>
                    <label className="block text-sm font-medium mb-2">Game Title</label>
                    <input
                        type="text"
                        className="w-full p-2 border rounded"
                        value={settings.game_title}
                        onChange={(e) =>
                            setSettings({ ...settings, game_title: e.target.value })
                        }
                    />
                </div>

                {/* Supabase Storage Upload */}
                <div>
                    <label className="block text-sm font-medium mb-2">Logo Upload</label>
                    <div className="flex items-center space-x-4">
                        {settings.logo_url && (
                            <img src={settings.logo_url} className="h-12 w-12 object-contain border p-1 rounded" />
                        )}
                        <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded flex items-center space-x-2">
                            <Upload size={16} />
                            <span>{uploading ? 'Uploading...' : 'Choose Image'}</span>
                            <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
                        </label>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">
                            Primary Color
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
                            Secondary Color
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
                    <span>{loading ? 'Saving...' : 'Save Branding'}</span>
                </button>
            </div>
        </motion.div>
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
    const resetGame = async () => {
        if (
            !confirm(
                'This will delete all participants and scores, and reset active question. Are you sure?'
            )
        )
            return;

        // 1. Delete all players
        await supabase.from('players').delete().neq('nickname', '___'); // Delete all rows
        // 2. Reset active question
        await supabase.from('game_control').update({ active_question_id: null, is_active: false }).eq('id', 1);

        alert('Game has been reset');
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-white p-6 rounded-xl shadow-lg"
        >
            <h2 className="text-xl font-semibold mb-4 text-red-600">Danger Zone</h2>
            <p className="text-gray-600 mb-6">
                Use these controls to manage the live game session. Resetting the game
                will clear all player data.
            </p>
            <button
                onClick={resetGame}
                className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold flex items-center space-x-2 hover:bg-red-700 shadow-md"
            >
                <RotateCcw size={20} />
                <span>RESET GAME & PARTICIPANTS</span>
            </button>
        </motion.div>
    );
}
