import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Garden, UserProfile, AppSettings, SyncStatusState } from './types';
import { localStorageService } from './services/localStorageService';
import { fetchLatestFirebaseReading, subscribeToGardenRealtime, getCurrentGoogleUser, logoutFirebase } from './services/firebaseService';
import { DEFAULT_GARDEN } from './services/demoDataService';
import { roomStorageService } from './services/roomStorageService';
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

import { ConsultationHistoryModal } from './components/ConsultationHistoryModal';
import { LiveSurveyModal } from './components/LiveSurveyModal';
import { Toast } from './components/Toast';
import { GuestCloudStatus } from './components/GuestCloudStatus';
import { RealtimeReadingModal } from './components/RealtimeReadingModal';
import { IS_DEMO_MODE } from './services/demoMode';

export default function App() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    const saved = localStorageService.getUserProfile();
    return saved?.isDemo ? saved : null;
  });
  const [authLoading, setAuthLoading] = useState(true);
  useEffect(() => {
    let active = true;
    getCurrentGoogleUser().then(user => {
      if (!active || !user) return;
      const profile = { id: user.uid, email: user.email || undefined, displayName: user.displayName || 'Chủ vườn', photoURL: user.photoURL || undefined, isDemo: false };
      setUserProfile(profile);
      localStorageService.saveUserProfile(profile);
    }).catch(() => {}).finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);
  const [settings, setSettings] = useState<AppSettings>(() => localStorageService.getSettings());
  const [gardens, setGardens] = useState<Garden[]>(() => localStorageService.getGardens());
  const [currentGardenId, setCurrentGardenId] = useState<string>(() => {
    const saved = localStorageService.getSettings();
    return saved.currentGardenId || 'iot';
  });

  // Phi Yến is a supplied historical garden (05/09), so it must remain
  // available in the garden selector even for people who already used an
  // earlier build of the app.
  useEffect(() => {
    roomStorageService.seedPhiYenMeasurements();
    setGardens(previous => {
      if (previous.some(garden => garden.id === DEFAULT_GARDEN.id)) return previous;
      const next = [...previous, DEFAULT_GARDEN];
      localStorageService.saveGardens(next);
      return next;
    });
  }, []);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(() => !localStorageService.getSettings().onboardingCompleted);
  const [showGlobalHistoryModal, setShowGlobalHistoryModal] = useState<boolean>(false);
  const [showLiveSurveyModal, setShowLiveSurveyModal] = useState<boolean>(false);
  const [showRealtime, setShowRealtime] = useState(false);
  const [realtimeTreeId, setRealtimeTreeId] = useState<string | undefined>();
  useEffect(() => { setShowRealtime(false); }, [currentGardenId]);
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
    const hasTreeMeasurement = roomStorageService
      .getTreeLocations(currentGarden.id)
      .some(tree => tree.lastPh !== undefined && tree.lastEc !== undefined && tree.lastMoisture !== undefined && tree.lastTemp !== undefined);
    if (!hasTreeMeasurement) {
      setPrevCrsLevel(null);
      return;
    }
    const crsScore = calculateCRS(currentGarden.ph, currentGarden.ec, currentGarden.moisture, currentGarden.temperature);
    const crsInfo = getCRSInfo(crsScore, currentGarden.ph, currentGarden.ec, currentGarden.moisture, currentGarden.temperature);

    if (prevCrsLevel && prevCrsLevel !== crsInfo.levelText) {
      setToast({
        message: `Cảnh báo: Mức nguy cơ Cadmium (CRS) chuyển sang: ${crsInfo.levelText} (${crsScore}/100)!`,
        type: crsScore >= 50 ? 'danger' : 'warning'
      });
    }
    setPrevCrsLevel(crsInfo.levelText);
  }, [currentGarden.id, currentGarden.ph, currentGarden.ec, currentGarden.moisture, currentGarden.temperature]);

  // Manual Trigger: Immediate Sync with Firebase
  const handleManualSync = useCallback(async () => {
    if (IS_DEMO_MODE) {
      setSyncStatus('updated');
      setLastSyncTime(Date.now());
      setToast({ message: 'Chế độ demo: hãy bấm Realtime hoặc Khảo sát để tạo số đo mới.', type: 'info' });
      return;
    }
    setSyncStatus('syncing');
    try {
      const res = await fetchLatestFirebaseReading();
      setLastSyncTime(Date.now());
      const current = currentGardenRef.current;
      const matchedTree = res.data?.treeName && roomStorageService
        .getTreeLocations(current.id)
        .some(tree => tree.name === res.data?.treeName);
      if (res.success && res.data && res.data.deviceId === current.deviceId && matchedTree) {
        setSyncStatus('updated');
        updateCurrentGarden({
          ...current,
          ph: res.data.ph,
          ec: res.data.ec,
          moisture: res.data.moisture,
          temperature: res.data.temp,
          online: res.online,
          hasVerifiedReading: true,
          lastUpdated: res.data.ts
        });
        setToast({
          message: res.online ? `Đã nhận số đo mới cho ${res.data.treeName}.` : 'Đã đọc bản ghi cũ từ Firebase; chưa có số đo mới từ trạm.',
          type: 'success'
        });
      } else {
        setSyncStatus('disconnected');
        updateCurrentGarden({ ...currentGardenRef.current, online: false });
        setToast({
          message: 'Firebase chưa có bản ghi gắn tên cây cho vườn này nên không thể tổng hợp toàn vườn.',
          type: 'warning'
        });
      }
    } catch {
      setSyncStatus('error');
    }
  }, [updateCurrentGarden]);

  // Active Real-time Firebase RTDB Stream + Continuous Polling Fallback
  useEffect(() => {
    if (IS_DEMO_MODE || !userProfile || gardens.length === 0 || showOnboarding) return;

    const unsubscribe = subscribeToGardenRealtime((state) => {
      setLastSyncTime(state.lastSyncTime);

      const cur = currentGardenRef.current;
      const matchedTree = state.reading.data?.treeName && roomStorageService
        .getTreeLocations(cur.id)
        .some(tree => tree.name === state.reading.data?.treeName);

      if (state.reading.success && state.reading.data && state.reading.data.deviceId === cur.deviceId && matchedTree) {
        setSyncStatus(state.status);
        updateCurrentGarden({
          ...cur,
          ph: state.reading.data.ph,
          ec: state.reading.data.ec,
          moisture: state.reading.data.moisture,
          temperature: state.reading.data.temp,
          online: state.reading.online,
          hasVerifiedReading: true,
          lastUpdated: state.reading.data.ts
        });
      } else {
        setSyncStatus('disconnected');
        updateCurrentGarden({ ...currentGardenRef.current, online: false });
      }
    });

    return () => {
      unsubscribe();
    };
  }, [userProfile, gardens.length, showOnboarding, updateCurrentGarden]);

  // Handle Login Event
  const handleLoginSuccess = (profile: UserProfile, authMode: 'google' | 'demo') => {
    setUserProfile(profile);
    localStorageService.saveUserProfile(profile);

    const newSettings = {
      ...settings,
      authMode,
      currentGardenId,
      onboardingCompleted: settings.onboardingCompleted
    };
    setSettings(newSettings);
    localStorageService.saveSettings(newSettings);

    setShowOnboarding(!settings.onboardingCompleted || gardens.length === 0);

    setToast({
      message: `Đăng nhập thành công! Đang hiển thị trạng thái đất vườn.`,
      type: 'success'
    });
  };

  // Handle Logout Event
  const handleLogout = async () => {
    if (!userProfile?.isDemo) {
      try { await logoutFirebase(); } catch {
        setToast({ message: 'Chưa đăng xuất được Firebase. Vui lòng thử lại.', type: 'warning' });
        return;
      }
    }
    setUserProfile(null);
    localStorageService.saveUserProfile(null);
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
    // Entering the example garden is an explicit choice, never a first-run default.
    if (gardens.length === 0) {
      roomStorageService.seedPhiYenMeasurements();
      setGardens([DEFAULT_GARDEN]);
      localStorageService.saveGardens([DEFAULT_GARDEN]);
      setCurrentGardenId(DEFAULT_GARDEN.id);
    }
    const updatedSettings = {
      ...settings,
      onboardingCompleted: true
    };
    setSettings(updatedSettings);
    localStorageService.saveSettings(updatedSettings);
    setShowOnboarding(false);
  };

  // Render Login View if not logged in
  if (authLoading) return <div className="p-8 text-center">Đang kiểm tra phiên đăng nhập…</div>;
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
        onResetApp={async () => {
          if (!window.confirm('Đưa app về lần sử dụng đầu tiên? Bạn sẽ đăng xuất và thiết lập lại vườn, cây trên máy này. App lưu một bản sao dữ liệu cũ trên máy; dữ liệu Firebase không bị xóa.')) return;
          try {
            if (!userProfile.isDemo) await logoutFirebase();
            localStorageService.resetForNewUser();
            window.location.reload();
          } catch {
            setToast({ message: 'Không tạo được bản sao dữ liệu. App chưa được đặt lại.', type: 'warning' });
          }
        }}
        onOpenConsultationHistory={() => setShowGlobalHistoryModal(true)}
        syncStatus={syncStatus}
        lastSyncTime={lastSyncTime}
        onManualSync={() => { setRealtimeTreeId(undefined); setShowRealtime(true); }}
      />

      {/* Main Content Area */}
      <GuestCloudStatus />
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
            onManualSync={(treeId) => { setRealtimeTreeId(treeId); setShowRealtime(true); }}
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
            syncStatus={syncStatus}
            onUpdateGarden={updateCurrentGarden}
            onOpenLiveSurvey={() => setShowLiveSurveyModal(true)}
          />
        )}
      </main>

      {/* Global Consultation History Modal */}
      {showRealtime && <RealtimeReadingModal garden={currentGarden} initialTreeId={realtimeTreeId} onClose={() => setShowRealtime(false)} />}
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
