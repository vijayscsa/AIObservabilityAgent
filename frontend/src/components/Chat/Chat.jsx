import { useState, useRef, useEffect } from 'react';
import {
    Send,
    Bot,
    User,
    Sparkles,
    AlertTriangle,
    Server,
    Users,
    Clock,
    Loader2
} from 'lucide-react';
import { sendChatMessage } from '../../services/api';
import { ALLOWED_TEAM, getAllowedServiceNames } from '../../config/servicesConfig';
import './Chat.css';

const serviceNames = getAllowedServiceNames();

const QUICK_PROMPTS = [
    { icon: AlertTriangle, label: 'Show critical incidents', prompt: `Show me all critical and high urgency incidents for ${ALLOWED_TEAM.name} services` },
    { icon: Server, label: 'Service status', prompt: `What is the current status of ${serviceNames.join(' and ')}?` },
    { icon: Users, label: "Who's on-call?", prompt: `Who is currently on-call for ${ALLOWED_TEAM.name}?` },
    { icon: Clock, label: 'Recent activity', prompt: 'What are the most recent incidents?' },
];

export default function Chat() {
    const [messages, setMessages] = useState([
        {
            id: 'welcome',
            role: 'assistant',
            content: `Hello! I'm your AIOps assistant for the **${ALLOWED_TEAM.name}** team. I can help you with:

• **Incident Management** - View, acknowledge, and resolve incidents for:
  - ${serviceNames.join('\n  - ')}
• **Service Status** - Check service health and integrations
• **On-Call Schedules** - See who's on-call right now
• **Analysis** - Get AI-powered insights on incidents

How can I help you today?`,
            timestamp: new Date().toISOString()
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    function scrollToBottom() {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    async function handleSend(messageText = input) {
        if (!messageText.trim() || isLoading) return;

        const userMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: messageText.trim(),
            timestamp: new Date().toISOString()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const response = await sendChatMessage(messageText, conversationId);

            if (response.conversationId && !conversationId) {
                setConversationId(response.conversationId);
            }

            const assistantMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response.response,
                toolsUsed: response.toolsUsed || [],
                timestamp: response.timestamp || new Date().toISOString()
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            const errorMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: `I encountered an error: ${error.message}. Please make sure the backend services are running.`,
                isError: true,
                timestamp: new Date().toISOString()
            };

            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
            inputRef.current?.focus();
        }
    }

    function handleKeyDown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    function handleQuickPrompt(prompt) {
        handleSend(prompt);
    }

    function formatMessage(content) {
        // Simple markdown-like formatting
        return content
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\n/g, '<br />');
    }

    return (
        <div className="chat-page">
            <div className="chat-container glass-card">
                {/* Chat Header */}
                <div className="chat-header">
                    <div className="chat-header-left">
                        <div className="chat-avatar">
                            <Bot size={24} />
                        </div>
                        <div className="chat-header-info">
                            <h2 className="chat-title">AIOps Assistant</h2>
                            <span className="chat-status">
                                <span className="status-indicator online"></span>
                                Online
                            </span>
                        </div>
                    </div>
                    <div className="chat-header-right">
                        <Sparkles size={20} className="sparkle-icon" />
                    </div>
                </div>

                {/* Messages */}
                <div className="chat-messages">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={`message ${message.role} ${message.isError ? 'error' : ''}`}
                        >
                            <div className="message-avatar">
                                {message.role === 'assistant' ? (
                                    <Bot size={20} />
                                ) : (
                                    <User size={20} />
                                )}
                            </div>
                            <div className="message-content">
                                <div
                                    className="message-text"
                                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                                />
                                {message.toolsUsed && message.toolsUsed.length > 0 && (
                                    <div className="message-tools">
                                        <span className="tools-label">Tools used:</span>
                                        {message.toolsUsed.map((tool, idx) => (
                                            <span key={idx} className="tool-badge">{tool}</span>
                                        ))}
                                    </div>
                                )}
                                <div className="message-time">
                                    {new Date(message.timestamp).toLocaleTimeString()}
                                </div>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="message assistant loading">
                            <div className="message-avatar">
                                <Bot size={20} />
                            </div>
                            <div className="message-content">
                                <div className="typing-indicator">
                                    <Loader2 size={16} className="animate-spin" />
                                    <span>Thinking...</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Prompts */}
                {messages.length <= 1 && (
                    <div className="quick-prompts">
                        {QUICK_PROMPTS.map((item, idx) => (
                            <button
                                key={idx}
                                className="quick-prompt-btn"
                                onClick={() => handleQuickPrompt(item.prompt)}
                            >
                                <item.icon size={16} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {/* Input */}
                <div className="chat-input-container">
                    <div className="chat-input-wrapper">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Ask me anything about your incidents..."
                            className="chat-input"
                            rows={1}
                            disabled={isLoading}
                        />
                        <button
                            className="send-btn"
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isLoading}
                        >
                            <Send size={20} />
                        </button>
                    </div>
                    <div className="chat-input-hint">
                        Press Enter to send, Shift+Enter for new line
                    </div>
                </div>
            </div>
        </div>
    );
}
