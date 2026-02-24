import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className = '', 
  ...props 
}) => {
  const baseStyles = "font-bold transition-all duration-75 ease-in-out border flex items-center justify-center";
  
  const variants = {
    primary: "bg-caspier-black text-caspier-red border-caspier-red hover:bg-caspier-red hover:text-caspier-black shadow-neobrutal active:shadow-none active:translate-x-[4px] active:translate-y-[4px]",
    secondary: "bg-caspier-panel text-caspier-text border-caspier-border hover:border-caspier-red shadow-[2px_2px_0_0_#808080] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]",
    icon: "bg-transparent border-transparent text-caspier-muted hover:text-caspier-red hover:bg-caspier-red/10 p-1"
  };

  const sizes = {
    sm: "text-xs px-2 py-1",
    md: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3"
  };

  const variantStyle = variants[variant];
  const sizeStyle = variant === 'icon' ? '' : sizes[size];

  return (
    <button 
      className={`${baseStyles} ${variantStyle} ${sizeStyle} ${className}`} 
      {...props}
    >
      {children}
    </button>
  );
};