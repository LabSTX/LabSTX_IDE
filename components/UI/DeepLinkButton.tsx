import React from 'react';
import { Button } from './Button';
import { RocketIcon } from './Icons';

interface DeepLinkButtonProps {
  templateId?: string;
  snippetCode?: string;
  snippetName?: string;
  snippetLang?: string;
  label?: string;
  className?: string;
  variant?: 'primary' | 'secondary' | 'icon';
  size?: 'sm' | 'md' | 'lg';
}

/**
 * A button that generates and navigates to a LabSTX IDE deep link.
 */
export const DeepLinkButton: React.FC<DeepLinkButtonProps> = ({
  templateId,
  snippetCode,
  snippetName,
  snippetLang = 'clarity',
  label = 'Open in LabSTX IDE',
  className = '',
  variant = 'primary',
  size = 'md'
}) => {
  const handleOpenInIDE = () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const params = new URLSearchParams();

    if (templateId) {
      params.set('template_id', templateId);
    } else if (snippetCode) {
      // Base64 encode the snippet code
      const encodedCode = window.btoa(unescape(encodeURIComponent(snippetCode)));
      params.set('snippet_code', encodedCode);
      if (snippetName) params.set('snippet_name', snippetName);
      if (snippetLang) params.set('snippet_lang', snippetLang);
    }

    const deepLink = `${baseUrl}?${params.toString()}`;
    window.open(deepLink, '_blank');
  };

  return (
    <Button
      onClick={handleOpenInIDE}
      variant={variant}
      size={size}
      className={`flex items-center gap-2 ${className}`}
    >
      <RocketIcon className={size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} />
      <span>{label}</span>
    </Button>
  );
};
