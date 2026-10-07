import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { ChatSession, ChatMessage } from '../types';
import { chatStorage } from '../services/chatStorage';
import { useAuth } from './AuthContext';
import { useLanguage } from './LanguageContext';

export interface ChatContextType {
  chats: ChatSession[];
  activeChatId: string | null;
  activeChat: ChatSession | null;
  messages: ChatMessage[];
  isLoadingChats: boolean;
  isLoadingMessages: boolean;
  isSaving: boolean;
  saveError: string | null;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredChats: ChatSession[];
  createNewChat: () => void;
  openChat: (chatId: string) => Promise<void>;
  sendMessage: (content: string, attachments?: Array<{ type: string; url: string }>) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  renameChat: (chatId: string, newTitle: string) => Promise<void>;
  clearCurrentChat: () => void;
  exportCurrentChat: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

const getDefaultWelcomeMessage = (language: string): ChatMessage => ({
  id: 'welcome-' + Date.now(),
  role: 'assistant',
  content: language === 'hi' 
    ? "नमस्ते! मैं एग्रीजीपीटी (AgriGPT) हूं, आपका कृषि सह-पायलट।\n\nमैं मौसम विश्लेषण, फसल उत्पादन, बाजार भाव या कृषि सामग्री खरीदने में आपकी सहायता कर सकता हूं। आज आप क्या जानना चाहते हैं?"
    : language === 'mr'
    ? "नमस्कार! मी अ‍ॅग्रीजीपीटी (AgriGPT) आहे, तुमचा शेती सह-पायलट.\n\nमी तुम्हाला हवामान अंदाज, पीक उत्पन्न, बाजारभाव आणि शेती साहित्याबद्दल मदत करू शकतो. आज तुम्हाला काय विचारायचे आहे?"
    : "Hello! I'm AgriGPT, your conversational Agriculture Operating System. \n\nI can help you analyze weather, predict yields, compare market prices, or even buy supplies. What would you like to explore today?",
  timestamp: new Date(),
  language
});

export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { language } = useLanguage();

  const [chats, setChats] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Active chat session object
  const activeChat = useMemo(() => {
    if (!activeChatId) return null;
    return chats.find(c => c.id === activeChatId) || null;
  }, [chats, activeChatId]);

  // Load chats on mount or when user changes
  const loadUserChats = useCallback(async () => {
    if (!user?.id) {
      setChats([]);
      setActiveChatId(null);
      setMessages([]);
      setIsLoadingChats(false);
      return;
    }

    setIsLoadingChats(true);
    try {
      const userChats = await chatStorage.getChats(user.id);
      setChats(userChats);

      // If user has existing chats and no active chat is selected, we don't force select unless clicked, or we set a fresh draft
      setMessages([getDefaultWelcomeMessage(language)]);
    } catch (e) {
      console.error("Error loading user chats:", e);
    } finally {
      setIsLoadingChats(false);
    }
  }, [user?.id, language]);

  useEffect(() => {
    loadUserChats();
  }, [loadUserChats]);

  // Filtered chats based on search query (matches title or message content)
  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    const query = searchQuery.toLowerCase();
    return chats.filter(c => 
      c.title.toLowerCase().includes(query) || 
      c.lastMessage.toLowerCase().includes(query)
    );
  }, [chats, searchQuery]);

  // Start a new chat session (draft mode - not saved to Recent until first message)
  const createNewChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([getDefaultWelcomeMessage(language)]);
    setSaveError(null);
  }, [language]);

  // Open an existing chat
  const openChat = useCallback(async (chatId: string) => {
    if (!user?.id || !chatId) return;
    
    setIsLoadingMessages(true);
    setSaveError(null);
    try {
      setActiveChatId(chatId);
      const storedMessages = await chatStorage.getMessages(user.id, chatId);
      if (storedMessages && storedMessages.length > 0) {
        setMessages(storedMessages);
      } else {
        setMessages([getDefaultWelcomeMessage(language)]);
      }
    } catch (e) {
      console.error("Error opening chat:", e);
      setSaveError("Failed to load conversation history.");
    } finally {
      setIsLoadingMessages(false);
    }
  }, [user?.id, language]);

  // Send a message and handle automatic persistence
  const sendMessage = useCallback(async (content: string, attachments?: Array<{ type: string; url: string }>) => {
    if ((!content.trim() && (!attachments || attachments.length === 0)) || !user?.id) return;

    setSaveError(null);
    setIsSaving(true);

    try {
      let currentChatId = activeChatId;
      let isFirstMessage = false;

      // Create new session metadata if this is a draft chat
      if (!currentChatId) {
        isFirstMessage = true;
        currentChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
        setActiveChatId(currentChatId);

        const title = chatStorage.generateTitle(content, language);
        const newSession: ChatSession = {
          id: currentChatId,
          userId: user.id,
          title,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          language,
          lastMessage: content,
          messageCount: 1
        };

        await chatStorage.saveChatSession(user.id, newSession);
        setChats(prev => [newSession, ...prev]);
      }

      // Construct user message object
      const userMsg: ChatMessage = {
        id: `msg_${Date.now()}_usr`,
        role: 'user',
        content,
        timestamp: new Date(),
        language,
        attachments
      };

      // Calculate new message list including user message
      const updatedMessagesWithUser = [...messages, userMsg];
      setMessages(updatedMessagesWithUser);

      // Save user message immediately to storage
      await chatStorage.saveMessages(user.id, currentChatId, updatedMessagesWithUser);

      // Update session metadata
      const existingSession = await chatStorage.getChat(user.id, currentChatId);
      if (existingSession) {
        existingSession.updatedAt = Date.now();
        existingSession.lastMessage = content;
        existingSession.messageCount = updatedMessagesWithUser.length;
        await chatStorage.saveChatSession(user.id, existingSession);
        
        setChats(prev => {
          const filtered = prev.filter(c => c.id !== currentChatId);
          return [existingSession, ...filtered];
        });
      }

      // Create assistant placeholder
      const assistantMsgId = `msg_${Date.now() + 1}_ast`;
      const assistantPlaceholder: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        language,
        metadata: { source: 'gemini' }
      };

      setMessages(prev => [...prev, assistantPlaceholder]);

      // Prepare context payload for AI
      const apiMessages = updatedMessagesWithUser.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Call API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: apiMessages })
      });

      if (!response.ok) {
        throw new Error('Failed to reach AI service');
      }

      let assistantResponseText = '';
      const reader = response.body?.getReader();
      const decoder = new TextDecoder('utf-8');

      if (reader) {
        let isDone = false;
        while (!isDone) {
          const { value, done } = await reader.read();
          isDone = done;
          if (value) {
            const chunkText = decoder.decode(value, { stream: true });
            const lines = chunkText.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const dataStr = line.slice(6);
                if (dataStr === '[DONE]') {
                  isDone = true;
                  break;
                }
                try {
                  const data = JSON.parse(dataStr);
                  if (data.text) {
                    assistantResponseText += data.text;
                    setMessages(prev => prev.map(m => 
                      m.id === assistantMsgId ? { ...m, content: assistantResponseText } : m
                    ));
                  }
                } catch (e) {
                  // Ignore JSON chunk errors
                }
              }
            }
          }
        }
      }

      if (!assistantResponseText.trim()) {
        assistantResponseText = "I've processed your query. Please let me know if you need any additional details.";
        setMessages(prev => prev.map(m => 
          m.id === assistantMsgId ? { ...m, content: assistantResponseText } : m
        ));
      }

      // Final assistant message object
      const finalAssistantMsg: ChatMessage = {
        id: assistantMsgId,
        role: 'assistant',
        content: assistantResponseText,
        timestamp: new Date(),
        language,
        metadata: { source: 'gemini' }
      };

      const finalMessagesList = [...updatedMessagesWithUser, finalAssistantMsg];
      await chatStorage.saveMessages(user.id, currentChatId, finalMessagesList);

      // Final update to session metadata
      if (existingSession) {
        existingSession.updatedAt = Date.now();
        existingSession.lastMessage = assistantResponseText.substring(0, 100);
        existingSession.messageCount = finalMessagesList.length;
        await chatStorage.saveChatSession(user.id, existingSession);

        setChats(prev => {
          const filtered = prev.filter(c => c.id !== currentChatId);
          return [existingSession, ...filtered];
        });
      }
    } catch (e: any) {
      console.error("Error saving/sending message:", e);
      setSaveError("Unable to save or send message. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  }, [user?.id, activeChatId, messages, language]);

  // Delete chat
  const deleteChat = useCallback(async (chatId: string) => {
    if (!user?.id || !chatId) return;
    try {
      await chatStorage.deleteChat(user.id, chatId);
      setChats(prev => prev.filter(c => c.id !== chatId));

      if (activeChatId === chatId) {
        createNewChat();
      }
    } catch (e) {
      console.error("Error deleting chat:", e);
    }
  }, [user?.id, activeChatId, createNewChat]);

  // Rename chat
  const renameChat = useCallback(async (chatId: string, newTitle: string) => {
    if (!user?.id || !chatId || !newTitle.trim()) return;
    try {
      await chatStorage.renameChat(user.id, chatId, newTitle);
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, title: newTitle.trim(), updatedAt: Date.now() } : c));
    } catch (e) {
      console.error("Error renaming chat:", e);
    }
  }, [user?.id]);

  // Clear current chat UI (starts draft mode without deleting saved chat from history)
  const clearCurrentChat = useCallback(() => {
    createNewChat();
  }, [createNewChat]);

  // Export current chat
  const exportCurrentChat = useCallback(() => {
    if (messages.length === 0) return;
    const title = activeChat?.title || 'AgriGPT_Conversation';
    const dateStr = new Date().toLocaleString();
    let text = `AgriGPT OS - Conversation Export\nTitle: ${title}\nDate: ${dateStr}\n\n` + '='.repeat(40) + '\n\n';

    messages.forEach(m => {
      const sender = m.role === 'user' ? 'Farmer' : 'AgriGPT';
      const time = new Date(m.timestamp).toLocaleTimeString();
      text += `[${time}] ${sender}:\n${m.content}\n\n`;
    });

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9_\-]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeChat, messages]);

  return (
    <ChatContext.Provider value={{
      chats,
      activeChatId,
      activeChat,
      messages,
      isLoadingChats,
      isLoadingMessages,
      isSaving,
      saveError,
      searchQuery,
      setSearchQuery,
      filteredChats,
      createNewChat,
      openChat,
      sendMessage,
      deleteChat,
      renameChat,
      clearCurrentChat,
      exportCurrentChat
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
