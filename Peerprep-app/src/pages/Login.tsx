import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Card } from '../components/Card';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import './Login.css';

export const Login: React.FC = () => {
    const navigate = useNavigate();
    const [isLogin, setIsLogin] = useState(true);
    const [isAdminMode, setIsAdminMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // Simulate API call
        setTimeout(() => {
            setIsLoading(false);
            if (isAdminMode) {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }
        }, 1000);
    };

    return (
        <div className="login-container animate-fade-in">
            <div className="login-content">
                <div className="login-header">
                    <div className="brand flex-center">
                        <div className="brand-icon">
                            <User className="h-8 w-8 text-white" />
                        </div>
                        <h1 className="brand-text text-gradient">PeerPrep</h1>
                    </div>
                    <p className="login-subtitle">
                        {isAdminMode
                            ? 'Sign in to manage the platform.'
                            : isLogin
                                ? 'Welcome back to your interview preparation.'
                                : 'Start your journey to interview success.'}
                    </p>
                </div>

                <Card glow className="mt-8">
                    {/* Admin Toggle */}
                    <div className="mode-toggle mb-6">
                        <div className={`toggle-track ${isAdminMode ? 'admin-active' : ''}`}>
                            <button
                                type="button"
                                className={`toggle-option ${!isAdminMode ? 'active' : ''}`}
                                onClick={() => setIsAdminMode(false)}
                            >
                                Student
                            </button>
                            <button
                                type="button"
                                className={`toggle-option ${isAdminMode ? 'active' : ''}`}
                                onClick={() => {
                                    setIsAdminMode(true);
                                    setIsLogin(true); // Admins can only login, not create accounts here
                                }}
                            >
                                Admin
                            </button>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="login-form">
                        {!isLogin && !isAdminMode && (
                            <Input
                                label="Full Name"
                                placeholder="John Doe"
                                leftIcon={<User className="h-5 w-5" />}
                                required
                            />
                        )}
                        <Input
                            label="Email Address"
                            type="email"
                            placeholder={isAdminMode ? "admin@peerprep.com" : "you@example.com"}
                            leftIcon={<Mail className="h-5 w-5" />}
                            required
                        />
                        <Input
                            label="Password"
                            type="password"
                            placeholder="••••••••"
                            leftIcon={<Lock className="h-5 w-5" />}
                            required
                        />

                        <Button
                            type="submit"
                            size="lg"
                            className="w-full mt-4"
                            isLoading={isLoading}
                            variant={isAdminMode ? 'secondary' : 'primary'}
                            rightIcon={!isLoading ? <ArrowRight className="h-5 w-5" /> : undefined}
                        >
                            {isLogin ? (isAdminMode ? 'Admin Sign In' : 'Sign In') : 'Create Account'}
                        </Button>
                    </form>

                    {!isAdminMode && (
                        <div className="login-footer">
                            <p className="text-sm text-secondary">
                                {isLogin ? "Don't have an account? " : "Already have an account? "}
                                <button
                                    type="button"
                                    className="toggle-btn"
                                    onClick={() => setIsLogin(!isLogin)}
                                >
                                    {isLogin ? 'Sign up' : 'Sign in'}
                                </button>
                            </p>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
};
