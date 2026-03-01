import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Target, Play, User as UserIcon, LogOut } from 'lucide-react';
import { Card } from '../components/Card';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import './Dashboard.css';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const [difficulty, setDifficulty] = useState('');
    const [topic, setTopic] = useState('');

    const handleStartMatching = () => {
        if (difficulty && topic) {
            navigate('/matching', { state: { difficulty, topic } });
        }
    };

    const difficultyOptions = [
        { value: '', label: 'Select Difficulty' },
        { value: 'easy', label: 'Easy' },
        { value: 'medium', label: 'Medium' },
        { value: 'hard', label: 'Hard' },
    ];

    const topicOptions = [
        { value: '', label: 'Select a Topic' },
        { value: 'arrays', label: 'Arrays & Hashing' },
        { value: 'two-pointers', label: 'Two Pointers' },
        { value: 'sliding-window', label: 'Sliding Window' },
        { value: 'stack', label: 'Stack' },
        { value: 'binary-search', label: 'Binary Search' },
        { value: 'linked-list', label: 'Linked List' },
        { value: 'trees', label: 'Trees' },
        { value: 'graphs', label: 'Graphs' },
        { value: 'dp', label: 'Dynamic Programming' },
    ];

    return (
        <div className="dashboard-layout animate-fade-in">
            <nav className="navbar">
                <div className="navbar-brand">
                    <div className="brand-icon-sm">
                        <UserIcon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-gradient">PeerPrep</span>
                </div>
                <div className="navbar-user">
                    <span className="user-name">Welcome, John Doe</span>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign Out
                    </Button>
                </div>
            </nav>

            <main className="dashboard-content">
                <div className="dashboard-header flex-col flex-center">
                    <h1 className="dashboard-title">Ready to Practice?</h1>
                    <p className="dashboard-subtitle">
                        Select your preferred difficulty and topic to find a peer for your next mock interview.
                    </p>
                </div>

                <div className="dashboard-cards">
                    <Card glow className="selection-card">
                        <h2 className="card-title flex-center">
                            <Target className="h-6 w-6 mr-2 text-accent-primary" />
                            Configure Session
                        </h2>

                        <div className="form-group mt-8">
                            <Select
                                label="Difficulty Level"
                                options={difficultyOptions}
                                value={difficulty}
                                onChange={(e) => setDifficulty(e.target.value)}
                            />
                        </div>

                        <div className="form-group mt-6">
                            <Select
                                label="Interview Topic"
                                options={topicOptions}
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                leftIcon={<BookOpen className="h-5 w-5" />}
                            />
                        </div>

                        <Button
                            size="lg"
                            className="w-full mt-8"
                            disabled={!difficulty || !topic}
                            onClick={handleStartMatching}
                            rightIcon={<Play className="h-5 w-5" />}
                        >
                            Find a Match
                        </Button>
                    </Card>

                    <div className="dashboard-stats flex-col">
                        <Card className="stat-card">
                            <h3>Recent Topics</h3>
                            <div className="tags">
                                <span className="tag">Arrays</span>
                                <span className="tag">Trees</span>
                            </div>
                        </Card>
                        <Card className="stat-card mt-4">
                            <h3>Sessions Completed</h3>
                            <div className="stat-number">12</div>
                        </Card>
                    </div>
                </div>
            </main>
        </div>
    );
};
