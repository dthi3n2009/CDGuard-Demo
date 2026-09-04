import React from 'react';
import { LayoutDashboard, History, MessageSquare, ShieldAlert, Trees } from 'lucide-react';

export type TabType = 'overview' | 'trends' | 'ai_assistant' | 'remediation' | 'gardens';

interface BottomNavProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  hasUnreadAlert?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onTabChange,
  hasUnreadAlert = false
}) => {
  const tabs = [
    { id: 'overview' as TabType, label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'trends' as TabType, label: 'Lịch sử đo', icon: History },
    { id: 'ai_assistant' as TabType, label: 'Hỏi Trợ Lý AI', icon: MessageSquare, badge: false },
    { id: 'remediation' as TabType, label: 'Xử lý đất', icon: ShieldAlert, badge: hasUnreadAlert },
    { id: 'gardens' as TabType, label: 'Quản lý vườn', icon: Trees }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E3E9E5] shadow-lg z-30 px-1 py-1">
      <div className="max-w-md mx-auto grid grid-cols-5 gap-0.5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center justify-center py-2 px-1 rounded-xl transition-all ${
                isActive
                  ? 'text-[#2D7D46] font-extrabold bg-emerald-50/80 scale-105'
                  : 'text-[#6B7D72] hover:text-[#1F2D24] font-medium'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
                {tab.badge && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                )}
                {tab.badge && (
                  <span className="absolute -top-1 -right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full" />
                )}
              </div>
              <span className="text-[10px] leading-tight text-center truncate w-full font-bold">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};


