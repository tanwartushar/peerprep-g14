import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Code, Award, CheckCircle } from 'lucide-react';
import { Card } from '../components/Card';
import { Select } from '../components/Select';
import { Button } from '../components/Button';
import './Dashboard.css'; // Re-use the layout styles from the dashboard

export const ProfileSetup: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const userId = searchParams.get('userId');

    const [bio, setBio] = useState('');
    const [experienceLevel, setExperienceLevel] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const experienceOptions = [
        { value: '', label: 'Select Experience Level' },
        { value: 'beginner', label: 'Beginner (< 1 yr)' },
        { value: 'intermediate', label: 'Intermediate (1-3 yrs)' },
        { value: 'advanced', label: 'Advanced (3+ yrs)' },
    ];

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        
        if (!userId) {
            alert('User ID is missing. Please log in again.');
            navigate('/');
            return;
        }

        setIsLoading(true);

        try {
            const response = await fetch('http://localhost:3001/api/user/profile', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    bio,
                    experienceLevel
                }),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.message || 'Failed to complete profile setup');
            }

            // Successfully updated
            navigate('/dashboard');
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSkip = () => {
        // Just go to dashboard
        navigate('/dashboard');
    }

    return (
        <div className="dashboard-layout animate-fade-in">
            <nav className="navbar">
                <div className="navbar-brand">
                    <div className="brand-icon-sm">
                        <User className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-gradient">PeerPrep</span>
                </div>
            </nav>

            <main className="dashboard-content" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
                <div style={{ maxWidth: '600px', width: '100%' }}>
                    <div className="dashboard-header flex-col flex-center text-center">
                        <h1 className="dashboard-title">Welcome to PeerPrep!</h1>
                        <p className="dashboard-subtitle mt-2">
                           You're almost there. Tell us a bit about yourself so we can find the best peers for your mock interviews.
                        </p>
                    </div>

                    <Card glow className="mt-8 p-8" >
                        <form onSubmit={handleSubmit}>
                            
                            <div className="form-group mb-6">
                                <Select
                                    label="Experience Level"
                                    options={experienceOptions}
                                    value={experienceLevel}
                                    onChange={(e) => setExperienceLevel(e.target.value)}
                                    leftIcon={<Award className="h-5 w-5" />}
                                />
                                <p className="text-xs text-secondary mt-1">This helps us match you with peers of similar skill levels.</p>
                            </div>

                            <div className="form-group mb-8">
                                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-primary)'}}>
                                    Bio (Optional)
                                </label>
                                <div className="input-group">
                                    <div className="input-icon">
                                        <Code className="h-5 w-5" />
                                    </div>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        placeholder="I'm a self-taught developer looking to practice my React and Python skills..."
                                        className="input-field"
                                        style={{ minHeight: '100px', padding: '10px 10px 10px 40px', resize: 'vertical' }}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-4 mt-8">
                                <Button
                                    type="submit"
                                    size="lg"
                                    className="w-full"
                                    isLoading={isLoading}
                                    rightIcon={<CheckCircle className="h-5 w-5" />}
                                    disabled={!experienceLevel}
                                >
                                    Complete Setup
                                </Button>
                                
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="md"
                                    className="w-full"
                                    onClick={handleSkip}
                                >
                                    Skip for now, take me to Dashboard
                                </Button>
                            </div>
                        </form>
                    </Card>
                </div>
            </main>
        </div>
    );
};
