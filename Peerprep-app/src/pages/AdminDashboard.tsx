import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit2, Trash2, LogOut, Database, AlertCircle, Upload, X } from 'lucide-react';
import { Button } from '../components/Button';
import { Table } from '../components/Table';
import { Modal } from '../components/Modal';
import { Input } from '../components/Input';
import { Select } from '../components/Select';
import './AdminDashboard.css';

// --- Types & Placeholder Data ---
interface Question {
    id: string;
    title: string;
    topics: string[];
    difficulty: 'easy' | 'medium' | 'hard';
    description?: string;
    mediaUrl?: string;
}

const INITIAL_QUESTIONS: Question[] = [
    { id: '1', title: 'Two Sum', topics: ['Arrays', 'Hash Table'], difficulty: 'easy' },
    { id: '2', title: 'Reverse Linked List', topics: ['Linked List'], difficulty: 'easy' },
    { id: '3', title: 'Container With Most Water', topics: ['Two Pointers', 'Arrays'], difficulty: 'medium' },
    { id: '4', title: 'LRU Cache', topics: ['Design', 'Hash Table', 'Linked List'], difficulty: 'medium' },
    { id: '5', title: 'Merge K Sorted Lists', topics: ['Linked List', 'Divide and Conquer', 'Heap'], difficulty: 'hard' },
];

const AVAILABLE_TOPICS = [
    'Arrays', 'Strings', 'Linked List', 'Trees', 'Graphs',
    'Dynamic Programming', 'Math', 'Sorting', 'Hash Table',
    'Two Pointers', 'Binary Search', 'Design', 'Heap', 'Divide and Conquer'
];

export const AdminDashboard: React.FC = () => {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);

    // Modal States
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

    // Form State
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<Omit<Question, 'id'>>({
        title: '',
        topics: [],
        difficulty: 'easy',
        description: '',
        mediaUrl: '',
    });
    const [questionToDelete, setQuestionToDelete] = useState<Question | null>(null);

    // --- Handlers ---
    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({ title: '', topics: [], difficulty: 'easy', description: '', mediaUrl: '' });
        setIsFormModalOpen(true);
    };

    const handleOpenEdit = (q: Question) => {
        setEditingId(q.id);
        setFormData({ title: q.title, topics: [...q.topics], difficulty: q.difficulty, description: q.description || '', mediaUrl: q.mediaUrl || '' });
        setIsFormModalOpen(true);
    };

    const handleOpenDelete = (q: Question) => {
        setQuestionToDelete(q);
        setIsDeleteModalOpen(true);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const url = URL.createObjectURL(file);
            setFormData(prev => ({ ...prev, mediaUrl: url }));
        }
    };

    const handleRemoveMedia = () => {
        setFormData(prev => ({ ...prev, mediaUrl: '' }));
    };

    const handleTopicSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selectedTopic = e.target.value;
        if (selectedTopic && !formData.topics.includes(selectedTopic)) {
            setFormData(prev => ({ ...prev, topics: [...prev.topics, selectedTopic] }));
        }
        // Reset the select dropdown
        e.target.value = '';
    };

    const handleRemoveTopic = (topicToRemove: string) => {
        setFormData(prev => ({
            ...prev,
            topics: prev.topics.filter(t => t !== topicToRemove)
        }));
    };

    const handleSaveQuestion = () => {
        if (!formData.title || formData.topics.length === 0) return;

        if (editingId) {
            // Update
            setQuestions(prev =>
                prev.map(q => q.id === editingId ? { ...formData, id: editingId } : q)
            );
        } else {
            // Create
            const newQuestion: Question = {
                ...formData,
                id: Math.random().toString(36).substr(2, 9),
            };
            setQuestions(prev => [...prev, newQuestion]);
        }
        setIsFormModalOpen(false);
    };

    const handleConfirmDelete = () => {
        if (questionToDelete) {
            setQuestions(prev => prev.filter(q => q.id !== questionToDelete.id));
        }
        setIsDeleteModalOpen(false);
        setQuestionToDelete(null);
    };

    // --- Table Configuration ---
    const columns = [
        {
            header: 'Title',
            accessorKey: 'title' as const,
            cell: (item: Question) => <span className="font-medium text-primary">{item.title}</span>,
        },
        {
            header: 'Topics',
            accessorKey: 'topics' as const,
            cell: (item: Question) => (
                <div className="flex flex-wrap gap-1">
                    {item.topics.map(topic => (
                        <span key={topic} className="tag-sm custom-tag text-accent">{topic}</span>
                    ))}
                </div>
            ),
        },
        {
            header: 'Difficulty',
            accessorKey: 'difficulty' as const,
            cell: (item: Question) => {
                const colorClass =
                    item.difficulty === 'easy' ? 'text-success bg-success-light' :
                        item.difficulty === 'medium' ? 'text-warning bg-warning-light' :
                            'text-danger bg-danger-light';
                return <span className={`tag-sm custom-tag ${colorClass}`}>{item.difficulty}</span>;
            },
        },
        {
            header: 'Actions',
            accessorKey: 'id' as const,
            cell: (item: Question) => (
                <div className="flex gap-2">
                    <Button variant="ghost" size="sm" onClick={() => handleOpenEdit(item)}>
                        <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => handleOpenDelete(item)}>
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            ),
        },
    ];

    return (
        <div className="admin-layout animate-fade-in">
            {/* Admin Navbar */}
            <nav className="navbar admin-navbar">
                <div className="navbar-brand">
                    <div className="brand-icon-sm admin-brand">
                        <Database className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-gradient">PeerPrep Admin</span>
                </div>
                <div className="navbar-user">
                    <span className="tag-sm text-accent bg-accent-light border-accent">Admin Mode</span>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </nav>

            {/* Main Content */}
            <main className="admin-content container">
                <div className="admin-header">
                    <div>
                        <h1 className="admin-title">Question Repository</h1>
                        <p className="admin-subtitle">Manage the global database of interview questions.</p>
                    </div>
                    <Button onClick={handleOpenCreate} leftIcon={<Plus className="h-5 w-5" />}>
                        Add Question
                    </Button>
                </div>

                <div className="table-wrapper mt-8">
                    <Table data={questions} columns={columns} />
                </div>
            </main>

            {/* --- Modals --- */}

            {/* Form Modal (Create / Edit) */}
            <Modal
                isOpen={isFormModalOpen}
                onClose={() => setIsFormModalOpen(false)}
                title={editingId ? 'Edit Question' : 'Add New Question'}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsFormModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveQuestion}>
                            {editingId ? 'Save Changes' : 'Create Question'}
                        </Button>
                    </>
                }
            >
                <div className="form-layout">
                    <Input
                        label="Question Title"
                        placeholder="e.g. Merge Intervals"
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />

                    <div className="form-group">
                        <label className="form-label">Description</label>
                        <textarea
                            className="textarea-input"
                            placeholder="Provide a detailed description of the problem..."
                            value={formData.description || ''}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label">Topics</label>
                        <Select
                            options={[
                                { value: '', label: 'Select a topic...' },
                                ...AVAILABLE_TOPICS.map(t => ({ value: t, label: t }))
                            ]}
                            onChange={handleTopicSelect}
                            value=""
                        />
                        {formData.topics.length > 0 && (
                            <div className="selected-topics-container">
                                {formData.topics.map(topic => (
                                    <div key={topic} className="selected-topic-tag">
                                        <span>{topic}</span>
                                        <button
                                            type="button"
                                            className="topic-remove-btn"
                                            onClick={() => handleRemoveTopic(topic)}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Select
                        label="Difficulty Level"
                        value={formData.difficulty}
                        onChange={e => setFormData({ ...formData, difficulty: e.target.value as Question['difficulty'] })}
                        options={[
                            { value: 'easy', label: 'Easy' },
                            { value: 'medium', label: 'Medium' },
                            { value: 'hard', label: 'Hard' },
                        ]}
                        className="mt-4"
                    />

                    <div className="form-group">
                        <label className="form-label">Media / Photos (Optional)</label>
                        {!formData.mediaUrl ? (
                            <div className="media-upload-container">
                                <input
                                    type="file"
                                    accept="image/*,video/*"
                                    className="media-upload-input"
                                    onChange={handleFileUpload}
                                />
                                <Upload className="h-8 w-8 text-accent mx-auto mb-2 opacity-80" />
                                <p className="text-sm text-secondary">Click or drag file to upload</p>
                            </div>
                        ) : (
                            <div className="media-preview-wrapper">
                                <img src={formData.mediaUrl} alt="Uploaded Media" className="media-preview" />
                                <button className="remove-media-btn" onClick={handleRemoveMedia} title="Remove Media">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Confirm Deletion"
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="danger" onClick={handleConfirmDelete}>Delete</Button>
                    </>
                }
            >
                <div className="delete-confirmation">
                    <div className="alert-icon-wrapper">
                        <AlertCircle className="h-10 w-10 text-danger" />
                    </div>
                    <p>
                        Are you sure you want to delete <strong>{questionToDelete?.title}</strong>?
                        This action is permanent and cannot be undone.
                    </p>
                </div>
            </Modal>

        </div>
    );
};
