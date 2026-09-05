import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Garden, UserProfile, AppSettings, SyncStatusState } from './types';
import { localStorageService } from './services/localStorageService';
import { fetchLatestFirebaseReading, subscribeToGardenRealtime } from './services/firebaseService';
import { DEFAULT_GARDEN } from './services/demoDataService';
import { calculateCRS, getCRSInfo } from './utils/crsCalculator';

import { LoginView } from './views/LoginView';
import { OnboardingView } from './views/OnboardingView';
import { Header } from './components/Header';
import { BottomNav, TabType } from './components/BottomNav';
import { OverviewTab } from './views/OverviewTab';
import { TrendsTab } from './views/TrendsTab';
import { RemediationTab } from './views/RemediationTab';
import { AIAssistantTab } from './views/AIAssistantTab';
import { AIAnalysisTab } from './views/AIAnalysisTab';
import { GardensManagementTab } from './views/GardensManagementTab';
import { ExtensionsTab } from './views/ExtensionsTab';
import { DeviceTab } from './views/DeviceTab';

import { DevModePanel } from './components/DevModePanel';
import { ConsultationHistoryModal } from './components/ConsultationHistoryModal';
import { LiveSurveyModal } from './components/LiveSurveyModal';
import { Toast } from './components/Toast';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => localStorageService.getUserProfile());
  const [settings, setSettings] = useState<AppSettings>(() => localStorageService.getSettings());
  const [gardens, setGardens] = useState<Garden[]>(() => localStorageService.getGardens());
  const [currentGardenId, setCurrentGardenId] = useState<string>(() => {
    const saved = localStorageService.getSettings();
    return saved.currentGardenId || 'iot';
  });

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showDevPanel, setShowDevPanel] = useState<boolean>(false);
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [showGlobalHistoryModal, setShowGlobalHistoryModal] = useState<boolean>(false);
  const [showLiveSurveyModal, setShowLiveSurveyModal] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'warning' | 'danger' | 'success' } | null>(null);

  // Real-time synchronization states
  const [syncStatus, setSyncStatus] = useState<SyncStatusState>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());

  // Active garden helper
  const currentGarden = gardens.find(g => g.id === currentGardenId) || gardens[0] || DEFAULT_GARDEN;
  const currentGardenRef = useRef(currentGarden);
  useEffect(() => {
    currentGardenRef.current = currentGarden;
  }, [currentGarden]);

  // Track previous CRS level for Toast alerts on level shift
  const [prevCrsLevel, setPrevCrsLevel] = useState<string | null>(null);

  // Synchronize Garden update
  const updateCurrentGarden = useCallback((updated: Garden) => {
    setGardens(prev => {
      const next = prev.map(g => g.id === updated.id ? updated : g);
      localStorageService.saveGardens(next);
      return next;
    });
  }, []);

  // Check CRS Level Shifts
  useEffect(() => {
    const crsScore = calculateCRS(currentGarden.ph, currentGarden.ec, currentGarden.moisture, currentGarden.temperature);
    const crsInfo = getCRSInfo(crsScore, currentGarden.ph, currentGarden.ec, currentGarden.moisture, currentGarden.temperature);

    if (prevCrsLevel && prevCrsLevel !== crsInfo.levelText) {
      setToast({
        message: `Cảnh báo: Mức nguy cơ Cadmium (CRS) chuyển sang: ${crsInfo.levelText} (${crsScore}/100)!`,
        type: crsScore >= 50 ? 'danger' : 'warning'
      });
    }
    setPrevCrsLevel(crsInfo.levelText);
  }, [currentGarden.ph, currentGarden.ec, currentGarden.moisture, currentGarden.temperature]);

  // Manual Trigger: Immediate Sync with Firebase
  const handleManualSync = useCallback(async () => {
    setSyncStatus('syncing');
    try {
      const res = await fetchLatestFirebaseReading();
      setLastSyncTime(Date.now());
      if (res.success && res.data) {
        setSyncStatus('updated');
        updateCurrentGarden({
          ...currentGardenRef.current,
          ph: res.data.ph,
          ec: res.data.ec,
          moisture: res.data.moisture,
          temperature: res.data.temp,
          online: res.online,
          lastUpdated: res.data.ts || Date.now()
        });
        setToast({
          message: `Đã đồng bộ dữ liệu Realtime từ ESP32 (${res.data.deviceId}): pH ${res.data.ph}, EC ${res.data.ec} dS/m`,
          type: 'success'
        });
      } else {
        setSyncStatus('disconnected');
        setToast({
          message: 'Không thể kết nối tới trạm đo Firebase. Vui lòng kiểm tra lại mạng.',
          type: 'warning'
        });
      }
    } catch {
      setSyncStatus('error');
    }
  }, [updateCurrentGarden]);

  // Active Real-time Firebase RTDB Stream + Continuous Polling Fallback
  useEffect(() => {
    if (!userProfile) return;

    const unsubscribe = subscribeToGardenRealtime((state) => {
      setSyncStatus(state.status);
      setLastSyncTime(state.lastSyncTime);

      // In Dev mode with auto fluctuation off, do not overwrite manually set values
      if (userProfile.isDevMode && !settings.autoFluctuateInDev) {
        return;
      }

      if (state.reading.success && state.reading.data) {
        const cur = currentGardenRef.current;
        updateCurrentGarden({
          ...cur,
          ph: state.reading.data.ph,
          ec: state.reading.data.ec,
          moisture: state.reading.data.moisture,
          temperature: state.reading.data.temp,
          online: state.reading.online,
          lastUpdated: state.reading.data.ts || Date.now()
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userProfile, settings.autoFluctuateInDev, updateCurrentGarden]);

  // Handle Login Event
  const handleLoginSuccess = (profile: UserProfile, authMode: 'google' | 'demo' | 'dev') => {
    setUserProfile(profile);
    localStorageService.saveUserProfile(profile);

    const newSettings = {
      ...settings,
      authMode,
      currentGardenId,
      onboardingCompleted: true
    };
    setSettings(newSettings);
    localStorageService.saveSettings(newSettings);

    // Skip onboarding tutorial modal directly as requested
    setShowOnboarding(false);

    setToast({
      message: `Đăng nhập thành công! Đang hiển thị trạng thái đất vườn.`,
      type: 'success'
    });
  };

  // Handle Logout Event
  const handleLogout = () => {
    setUserProfile(null);
    localStorageService.saveUserProfile(null);
    setShowDevPanel(false);
    setToast({
      message: 'Đã đăng xuất thành công.',
      type: 'info'
    });
  };

  // Handle Onboarding Completion
  const handleOnboardingComplete = (newGarden: Garden) => {
    setGardens(prev => {
      const next = [...prev, newGarden];
      localStorageService.saveGardens(next);
      return next;
    });
    setCurrentGardenId(newGarden.id);

    const updatedSettings = {
      ...settings,
      onboardingCompleted: true,
      currentGardenId: newGarden.id
    };
    setSettings(updatedSettings);
    localStorageService.saveSettings(updatedSettings);
    setShowOnboarding(false);

    setToast({
      message: `Đã khởi tạo xong vườn ${newGarden.name}!`,
      type: 'success'
    });
  };

  const handleSkipOnboarding = () => {
    const updatedSettings = {
      ...settings,
      onboardingCompleted: true
    };
    setSettings(updatedSettings);
    localStorageService.saveSettings(updatedSettings);
    setShowOnboarding(false);
  };

  // Render Login View if not logged in
  if (!userProfile) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Render Onboarding Wizard if new
  if (showOnboarding) {
    return (
      <OnboardingView
        onComplete={handleOnboardingComplete}
        onSkipToDemo={handleSkipOnboarding}
      />
    );
  }

  return (
    <div className="h-[100dvh] bg-[#F5F7F5] text-[#1F2D24] font-sans antialiased flex flex-col overflow-hidden">
      
      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {/* Header */}
      <Header
        gardens={gardens}
        currentGarden={currentGarden}
        onSelectGarden={(id) => {
          setCurrentGardenId(id);
          const updatedSettings = { ...settings, currentGardenId: id };
          setSettings(updatedSettings);
          localStorageService.saveSettings(updatedSettings);
        }}
        onOpenAddGarden={() => setShowOnboarding(true)}
        userProfile={userProfile}
        onLogout={handleLogout}
        isDevMode={userProfile.isDevMode}
        onToggleDevPanel={() => setShowDevPanel(true)}
        onOpenConsultationHistory={() => setShowGlobalHistoryModal(true)}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onManualSync={handleManualSync}
      />

      {/* Main Content Area */}
      <main className={
        activeTab === 'ai_assistant'
          ? 'flex-1 min-h-0 p-2 sm:p-3 pb-16 max-w-4xl mx-auto w-full flex flex-col overflow-hidden'
          : 'flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-2 sm:p-4 pb-20 max-w-4xl mx-auto w-full'
      }>
        {activeTab === 'overview' && (
          <OverviewTab
            garden={currentGarden}
            gardens={gardens}
            onSelectGarden={(id) => {
              setCurrentGardenId(id);
              localStorageService.saveSettings({ ...settings, currentGardenId: id });
            }}
            onNavigateToTab={(t) => setActiveTab(t as TabType)}
            onOpenLiveSurvey={() => setShowLiveSurveyModal(true)}
            syncStatus={syncStatus}
            lastSyncTime={lastSyncTime}
            onManualSync={handleManualSync}
          />
        )}

        {activeTab === 'trends' && (
          <TrendsTab
            garden={currentGarden}
            gardens={gardens}
            onSelectGarden={(id) => {
              setCurrentGardenId(id);
              localStorageService.saveSettings({ ...settings, currentGardenId: id });
            }}
          />
        )}

        {activeTab === 'ai_assistant' && (
          <AIAssistantTab garden={currentGarden} />
        )}

        {activeTab === 'remediation' && (
          <RemediationTab 
            garden={currentGarden} 
            gardens={gardens}
            onSelectGarden={(gId) => setCurrentGardenId(gId)}
          />
        )}

        {activeTab === 'gardens' && (
          <GardensManagementTab
            gardens={gardens}
            currentGarden={currentGarden}
            currentGardenId={currentGardenId}
            onSelectGarden={(id) => {
              setCurrentGardenId(id);
              localStorageService.saveSettings({ ...settings, currentGardenId: id });
            }}
            onUpdateGarden={updateCurrentGarden}
            onAddGarden={(newG) => {
              const updated = [...gardens, newG];
              setGardens(updated);
              localStorageService.saveGardens(updated);
              setCurrentGardenId(newG.id);
            }}
            onDeleteGarden={(delId) => {
              if (gardens.length <= 1) return;
              const updated = gardens.filter(g => g.id !== delId);
              setGardens(updated);
              localStorageService.saveGardens(updated);
              setCurrentGardenId(updated[0].id);
            }}
          />
        )}

        {(activeTab as string) === 'ai_analysis' && (
          <AIAnalysisTab
            garden={currentGarden}
            gardens={gardens}
            onSelectGarden={(id) => {
              setCurrentGardenId(id);
              localStorageService.saveSettings({ ...settings, currentGardenId: id });
            }}
          />
        )}

        {(activeTab as string) === 'extensions' && (
          <ExtensionsTab
            garden={currentGarden}
            gardens={gardens}
            onSelectGarden={(id) => {
              setCurrentGardenId(id);
              localStorageService.saveSettings({ ...settings, currentGardenId: id });
            }}
          />
        )}

        {(activeTab as string) === 'device' && (
          <DeviceTab
            garden={currentGarden}
            onUpdateGarden={updateCurrentGarden}
            onOpenLiveSurvey={() => setShowLiveSurveyModal(true)}
            onSwitchToDemo={() => {
              updateCurrentGarden({
                ...currentGarden,
                ph: 5.4,
                ec: 2.15,
                moisture: 78,
                temperature: 29.5,
                online: true,
                lastUpdated: Date.now()
              });
              setToast({
                message: 'Đã chuyển trạm về chế độ dữ liệu Demo chuẩn.',
                type: 'info'
              });
            }}
          />
        )}
      </main>


      {/* Dev Mode Interactive Control Panel Overlay */}
      {showDevPanel && (
        <DevModePanel
          garden={currentGarden}
          onUpdateGarden={updateCurrentGarden}
          onResetDemo={() => {
            updateCurrentGarden(DEFAULT_GARDEN);
            setToast({ message: 'Đã đặt lại dữ liệu demo ban đầu.', type: 'info' });
          }}
          onClose={() => setShowDevPanel(false)}
        />
      )}

      {/* Global Consultation History Modal */}
      {showGlobalHistoryModal && (
        <ConsultationHistoryModal onClose={() => setShowGlobalHistoryModal(false)} />
      )}

      {/* Live Field Survey Modal (App ↔ Máy Đo ESP32 ↔ Vòng Lặp Tự Động) */}
      {showLiveSurveyModal && (
        <LiveSurveyModal
          garden={currentGarden}
          allGardens={gardens}
          isOpen={showLiveSurveyModal}
          onClose={() => setShowLiveSurveyModal(false)}
          onSelectGarden={(targetG) => {
            setCurrentGardenId(targetG.id);
            localStorageService.saveSettings({ ...settings, currentGardenId: targetG.id });
          }}
          onSessionComplete={(session) => {
            setToast({
              message: `Đã hoàn thành và lưu trữ thành công buổi khảo sát vườn ${session.gardenCode} (${session.completedTrees.length} gốc cây)!`,
              type: 'success'
            });
          }}
        />
      )}

      {/* Fixed Bottom Navigation */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={(t) => setActiveTab(t)}
        hasUnreadAlert={calculateCRS(currentGarden.ph, currentGarden.ec, currentGarden.moisture, currentGarden.temperature) >= 50}
      />

    </div>
  );
}
