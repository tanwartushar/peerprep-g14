import React from 'react';
import { ChevronDown } from 'lucide-react';
import './Select.css';

interface SelectOption {
    value: string;
    label: string;
}

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'options'> {
    label?: string;
    options: SelectOption[];
    error?: string;
    leftIcon?: React.ReactNode;
}

export const Select: React.FC<SelectProps> = ({
    label,
    options,
    error,
    leftIcon,
    className = '',
    id,
    ...props
}) => {
    const generatedId = id || Math.random().toString(36).substring(7);

    return (
        <div className={`select-wrapper ${className}`}>
            {label && (
                <label htmlFor={generatedId} className="select-label">
                    {label}
                </label>
            )}
            <div className="select-container">
                {leftIcon && <div className="select-icon-left">{leftIcon}</div>}
                <select
                    id={generatedId}
                    className={`select-field ${leftIcon ? 'pl-10' : ''} ${error ? 'select-error' : ''}`}
                    {...props}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <div className="select-icon-right">
                    <ChevronDown className="h-4 w-4 text-muted" />
                </div>
            </div>
            {error && <span className="select-error-msg">{error}</span>}
        </div>
    );
};
