import React, { useState } from 'react';
import { Sprout, MessageSquare, Plus, Settings, BarChart, CloudRain, Bug, Box, Store, LogOut, MoreVertical, Edit2, Trash2, Search, X } from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useChat } from '../contexts/ChatContext';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

function groupChatsByDate(chats: ChatSession[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const startOfSevenDays = startOfToday - 6 * 86400000;

  const groups: { label: string; chats: ChatSession[] }[] = [
    { label: 'TODAY', chats: [] },
    { label: 'YESTERDAY', chats: [] },
    { label: 'PREVIOUS 7 DAYS', chats: [] },
    { label: 'OLDER', chats: [] },
  ];

  chats.forEach(chat => {
    const time = Number(chat.updatedAt);
    if (time >= startOfToday) {
      groups[0].chats.push(chat);
    } else if (time >= startOfYesterday) {
      groups[1].chats.push(chat);
    } else if (time >= startOfSevenDays) {
      groups[2].chats.push(chat);
    } else {
      groups[3].chats.push(chat);
    }
  });

  return groups.filter(g => g.chats.length > 0);
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const { 
    filteredChats, 
    activeChatId, 
    createNewChat, 
    openChat, 
    deleteChat, 
    renameChat, 
    searchQuery, 
    setSearchQuery,
    isLoadingChats
  } = useChat();

  const [activeMenuChatId, setActiveMenuChatId] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameTitle, setRenameTitle] = useState('');
  const [deletingChatId, setDeletingChatId] = useState<string | null>(null);

  const menuItems = [
    { icon: MessageSquare, label: t('nav.chat'), path: "/" },
    { icon: Box, label: t('nav.3dView'), path: "/3d-view" },
    { icon: Store, label: t('nav.store'), path: "/store" },
    { icon: BarChart, label: t('nav.analytics'), path: "/analytics" },
    { icon: CloudRain, label: t('nav.weather'), path: "/weather" },
    { icon: Bug, label: t('nav.diseaseScan'), path: "/scan" },
  ];

  const handleNavClick = () => {
    if (window.innerWidth < 768) {
      onClose();
    }
  };

  const handleNewChatClick = () => {
    createNewChat();
    navigate('/');
    handleNavClick();
  };

  const handleSelectChat = (chatId: string) => {
    openChat(chatId);
    navigate('/');
    handleNavClick();
  };

  const handleStartRename = (e: React.MouseEvent, chat: ChatSession) => {
    e.stopPropagation();
    setRenamingChatId(chat.id);
    setRenameTitle(chat.title);
    setActiveMenuChatId(null);
  };

  const handleSaveRename = (chatId: string) => {
    if (renameTitle.trim()) {
      renameChat(chatId, renameTitle.trim());
    }
    setRenamingChatId(null);
  };

  const handleConfirmDelete = (e: React.MouseEvent, chatId: string) => {
    e.stopPropagation();
    setDeletingChatId(chatId);
    setActiveMenuChatId(null);
  };

  if (!isOpen) return null;

  const groupedChatSections = groupChatsByDate(filteredChats);

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm transition-opacity"
      />

      {/* Delete Confirmation Modal */}
      {deletingChatId && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#18181b] border border-zinc-800 rounded-xl p-5 max-w-xs w-full shadow-2xl">
            <h3 className="text-sm font-bold text-zinc-100 mb-1">Delete this conversation?</h3>
            <p className="text-xs text-zinc-400 mb-4">This will permanently remove this chat history.</p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setDeletingChatId(null)} 
                className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => { 
                  deleteChat(deletingChatId); 
                  setDeletingChatId(null); 
                }} 
                className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-500 text-white rounded-lg font-semibold transition-colors shadow-sm"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <aside className="fixed md:relative inset-y-0 left-0 z-50 w-[260px] flex-shrink-0 bg-[#09090b] border-r border-zinc-800/50 flex flex-col h-full transition-all duration-300 shadow-2xl md:shadow-none">
        <div className="h-14 flex items-center justify-between px-4 border-b border-zinc-800/30">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-emerald-500/20 rounded-md flex items-center justify-center border border-emerald-500/30 mr-2.5">
              <Sprout className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <span className="text-sm font-semibold text-zinc-100 tracking-tight">AgriGPT OS</span>
          </div>
          <button 
            onClick={onClose}
            className="md:hidden p-1 text-zinc-400 hover:text-zinc-200 rounded-md"
          >
            ✕
          </button>
        </div>
        
        <div className="p-3">
          <button 
            onClick={handleNewChatClick}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-zinc-100 text-zinc-900 rounded-lg text-xs font-semibold hover:bg-white transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            {t('nav.newChat')}
          </button>
        </div>

        <div className="px-3 py-2 space-y-0.5 border-b border-zinc-800/30 pb-3">
          {menuItems.map((item, i) => (
            <NavLink
              key={i}
              to={item.path}
              onClick={handleNavClick}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-sm transition-all duration-200 group",
                  isActive
                    ? "bg-zinc-800/50 text-zinc-100 font-medium"
                    : "text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200"
                )
              }
            >
              <item.icon className="w-4 h-4 opacity-70 group-hover:opacity-100 transition-opacity" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>

        <div className="flex-1 py-3 px-3 overflow-y-auto scrollbar-thin flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 px-2">
            <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{t('nav.recent')}</span>
          </div>

          {/* Search Box */}
          <div className="mb-3 px-1">
            <div className="relative flex items-center bg-zinc-900/80 border border-zinc-800/80 rounded-lg overflow-hidden px-2.5 py-1 focus-within:border-zinc-700 transition-colors">
              <Search className="w-3.5 h-3.5 text-zinc-500 mr-2 shrink-0" />
              <input 
                type="text" 
                placeholder="Search history..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-zinc-200 placeholder-zinc-500 outline-none w-full"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-zinc-500 hover:text-zinc-300">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Chat List */}
          {isLoadingChats ? (
            <div className="px-2 py-4 text-xs text-zinc-500 animate-pulse">Loading history...</div>
          ) : filteredChats.length === 0 ? (
            <div className="px-3 py-6 text-center space-y-1">
              <p className="text-xs text-zinc-400 font-medium">No conversations yet.</p>
              <p className="text-[11px] text-zinc-600">Start a new chat with AgriGPT.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {groupedChatSections.map(section => (
                <div key={section.label} className="space-y-0.5">
                  <div className="text-[9px] font-bold text-zinc-600 uppercase tracking-wider px-2 py-1">
                    {section.label}
                  </div>
                  {section.chats.map(chat => {
                    const isActive = chat.id === activeChatId;
                    const isRenaming = chat.id === renamingChatId;
                    const isMenuOpen = chat.id === activeMenuChatId;

                    return (
                      <div 
                        key={chat.id}
                        className={cn(
                          "relative group/item rounded-md transition-all duration-150 flex items-center",
                          isActive 
                            ? "bg-zinc-800/80 text-zinc-100 border border-zinc-700/50" 
                            : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                        )}
                      >
                        {isRenaming ? (
                          <div className="flex items-center gap-1 p-1 w-full">
                            <input 
                              type="text" 
                              value={renameTitle} 
                              onChange={(e) => setRenameTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveRename(chat.id);
                                if (e.key === 'Escape') setRenamingChatId(null);
                              }}
                              autoFocus
                              className="bg-zinc-900 border border-zinc-700 text-xs text-zinc-100 px-2 py-1 rounded w-full outline-none focus:border-emerald-500"
                            />
                            <button 
                              onClick={() => handleSaveRename(chat.id)}
                              className="px-2 py-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium"
                            >
                              Save
                            </button>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => handleSelectChat(chat.id)}
                              className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-xs truncate min-w-0"
                            >
                              <MessageSquare className={cn(
                                "w-3.5 h-3.5 flex-shrink-0 transition-opacity",
                                isActive ? "text-emerald-400 opacity-100" : "opacity-50 group-hover/item:opacity-100"
                              )} />
                              <span className="truncate font-medium flex-1">{chat.title}</span>
                            </button>

                            {/* Options ⋮ button */}
                            <div className="relative shrink-0 pr-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenuChatId(isMenuOpen ? null : chat.id);
                                }}
                                className={cn(
                                  "p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-opacity",
                                  isMenuOpen ? "opacity-100 text-zinc-200" : "opacity-0 group-hover/item:opacity-100"
                                )}
                                title="Conversation options"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {/* Dropdown Menu */}
                              {isMenuOpen && (
                                <div className="absolute right-0 top-6 z-50 bg-[#18181b] border border-zinc-800 rounded-lg shadow-xl py-1 w-28 text-xs">
                                  <button
                                    onClick={(e) => handleStartRename(e, chat)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 flex items-center gap-2"
                                  >
                                    <Edit2 className="w-3 h-3" /> Rename
                                  </button>
                                  <button
                                    onClick={(e) => handleConfirmDelete(e, chat.id)}
                                    className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 text-red-400 hover:text-red-300 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3 h-3" /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-3 border-t border-zinc-800/50 space-y-0.5">
          <button className="w-full text-left flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-all duration-200 text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200 group">
            <Settings className="w-4 h-4 opacity-70 group-hover:opacity-100" />
            <span className="font-medium">{t('nav.settings')}</span>
          </button>
          <button onClick={() => { logout(); handleNavClick(); }} className="w-full text-left flex items-center gap-2.5 px-2.5 py-1.5 rounded-md text-sm transition-all duration-200 text-zinc-400 hover:bg-zinc-800/30 hover:text-zinc-200 hover:text-red-400 group">
            <LogOut className="w-4 h-4 opacity-70 group-hover:opacity-100" />
            <span className="font-medium">{t('nav.logout')}</span>
          </button>
        </div>
      </aside>
    </>
  );
}
