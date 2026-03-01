import React from 'react';
import { Loader2 } from 'lucide-react';
import './Spinner.css';

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl';
    className?: string;
    variant?: 'primary' | 'secondary' | 'white';
}

export const Spinner: React.FC<SpinnerProps> = ({
    size = 'md',
    variant = 'primary',
    className = '',
}) => {
    const sizeMap = {
        sm: '1rem',
        md: '1.5rem',
        lg: '2.5rem',
        xl: '4rem',
    };

    const variantClassMap = {
        primary: 'text-accent-primary',
        secondary: 'text-text-secondary',
        white: 'text-white',
    };

    const currentSize = sizeMap[size];
    const currentVariantClass = variantClassMap[variant];

    return (
        <div className={`spinner-container ${className}`}>
            <Loader2
                style={{ width: currentSize, height: currentSize }}
                className={`animate-spin ${currentVariantClass}`}
            />
        </div>
    );
};
