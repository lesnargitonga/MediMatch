import React, { useEffect, useState, useRef } from 'react';
import API from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

type Message = {
  id: number;
  sender_id: number;
  content: string;
  created_at: string;
  sender_name?: string;
  sender_email?: string;
};

type ChatModalProps = {
  conversationId?: number;
  otherUserId?: number;
  otherUserName?: string;
  listingId?: number; // when opening from a listing, scope the chat to that listing
  onClose: () => void;
};

export default function ChatModal({ conversationId: initialConvId, otherUserId, otherUserName, listingId, onClose }: ChatModalProps) {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<number | null>(initialConvId || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [otherUserNameState, setOtherUserNameState] = useState(otherUserName || 'User');

  // Get or create conversation if we have otherUserId but no conversationId
  useEffect(() => {
    if (conversationId || !otherUserId) return;
    let cancelled = false;
    let creating = false;
    (async () => {
      try {
        if (creating) return; creating = true;
        const res = await API.post('/chat/conversations', { otherUserId, listingId });
        if (!cancelled && res.data?.conversation) {
          setConversationId(res.data.conversation.id);
        }
      } catch (err: any) {
        if (!cancelled) toast.error(err?.response?.data?.error || 'Failed to create conversation');
      }
    })();
    return () => { cancelled = true; };
  }, [conversationId, otherUserId, listingId]);

  // Fetch messages when conversationId is available
  useEffect(() => {
    if (!conversationId) return;
    let cancelled = false;
    const fetchMessages = async () => {
      setLoading(true);
      try {
        const res = await API.get(`/chat/conversations/${conversationId}/messages`);
        if (!cancelled && res.data?.messages) {
          setMessages(res.data.messages);
          // If we don't have otherUserName, infer it from messages
          if (!otherUserName && res.data.messages.length > 0) {
            const otherMsg = res.data.messages.find((m: Message) => m.sender_id !== user?.id);
            if (otherMsg) setOtherUserNameState(otherMsg.sender_name || otherMsg.sender_email || 'User');
          }
        }
      } catch (err: any) {
        if (!cancelled) toast.error(err?.response?.data?.error || 'Failed to load messages');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchMessages();
    // Poll for new messages every 3 seconds
    const interval = setInterval(fetchMessages, 3000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [conversationId, user?.id, otherUserName]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || sending) return;

    setSending(true);
    try {
      const res = await API.post(`/chat/conversations/${conversationId}/messages`, { content: newMessage.trim() });
      if (res.data?.message) {
        setMessages(prev => [...prev, res.data.message]);
        setNewMessage('');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 16
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: 600,
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          padding: 0
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>{otherUserNameState}</strong>
            <div className="muted-small">Chat{listingId ? ` • Listing #${listingId}` : ''}</div>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: '6px 12px' }}>✕</button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <div className="muted-small">Loading messages...</div>}
          {!loading && messages.length === 0 && <div className="muted-small">No messages yet. Start the conversation!</div>}
          {messages.map((msg) => {
            const isMe = msg.sender_id === user?.id;
            return (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isMe ? 'flex-end' : 'flex-start'
                }}
              >
                <div
                  style={{
                    maxWidth: '70%',
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: isMe ? 'linear-gradient(135deg, #0ea571, #0b8f63)' : 'var(--surface)',
                    color: isMe ? '#fff' : 'var(--text)',
                    border: isMe ? 'none' : '1px solid var(--card-border)',
                    wordWrap: 'break-word'
                  }}
                >
                  {msg.content}
                </div>
                <div className="muted-small" style={{ marginTop: 4, fontSize: '0.75rem' }}>
                  {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} style={{ padding: '12px 20px', borderTop: '1px solid var(--card-border)', display: 'flex', gap: 8 }}>
          <input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={e => setNewMessage(e.target.value)}
            disabled={!conversationId || sending}
            style={{ flex: 1 }}
          />
          <button className="btn btn-primary" type="submit" disabled={!newMessage.trim() || !conversationId || sending}>
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
