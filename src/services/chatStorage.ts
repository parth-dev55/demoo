import { ChatSession, ChatMessage } from '../types';

/**
 * AgriGPT Persistent Chat Storage Engine
 * Stores chat history per user ID in persistent browser storage.
 */

const getChatsKey = (userId: string) => `agrigpt_chats_${userId}`;
const getMessagesKey = (userId: string, chatId: string) => `agrigpt_messages_${userId}_${chatId}`;

export const chatStorage = {
  /**
   * Fetch all chat sessions for a given user, sorted by updatedAt DESC.
   */
  async getChats(userId: string): Promise<ChatSession[]> {
    if (!userId) return [];
    try {
      const raw = localStorage.getItem(getChatsKey(userId));
      if (!raw) return [];
      const chats: ChatSession[] = JSON.parse(raw);
      return chats.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
    } catch (e) {
      console.error('Failed to load chats for user:', userId, e);
      return [];
    }
  },

  /**
   * Get a single chat session by ID.
   */
  async getChat(userId: string, chatId: string): Promise<ChatSession | null> {
    const chats = await this.getChats(userId);
    return chats.find(c => c.id === chatId) || null;
  },

  /**
   * Save or update a chat session metadata.
   */
  async saveChatSession(userId: string, chat: ChatSession): Promise<void> {
    if (!userId || !chat.id) return;
    try {
      const chats = await this.getChats(userId);
      const index = chats.findIndex(c => c.id === chat.id);
      if (index >= 0) {
        chats[index] = { ...chats[index], ...chat };
      } else {
        chats.unshift(chat);
      }
      chats.sort((a, b) => Number(b.updatedAt) - Number(a.updatedAt));
      localStorage.setItem(getChatsKey(userId), JSON.stringify(chats));
    } catch (e) {
      console.error('Failed to save chat session:', e);
      throw e;
    }
  },

  /**
   * Fetch all messages for a specific chat.
   */
  async getMessages(userId: string, chatId: string): Promise<ChatMessage[]> {
    if (!userId || !chatId) return [];
    try {
      const raw = localStorage.getItem(getMessagesKey(userId, chatId));
      if (!raw) return [];
      const messages: ChatMessage[] = JSON.parse(raw);
      return messages.map(m => ({
        ...m,
        timestamp: new Date(m.timestamp)
      }));
    } catch (e) {
      console.error('Failed to load messages for chat:', chatId, e);
      return [];
    }
  },

  /**
   * Save complete messages array for a chat session.
   */
  async saveMessages(userId: string, chatId: string, messages: ChatMessage[]): Promise<void> {
    if (!userId || !chatId) return;
    try {
      localStorage.setItem(getMessagesKey(userId, chatId), JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save messages:', e);
      throw e;
    }
  },

  /**
   * Delete a chat session and all its stored messages.
   */
  async deleteChat(userId: string, chatId: string): Promise<void> {
    if (!userId || !chatId) return;
    try {
      const chats = await this.getChats(userId);
      const filtered = chats.filter(c => c.id !== chatId);
      localStorage.setItem(getChatsKey(userId), JSON.stringify(filtered));
      localStorage.removeItem(getMessagesKey(userId, chatId));
    } catch (e) {
      console.error('Failed to delete chat:', chatId, e);
      throw e;
    }
  },

  /**
   * Rename a chat title permanently.
   */
  async renameChat(userId: string, chatId: string, newTitle: string): Promise<void> {
    if (!userId || !chatId || !newTitle.trim()) return;
    try {
      const chat = await this.getChat(userId, chatId);
      if (chat) {
        chat.title = newTitle.trim();
        chat.updatedAt = Date.now();
        await this.saveChatSession(userId, chat);
      }
    } catch (e) {
      console.error('Failed to rename chat:', chatId, e);
      throw e;
    }
  },

  /**
   * Automatically generate a clean 3-6 word title from user's first message.
   */
  generateTitle(firstMessageText: string, language: string = 'en'): string {
    if (!firstMessageText) return 'New Conversation';

    // Remove markdown image syntax e.g. ![...](...)
    let cleaned = firstMessageText.replace(/!\[.*?\]\(.*?\)/g, '').trim();
    if (!cleaned) cleaned = 'Image Analysis';

    // Remove leading/trailing quotes or punctuation noise
    cleaned = cleaned.replace(/^["'\s]+|["'\s]+$/g, '');

    // Common filler prefixes to clean up
    const fillerPatterns = [
      /^(hi|hello|hey|please|can you|could you|tell me|what is|how to|i want to|show me|give me|about|help me with)/i,
      /^(मुझे|कृपया|बताओ|क्या|कैसे|मदत करा|मला सांगा|आहे का)/i
    ];

    let processed = cleaned;
    for (const pattern of fillerPatterns) {
      processed = processed.replace(pattern, '').trim();
    }

    // Split into words
    const words = (processed || cleaned).split(/\s+/).filter(Boolean);

    if (words.length === 0) return 'Farming Question';

    // Take up to 5 words
    let titleWords = words.slice(0, 5);
    let title = titleWords.join(' ');

    // Capitalize first character if applicable
    if (title.length > 0) {
      title = title.charAt(0).toUpperCase() + title.slice(1);
    }

    // Ensure title length is reasonable (max 40 chars)
    if (title.length > 40) {
      title = title.substring(0, 37) + '...';
    }

    return title || 'Farming Question';
  }
};
