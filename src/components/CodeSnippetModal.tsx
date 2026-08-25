import React, { useState } from 'react';
import { Code2, Check, Copy, FileCode, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CodeSnippetData } from '../types';

const LANGUAGES = [
  { label: 'TypeScript', value: 'typescript' },
  { label: 'JavaScript', value: 'javascript' },
  { label: 'Python', value: 'python' },
  { label: 'Rust', value: 'rust' },
  { label: 'Go', value: 'go' },
  { label: 'SQL', value: 'sql' },
  { label: 'JSON', value: 'json' },
  { label: 'Bash / Shell', value: 'bash' },
  { label: 'HTML / CSS', value: 'html' },
  { label: 'C++', value: 'cpp' },
];

interface CodeSnippetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSnippet: (snippet: CodeSnippetData) => void;
}

export const CodeSnippetModal: React.FC<CodeSnippetModalProps> = ({ isOpen, onClose, onSubmitSnippet }) => {
  const [title, setTitle] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError('Please enter some code to share');
      return;
    }

    onSubmitSnippet({
      title: title.trim() || undefined,
      language,
      code: code.trim(),
    });

    setTitle('');
    setCode('');
    setError('');
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-[#1A1A17]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-[#1E1E1B] border border-[#D9D9D0] dark:border-[#353530] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-left"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#D9D9D0] dark:border-[#353530] flex items-center justify-between bg-[#F7F7F4] dark:bg-[#252521]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5A5A40]/15 dark:bg-[#5A5A40]/30 text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-center">
                <Code2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-[#2D2D2A] dark:text-[#E8E8E1]">
                  Insert Encrypted Code Snippet
                </h2>
                <p className="text-xs text-[#7A7A70] dark:text-[#A1A19A]">
                  Formatted with syntax highlighting and 1-click team copying
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title & Language Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] mb-1.5">
                  Snippet Title (Optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. key_derivation.ts or postgres_audit.sql"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] text-xs text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none focus:border-[#5A5A40] dark:focus:border-[#8DAA82]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] mb-1.5">
                  Language / Syntax:
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] text-xs text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none focus:border-[#5A5A40] dark:focus:border-[#8DAA82]"
                >
                  {LANGUAGES.map((l) => (
                    <option key={l.value} value={l.value}>
                      {l.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Code Body */}
            <div>
              <label className="block text-xs font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] mb-1.5">
                Code:
              </label>
              <textarea
                rows={10}
                placeholder={`// Paste your ${language} code here...\nfunction verifySignatures() {\n  return true;\n}`}
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setError('');
                }}
                className="w-full p-3 font-mono text-xs rounded-xl bg-[#1A1A17] text-[#E8E8E1] border border-[#3A3A34] focus:outline-none focus:border-[#8DAA82] resize-none"
              />
            </div>

            {error && <p className="text-xs text-rose-500">{error}</p>}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-medium text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#4A4A32] text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer"
              >
                Send Code Snippet
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
