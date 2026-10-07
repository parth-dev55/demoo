import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { useLanguage, SUPPORTED_LANGUAGES, LanguageCode } from '../contexts/LanguageContext';

interface LanguageSwitcherProps {
  variant?: 'header' | 'compact' | 'full';
  className?: string;
}

export function LanguageSwitcher({ variant = 'header', className = '' }: LanguageSwitcherProps) {
  const { language, setLanguage, currentLanguage } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close dropdown on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSelect = (code: LanguageCode) => {
    setLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="Select language"
        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 border border-zinc-800 hover:border-zinc-700 rounded-lg text-xs font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
      >
        <Globe className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="font-semibold text-zinc-200">
          {variant === 'compact' ? currentLanguage.shortLabel : currentLanguage.nativeName}
        </span>
        <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-mono hidden md:inline">
          ({currentLanguage.shortLabel})
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="language-menu-button"
          className="absolute right-0 mt-1.5 w-48 rounded-xl bg-[#121215] border border-zinc-800 shadow-xl shadow-black/50 py-1.5 z-50 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-150"
        >
          <div className="px-3 py-1.5 border-b border-zinc-800/60 mb-1">
            <p className="text-[10px] font-semibold tracking-wider text-zinc-500 uppercase">
              Select Language / भाषा चुनें
            </p>
          </div>

          <div className="space-y-0.5 px-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  role="menuitem"
                  type="button"
                  onClick={() => handleSelect(lang.code)}
                  className={`w-full text-left flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors duration-150 ${
                    isSelected
                      ? 'bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20'
                      : 'text-zinc-300 hover:bg-zinc-800/60 hover:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 text-center text-[11px] font-mono font-bold text-zinc-400 group-hover:text-zinc-200 bg-zinc-800/80 rounded px-1 py-0.5">
                      {lang.shortLabel}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-xs leading-none font-medium">{lang.nativeName}</span>
                      {lang.nativeName !== lang.name && (
                        <span className="text-[10px] text-zinc-500 leading-tight mt-0.5">
                          {lang.name}
                        </span>
                      )}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default LanguageSwitcher;
