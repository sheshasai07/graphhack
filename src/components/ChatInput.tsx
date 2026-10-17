import React, { useState, useRef, useCallback } from 'react';
import { Send, Paperclip, Sliders, Sparkles } from 'lucide-react';
import type { GraphRAGOptions } from '../types';
import './ChatInput.css';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  options: GraphRAGOptions;
  onOpenSettings: () => void;
  onOpenDocuments: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled,
  options,
  onOpenSettings,
  onOpenDocuments,
}) => {
  const [input, setInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed || disabled) return;
    onSendMessage(trimmed);
    setInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [input, disabled, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  };

  const charCount = input.length;
  const isOverLimit = charCount > 4000;

  return (
    <div className="chat-input-wrapper">
      {/* Parameter Telemetry Pill */}
      <div className="retrieval-params-strip">
        <button className="param-pill" onClick={onOpenSettings} title="Click to tune settings">
          <Sliders size={11} />
          <span>top_k_chunks: <strong>{options.top_k_chunks}</strong></span>
          <span className="dot-sep">•</span>
          <span>entities: <strong>{options.top_k_entities}</strong></span>
          <span className="dot-sep">•</span>
          <span>hops: <strong>{options.graph_hops}</strong></span>
          {options.use_query_decomposition && (
            <>
              <span className="dot-sep">•</span>
              <span className="decomp-badge">
                <Sparkles size={9} /> Decomp ON
              </span>
            </>
          )}
        </button>
      </div>

      {/* Input Box */}
      <div className="chat-input-box">
        <div className="input-actions left">
          <button
            className="action-btn"
            onClick={onOpenDocuments}
            title="Attach or Upload Knowledge Base documents"
          >
            <Paperclip size={16} />
          </button>
          <button
            className="action-btn"
            onClick={onOpenSettings}
            title="Configure retrieval depth & FalkorDB graph hops"
          >
            <Sliders size={16} />
          </button>
        </div>

        <textarea
          ref={textareaRef}
          className={`chat-textarea ${isOverLimit ? 'over-limit' : ''}`}
          value={input}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question across your graph knowledge base..."
          disabled={disabled}
          rows={1}
        />

        <div className="input-actions right">
          <button
            className={`send-btn ${input.trim() && !disabled && !isOverLimit ? 'ready' : ''}`}
            onClick={handleSend}
            disabled={!input.trim() || disabled || isOverLimit}
            title="Send query"
          >
            <Send size={16} />
          </button>
        </div>
      </div>

      <div className="input-footer">
        <span className="input-hint">
          Press <kbd>Enter</kbd> to execute GraphRAG query, <kbd>Shift + Enter</kbd> for newline
        </span>
        <span className={`char-count ${isOverLimit ? 'over' : ''}`}>
          {charCount}/4000
        </span>
      </div>
    </div>
  );
};

export default ChatInput;
