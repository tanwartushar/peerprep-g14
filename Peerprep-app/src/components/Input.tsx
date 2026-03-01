import React from 'react';
import './Input.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    leftIcon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
    label,
    error,
    leftIcon,
    className = '',
    id,
    ...props
}) => {
    const generatedId = id || Math.random().toString(36).substring(7);

    return (
        <div className={`input-wrapper ${className}`}>
            {label && (
                <label htmlFor={generatedId} className="input-label">
                    {label}
                </label>
            )}
            <div className="input-container">
                {leftIcon && <div className="input-icon-left">{leftIcon}</div>}
                <input
                    id={generatedId}
                    className={`input-field ${leftIcon ? 'pl-10' : ''} ${error ? 'input-error' : ''}`}
                    {...props}
                />
            </div>
            {error && <span className="input-error-msg">{error}</span>}
        </div>
    );
};
