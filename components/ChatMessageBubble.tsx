import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Bot, User, Globe } from 'lucide-react';
import { ChatMessage } from '../types';

interface ChatMessageBubbleProps {
  message: ChatMessage;
}

const ChatMessageBubble: React.FC<ChatMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-4 ${isUser ? 'flex-row-reverse' : 'flex-row'} mb-6 group`}>
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser ? 'bg-blue-600' : 'bg-purple-600'
        }`}
      >
        {isUser ? <User size={16} className="text-white" /> : <Bot size={16} className="text-white" />}
      </div>

      <div
        className={`max-w-[85%] rounded-2xl p-4 ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-none'
            : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
        } ${message.isError ? 'border-red-500 bg-red-900/20 text-red-200' : ''}`}
      >
        {message.image && (
          <div className="mb-3 rounded-lg overflow-hidden border border-white/10">
            <img src={message.image} alt="User upload" className="max-h-64 object-cover" />
          </div>
        )}
        
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown>{message.text}</ReactMarkdown>
        </div>

        {message.groundingSources && message.groundingSources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-700/50">
            <p className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1">
              <Globe size={12} /> Sources
            </p>
            <div className="flex flex-wrap gap-2">
              {message.groundingSources.map((source, idx) => (
                <a
                  key={idx}
                  href={source.uri}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs bg-slate-900/50 hover:bg-slate-900 text-blue-400 hover:text-blue-300 px-2 py-1 rounded transition-colors truncate max-w-[200px]"
                >
                  {source.title || source.uri}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageBubble;
