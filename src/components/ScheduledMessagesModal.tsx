import React, { useState } from 'react';
import { Clock, Calendar, Send, Trash2, CheckCircle2, AlertCircle, X, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { ScheduledMessage } from '../types';

interface ScheduledMessagesModalProps {
  isOpen: boolean;
  onClose: () => void;
  pendingScheduled: ScheduledMessage[];
  onScheduleMessage: (scheduled: Omit<ScheduledMessage, 'id' | 'createdAt' | 'status'>) => void;
  onCancelScheduled: (id: string) => void;
  targetType: 'channel' | 'dm';
  targetId: string;
  targetName: string;
  senderUid: string;
  senderName: string;
}

export const ScheduledMessagesModal: React.FC<ScheduledMessagesModalProps> = ({
  isOpen,
  onClose,
  pendingScheduled,
  onScheduleMessage,
  onCancelScheduled,
  targetType,
  targetId,
  targetName,
  senderUid,
  senderName,
}) => {
  const [activeTab, setActiveTab] = useState<'create' | 'queue'>('create');
  const [messageText, setMessageText] = useState('');
  const [scheduledMinutesOffset, setScheduledMinutesOffset] = useState<number>(15);
  const [customDateTime, setCustomDateTime] = useState<string>('');
  const [isBurnOnRead, setIsBurnOnRead] = useState(false);
  const [ephemeralSeconds, setEphemeralSeconds] = useState<number>(0);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) {
      setError('Please write a message to schedule');
      return;
    }

    let scheduledForTime: number;
    if (scheduledMinutesOffset === -1) {
      // Custom date
      if (!customDateTime) {
        setError('Please select a valid future date & time');
        return;
      }
      scheduledForTime = new Date(customDateTime).getTime();
      if (scheduledForTime <= Date.now() + 60000) {
        setError('Scheduled time must be at least 1 minute in the future');
        return;
      }
    } else {
      scheduledForTime = Date.now() + scheduledMinutesOffset * 60 * 1000;
    }

    onScheduleMessage({
      targetType,
      targetId,
      targetName,
      senderUid,
      senderName,
      text: messageText.trim(),
      scheduledFor: scheduledForTime,
      burnOnRead: isBurnOnRead,
      ephemeralSeconds: ephemeralSeconds > 0 ? ephemeralSeconds : undefined,
    });

    setMessageText('');
    setError('');
    setActiveTab('queue');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-[#1A1A17]/60 backdrop-blur-sm flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-[#1E1E1B] border border-[#D9D9D0] dark:border-[#353530] rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden text-left flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#D9D9D0] dark:border-[#353530] flex items-center justify-between bg-[#F7F7F4] dark:bg-[#252521]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#5A5A40]/15 dark:bg-[#5A5A40]/30 text-[#5A5A40] dark:text-[#8DAA82] flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-serif font-bold text-[#2D2D2A] dark:text-[#E8E8E1]">
                  Scheduled Encrypted Messages
                </h2>
                <p className="text-xs text-[#7A7A70] dark:text-[#A1A19A]">
                  Auto-dispatch E2EE messages to {targetName} at a precise time
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

          {/* Tab Switcher */}
          <div className="flex border-b border-[#D9D9D0] dark:border-[#353530] bg-[#F7F7F4] dark:bg-[#252521] px-5 gap-4">
            <button
              onClick={() => setActiveTab('create')}
              className={`py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'create'
                  ? 'border-[#5A5A40] dark:border-[#8DAA82] text-[#5A5A40] dark:text-[#8DAA82]'
                  : 'border-transparent text-[#7A7A70] dark:text-[#A1A19A]'
              }`}
            >
              Schedule New Message
            </button>

            <button
              onClick={() => setActiveTab('queue')}
              className={`py-2.5 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
                activeTab === 'queue'
                  ? 'border-[#5A5A40] dark:border-[#8DAA82] text-[#5A5A40] dark:text-[#8DAA82]'
                  : 'border-transparent text-[#7A7A70] dark:text-[#A1A19A]'
              }`}
            >
              Pending Queue ({pendingScheduled.length})
            </button>
          </div>

          {/* Body */}
          <div className="p-6 overflow-y-auto flex-1 space-y-4 text-xs">
            {activeTab === 'create' ? (
              <form onSubmit={handleCreateSchedule} className="space-y-4">
                {/* Target context banner */}
                <div className="p-2.5 rounded-lg bg-[#F0EFEB] dark:bg-[#282823] border border-[#D9D9D0] dark:border-[#3A3A34] flex items-center justify-between text-xs">
                  <span className="text-[#7A7A70] dark:text-[#A1A19A]">Dispatching to:</span>
                  <span className="font-semibold text-[#2D2D2A] dark:text-[#E8E8E1]">
                    {targetName}
                  </span>
                </div>

                {/* Message input */}
                <div>
                  <label className="block font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] mb-1.5">
                    Message Content:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Write your encrypted message to be sent later..."
                    value={messageText}
                    onChange={(e) => {
                      setMessageText(e.target.value);
                      setError('');
                    }}
                    className="w-full p-3 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] text-xs text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none focus:border-[#5A5A40] dark:focus:border-[#8DAA82] resize-none"
                    autoFocus
                  />
                </div>

                {/* Scheduling timing presets */}
                <div>
                  <label className="block font-semibold text-[#2D2D2A] dark:text-[#E8E8E1] mb-1.5">
                    Send at:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { label: 'In 15 min', value: 15 },
                      { label: 'In 1 hour', value: 60 },
                      { label: 'In 3 hours', value: 180 },
                      { label: 'Tomorrow 9AM', value: 960 },
                    ].map((preset) => (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          setScheduledMinutesOffset(preset.value);
                          setError('');
                        }}
                        className={`py-2 px-2.5 rounded-lg border text-center font-medium transition-all cursor-pointer ${
                          scheduledMinutesOffset === preset.value
                            ? 'bg-[#5A5A40] text-white border-[#5A5A40] dark:bg-[#8DAA82] dark:text-[#1A1A17] dark:border-[#8DAA82]'
                            : 'bg-[#F7F7F4] dark:bg-[#252521] text-[#2D2D2A] dark:text-[#E8E8E1] border-[#D9D9D0] dark:border-[#353530]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  {/* Custom Date Time option */}
                  <div className="mt-2.5">
                    <button
                      type="button"
                      onClick={() => setScheduledMinutesOffset(-1)}
                      className={`text-xs font-medium cursor-pointer ${
                        scheduledMinutesOffset === -1
                          ? 'text-[#5A5A40] dark:text-[#8DAA82] underline font-bold'
                          : 'text-[#7A7A70] dark:text-[#A1A19A]'
                      }`}
                    >
                      Or choose a custom date & time
                    </button>

                    {scheduledMinutesOffset === -1 && (
                      <input
                        type="datetime-local"
                        value={customDateTime}
                        onChange={(e) => {
                          setCustomDateTime(e.target.value);
                          setError('');
                        }}
                        className="mt-2 w-full p-2.5 rounded-lg bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] text-xs text-[#2D2D2A] dark:text-[#E8E8E1] focus:outline-none"
                      />
                    )}
                  </div>
                </div>

                {/* Self destruct / ephemeral toggle */}
                <div className="pt-2 border-t border-[#D9D9D0] dark:border-[#353530] flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer text-[#2D2D2A] dark:text-[#E8E8E1]">
                    <input
                      type="checkbox"
                      checked={isBurnOnRead}
                      onChange={(e) => setIsBurnOnRead(e.target.checked)}
                      className="rounded border-[#D9D9D0] dark:border-[#353530] text-[#5A5A40] focus:ring-0"
                    />
                    <span>Burn on read after delivery</span>
                  </label>
                </div>

                {error && <p className="text-xs text-rose-500">{error}</p>}

                {/* Actions */}
                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl text-[#7A7A70] hover:text-[#2D2D2A] dark:hover:text-[#E8E8E1]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 rounded-xl bg-[#5A5A40] hover:bg-[#4A4A32] text-white font-semibold flex items-center gap-1.5 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Confirm Schedule</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-3">
                {pendingScheduled.length === 0 ? (
                  <div className="text-center py-10 text-[#7A7A70] dark:text-[#A1A19A]">
                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="font-medium">No messages currently in dispatch queue</p>
                  </div>
                ) : (
                  pendingScheduled.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-[#F7F7F4] dark:bg-[#252521] border border-[#D9D9D0] dark:border-[#353530] flex items-start justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-[#2D2D2A] dark:text-[#E8E8E1]">
                            To: {item.targetName}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] bg-[#8DAA82]/20 text-[#5A5A40] dark:text-[#8DAA82]">
                            Scheduled for {new Date(item.scheduledFor).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </div>
                        <p className="text-[#7A7A70] dark:text-[#D1C7B7] text-xs line-clamp-2">
                          "{item.text}"
                        </p>
                      </div>

                      <button
                        onClick={() => onCancelScheduled(item.id)}
                        className="p-1.5 text-[#7A7A70] hover:text-rose-500 transition-colors rounded cursor-pointer"
                        title="Cancel Scheduled Message"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
