import React, { useState } from 'react';
import { BarChart3, Plus, Trash2, CheckCircle2, ShieldCheck, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { PollData } from '../types';

interface CreatePollModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPoll: (poll: Omit<PollData, 'id' | 'createdBy' | 'createdByName' | 'createdAt'>) => void;
}

export const CreatePollModal: React.FC<CreatePollModalProps> = ({ isOpen, onClose, onSubmitPoll }) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleAddOption = () => {
    if (options.length < 6) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const handleOptionChange = (text: string, index: number) => {
    const updated = [...options];
    updated[index] = text;
    setOptions(updated);
    setError('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) {
      setError('Please provide a poll question');
      return;
    }

    const filledOptions = options.map((o) => o.trim()).filter(Boolean);
    if (filledOptions.length < 2) {
      setError('Please provide at least 2 non-empty poll options');
      return;
    }

    const pollOptions = filledOptions.map((text, idx) => ({
      id: `opt_${Date.now()}_${idx}`,
      text,
      voterUids: [],
    }));

    onSubmitPoll({
      question: question.trim(),
      options: pollOptions,
      allowMultiple,
      isAnonymous,
    });

    // Reset
    setQuestion('');
    setOptions(['', '']);
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
          className="bg-white dark:bg-[#1E1E1B] border border-[#D9D9D0] dark:border-[#353530] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-left"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#D9D9D0] dark:border-[#353530] flex items-center justify-between bg-[#F7F7F4] dark:bg-[#252521]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5A5A40]/15 dark:bg-[#5A5A40]/30 text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-center">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-[#2D2D2A] dark:text-[#E8E8E1]">
                  Create Encrypted In-Chat Poll
                </h2>
                <p className="text-xs text-[#7A7A70] dark:text-[#A1A19A]">
                  Tally team votes with E2EE authentication & real-time updates
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
            {/* Question */}
            <div>
              <label className="block text-xs font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] mb-1.5">
                Poll Question:
              </label>
              <input
                type="text"
                placeholder="e.g. When should we deploy the security patch?"
                value={question}
                onChange={(e) => {
                  setQuestion(e.target.value);
                  setError('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] text-xs text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none focus:border-[#5A5A40] dark:focus:border-[#8DAA82]"
                autoFocus
              />
            </div>

            {/* Options */}
            <div className="space-y-2.5">
              <label className="block text-xs font-semibold text-[#2D2D2A] dark:text-[#E8E8E1]">
                Options (2 to 6):
              </label>
              {options.map((opt, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs font-mono text-[#7A7A70] dark:text-[#A1A19A] w-5 text-right">
                    {index + 1}.
                  </span>
                  <input
                    type="text"
                    placeholder={`Option ${index + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(e.target.value, index)}
                    className="flex-1 px-3 py-2 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] text-xs text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none focus:border-[#5A5A40] dark:focus:border-[#8DAA82]"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(index)}
                      className="p-2 text-[#7A7A70] hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="mt-1 text-xs text-[#5A5A40] dark:text-[#8DAA82] hover:underline flex items-center gap-1.5 font-medium cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Another Option
                </button>
              )}
            </div>

            {/* Toggles */}
            <div className="pt-2 border-t border-[#D9D9D0] dark:border-[#353530] space-y-2.5">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#2D2D2A] dark:text-[#E8E8E1]">
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  className="rounded border-[#D9D9D0] dark:border-[#353530] text-[#5A5A40] focus:ring-0"
                />
                <span>Allow multiple answers per coworker</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-[#2D2D2A] dark:text-[#E8E8E1]">
                <input
                  type="checkbox"
                  checked={isAnonymous}
                  onChange={(e) => setIsAnonymous(e.target.checked)}
                  className="rounded border-[#D9D9D0] dark:border-[#353530] text-[#5A5A40] focus:ring-0"
                />
                <span>Anonymous voting (hide coworker names from voter badges)</span>
              </label>
            </div>

            {error && <p className="text-xs text-rose-500">{error}</p>}

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-2.5">
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
                Post Poll to Chat
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
