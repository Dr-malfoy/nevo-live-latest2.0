import { BrowserRouter, Routes, Route, Outlet, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { lazy, Suspense, useEffect, useState } from 'react';
import { BottomNav, GoLiveFab, Header } from './components/layout';
import { ToastContainer } from './components/ui';
import { useAuthStore, useSocketStore, useUIStore } from './stores';
import { useAndroidBackHandler } from './hooks/useAndroidBackHandler';
import { CallScreen } from './components/call/CallScreen';
import { usersApi } from './api';
import { pushNotificationService } from './services/pushNotification';
import {
  Login,
  Register,
  Home,
  LiveStreamPage,
  Profile,
  Wallet,
  MomentsPage,
  MomentsNew,
  Settings,
  GameHub,
  GoLive,
  Popular,
  Recharge,
  PaymentSettings,
  Sell,
  Withdraw,
  Notifications,
  Discover,
  PublicProfile,
  FollowersList,
  Chats,
  ChatThread,
  AviatorGame,
  TeenPattiGame,
  ForgotPassword,
  Match,
  OfficialNotifications,
  VerificationCenter,
  Income,
  TransferPoints,
  WithdrawMethods,
  TopUp,
  SearchPage,
  MeCenter,
  Store,
  Rankings,
  Rewards,
  Levels,
  AgentDashboard,
  StreamerCenter,
  CreatorCenter,
  Achievements,
  PartyRoom,
  PartyList,
  InviteHosts,
  InviteFriends,
  Referral,
  AssetPassword,
  CallPrice,
  FanClub,
  VideoFeed,
  WatchHistory,
  GamesHub,
  LuckySpin,
  MyAgency,
  AgencyPage,
  CreateAgency,
  AgencyDetails,
  ActivityCenter,
  AgentProfileMock,
  TransferHistory,
  TransactionDetails,
  HelpCenter,
} from './pages';

import { PrivacyPolicy, Guidelines, Terms, AboutUs } from './pages/legal/LegalPage';

// Lazy-load the premium roulette screen (heavy SVG + framer-motion).
const RouletteGame = lazy(() => import('./pages/RouletteGame'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
    },
  },
});

/** Screens that render their own header — the shared one would duplicate it. */
const OWN_HEADER_ROUTES = ['/profile', '/', '/party', '/social', '/chats'];

// Wraps pages that show the bottom nav
const MainLayout = () => {
  const { pathname } = useLocation();
  const hasOwnHeader = OWN_HEADER_ROUTES.includes(pathname);

  return (
    <div className="min-h-screen max-w-md mx-auto bg-white pb-16">
      {!hasOwnHeader && <Header />}
      <Outlet />
      <GoLiveFab />
      <BottomNav />
    </div>
  );
};

// Stream layout — full screen, no bottom nav
const StreamLayout = () => (
  <div className="min-h-screen bg-black text-white mx-auto">
    <Outlet />
  </div>
);

const AuthListener = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, token, user, updateUser, fetchProfile } = useAuthStore();
  const { socket, connect, disconnect } = useSocketStore();
  const showToast = useUIStore((s) => s.showToast);
  const location = useLocation();
  const navigate = useNavigate();

  const [globalIncomingCall, setGlobalIncomingCall] = useState<{
    callId: string;
    channel: string;
    type: 'audio' | 'video';
    initiatorId: string;
    token: string;
    coinsPerMinute?: number;
    initiator: { nickname: string; avatar?: string } | null;
  } | null>(null);
  const [globalCallAccepted, setGlobalCallAccepted] = useState(false);

  useEffect(() => {
    if (isAuthenticated && token) {
      connect(token);
      fetchProfile();

      // Initialize Push Notifications
      pushNotificationService.init({
        onIncomingCall: (callData) => {
          if (!callData?.callId || callData.initiatorId === user?._id) return;
          setGlobalIncomingCall({
            callId: callData.callId,
            channel: callData.channel,
            type: callData.type,
            initiatorId: callData.initiatorId,
            token: callData.token,
            coinsPerMinute: callData.coinsPerMinute,
            initiator: {
              nickname: callData.initiatorName || 'Someone',
              avatar: callData.initiatorAvatar || '',
            },
          });
          setGlobalCallAccepted(false);
        },
        onCallCancelled: (callId) => {
          setGlobalIncomingCall((cur) => (cur?.callId === callId ? null : cur));
        },
        onNavigate: (url) => {
          if (url) navigate(url);
        },
      });
    } else {
      disconnect();
      pushNotificationService.unregister().catch(() => {});
    }
  }, [isAuthenticated, token, connect, disconnect, fetchProfile, navigate, user?._id]);

  // Real-time balance sync (gifts, etc.) — keeps the persisted user fresh
  useEffect(() => {
    if (!socket) return;
    const onBalance = (data: { coins?: number; diamonds?: number }) => {
      updateUser({
        coins: data.coins ?? undefined,
        diamonds: data.diamonds ?? undefined,
      });
    };
    socket.on('balance:update', onBalance);
    return () => {
      socket.off('balance:update', onBalance);
    };
  }, [socket]);

  // Real-time verification sync — admin approve/reject updates profile state instantly
  useEffect(() => {
    if (!socket) return;
    const onVerification = (data: {
      status: 'VERIFIED' | 'REJECTED' | 'PENDING' | 'UNDER_REVIEW';
      verified: boolean;
      rejectionReason?: string;
    }) => {
      updateUser({
        verification: {
          ...(useAuthStore.getState().user?.verification || { status: 'NOT_SUBMITTED', verified: false }),
          status: data.status,
          verified: data.verified,
          rejectionReason: data.rejectionReason,
          verifiedAt: data.verified ? new Date().toISOString() : undefined,
          reviewedAt: new Date().toISOString(),
        },
      });
    };
    socket.on('verification:updated', onVerification);
    return () => {
      socket.off('verification:updated', onVerification);
    };
  }, [socket]);

  // Global incoming call listener (so calls are answered even outside chat screen)
  useEffect(() => {
    if (!socket) return;
    const onCallInvite = async (payload: any) => {
      // If user is currently in that ChatThread, ChatThread handles it locally
      if (location.pathname.startsWith('/chat/')) return;
      if (!payload?.callId || payload.initiatorId === user?._id) return;

      let initiatorInfo = payload.initiator || null;
      if (!initiatorInfo && payload.initiatorId) {
        try {
          const res = await usersApi.getPublicProfile(payload.initiatorId);
          if (res.data?.success) {
            initiatorInfo = { nickname: res.data.data.nickname, avatar: res.data.data.avatar };
          }
        } catch {
          // ignore
        }
      }

      setGlobalIncomingCall({
        callId: payload.callId,
        channel: payload.channel,
        type: payload.type,
        initiatorId: payload.initiatorId,
        token: payload.token,
        coinsPerMinute: payload.coinsPerMinute,
        initiator: initiatorInfo || { nickname: 'User', avatar: '' },
      });
      setGlobalCallAccepted(false);
    };

    const onCallEnd = (payload: any) => {
      if (payload?.callId) {
        setGlobalIncomingCall((cur) => (cur?.callId === payload.callId ? null : cur));
      }
    };

    socket.on('call:invite', onCallInvite);
    socket.on('call:end', onCallEnd);
    return () => {
      socket.off('call:invite', onCallInvite);
      socket.off('call:end', onCallEnd);
    };
  }, [socket, location.pathname, user?._id]);

  return (
    <>
      {children}
      {globalIncomingCall && (
        <CallScreen
          incoming={globalIncomingCall}
          accepted={globalCallAccepted}
          coinsPerMinute={globalIncomingCall.coinsPerMinute}
          onClose={(outcome) => {
            setGlobalIncomingCall(null);
            setGlobalCallAccepted(false);
            if (outcome === 'rejected') showToast('Call declined', 'info');
          }}
        />
      )}
    </>
  );
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuth = useAuthStore((s) => s.isAuthenticated);
  if (!isAuth) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const NavigationManager = ({ children }: { children: React.ReactNode }) => {
  useAndroidBackHandler();
  return <>{children}</>;
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <NavigationManager>
          <AuthListener>
            <Routes>
            {/* Auth pages — no nav */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/invite/:inviteCode" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route
              path="/admin/*"
              element={
                <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                  <h2 className="text-xl font-bold text-ink mb-2">Redirecting to Admin Portal</h2>
                  <p className="text-ink-muted text-sm mb-4">Please wait...</p>
                  <a
                    href="http://localhost:3001"
                    className="px-6 py-2.5 bg-brand text-white font-bold text-sm rounded-xl"
                  >
                    Open Admin Dashboard (Port 3001)
                  </a>
                </div>
              }
            />

            {/* Legal & Help pages — no nav */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/guidelines" element={<Guidelines />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/about" element={<AboutUs />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/help-center" element={<HelpCenter />} />
            <Route path="/support" element={<HelpCenter />} />


            {/* Stream pages — no nav, full screen */}
            <Route element={<StreamLayout />}>
              <Route path="/live/:id" element={<LiveStreamPage />} />
              <Route path="/match" element={<ProtectedRoute><Match /></ProtectedRoute>} />
              <Route path="/official-notifications" element={<OfficialNotifications />} />
            </Route>

            {/* Main pages — with bottom nav */}
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/party" element={<PartyList />} />
              <Route path="/game" element={<GameHub />} />
              <Route path="/social" element={<MomentsPage />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/chats" element={<ProtectedRoute><Chats /></ProtectedRoute>} />
            </Route>

            {/* Protected pages */}
            <Route
              path="/wallet"
              element={<ProtectedRoute><Wallet /></ProtectedRoute>}
            />
            <Route
              path="/settings"
              element={<ProtectedRoute><Settings /></ProtectedRoute>}
            />
            <Route
              path="/verification"
              element={<ProtectedRoute><VerificationCenter /></ProtectedRoute>}
            />
            <Route
              path="/go-live"
              element={<ProtectedRoute><GoLive /></ProtectedRoute>}
            />
            <Route
              path="/moments/new"
              element={<ProtectedRoute><MomentsNew /></ProtectedRoute>}
            />
            <Route
              path="/recharge"
              element={<ProtectedRoute><Recharge /></ProtectedRoute>}
            />
            <Route
              path="/payment-settings"
              element={<ProtectedRoute><PaymentSettings /></ProtectedRoute>}
            />
            <Route
              path="/sell"
              element={<ProtectedRoute><Sell /></ProtectedRoute>}
            />
            <Route
              path="/withdraw"
              element={<ProtectedRoute><Withdraw /></ProtectedRoute>}
            />
            <Route
              path="/notifications"
              element={<ProtectedRoute><Notifications /></ProtectedRoute>}
            />

            {/* Money — #15 income, #20 top-up, #23 payout methods, #24 transfer */}
            <Route
              path="/income"
              element={<ProtectedRoute><Income /></ProtectedRoute>}
            />
            <Route
              path="/income/:source"
              element={<ProtectedRoute><Income /></ProtectedRoute>}
            />
            <Route
              path="/my-agency"
              element={<ProtectedRoute><MyAgency /></ProtectedRoute>}
            />
            <Route
              path="/agency"
              element={<AgencyPage />}
            />
            <Route
              path="/agencies"
              element={<AgencyPage />}
            />
            <Route
              path="/agency/create"
              element={<ProtectedRoute><CreateAgency /></ProtectedRoute>}
            />
            <Route
              path="/agency/:id"
              element={<AgencyDetails />}
            />
            <Route
              path="/top-up"
              element={<ProtectedRoute><TopUp /></ProtectedRoute>}
            />
            <Route
              path="/withdraw-methods"
              element={<ProtectedRoute><WithdrawMethods /></ProtectedRoute>}
            />
            <Route
              path="/transfer"
              element={<ProtectedRoute><TransferPoints /></ProtectedRoute>}
            />
            <Route
              path="/transfer/history"
              element={<ProtectedRoute><TransferHistory /></ProtectedRoute>}
            />
            <Route
              path="/transactions/:id"
              element={<ProtectedRoute><TransactionDetails /></ProtectedRoute>}
            />
            <Route
              path="/transaction/:id"
              element={<ProtectedRoute><TransactionDetails /></ProtectedRoute>}
            />

            {/* #64 search · #29 me center menu */}
            <Route
              path="/search"
              element={<ProtectedRoute><SearchPage /></ProtectedRoute>}
            />
            <Route
              path="/me/center"
              element={<ProtectedRoute><MeCenter /></ProtectedRoute>}
            />

            {/* Store — #45-#49, #51 */}
            <Route path="/store" element={<ProtectedRoute><Store /></ProtectedRoute>} />

            {/* Rankings — #28, #35-#38, #71 (board chosen via ?board=) */}
            <Route path="/rankings" element={<ProtectedRoute><Rankings /></ProtectedRoute>} />

            {/* Tasks & rewards — #30, #31, #32, #69 */}
            <Route path="/rewards" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />
            <Route path="/daily-tasks" element={<ProtectedRoute><Rewards /></ProtectedRoute>} />

            {/* Level privileges — #33, #43, #55, #61 (?kind=wealth|livestream) */}
            <Route path="/levels" element={<ProtectedRoute><Levels /></ProtectedRoute>} />

            {/* Agent — #5, #34, #52, #54 */}
            <Route path="/agent" element={<ProtectedRoute><AgentDashboard /></ProtectedRoute>} />
            <Route path="/agent/invite-hosts" element={<ProtectedRoute><InviteHosts /></ProtectedRoute>} />

            {/* Creator centers — #40, #42, #62 */}
            <Route path="/streamer-center" element={<ProtectedRoute><StreamerCenter /></ProtectedRoute>} />
            <Route path="/creator-center" element={<ProtectedRoute><CreatorCenter /></ProtectedRoute>} />

            {/* #53 achievement posters */}
            <Route path="/achievements" element={<ProtectedRoute><Achievements /></ProtectedRoute>} />

            {/* Party — #17, #18, #19, #50 */}
            <Route path="/party/:id" element={<ProtectedRoute><PartyRoom /></ProtectedRoute>} />

            {/* Referral — #26, #27, #58 */}
            <Route path="/invite" element={<ProtectedRoute><InviteFriends /></ProtectedRoute>} />
            <Route path="/referral" element={<ProtectedRoute><Referral /></ProtectedRoute>} />

            {/* Security — #6 asset password, #72 call price */}
            <Route path="/asset-password" element={<ProtectedRoute><AssetPassword /></ProtectedRoute>} />
            <Route path="/call-price" element={<ProtectedRoute><CallPrice /></ProtectedRoute>} />

            {/* Fan club & groups — #41, #59 */}
            <Route path="/fan-club" element={<ProtectedRoute><FanClub /></ProtectedRoute>} />

            {/* #63 watch history */}
            <Route path="/watch-history" element={<ProtectedRoute><WatchHistory /></ProtectedRoute>} />

            {/* Games — #66, #67, #68, #70 */}
            <Route path="/games" element={<ProtectedRoute><GamesHub /></ProtectedRoute>} />
            <Route path="/lucky-spin" element={<ProtectedRoute><LuckySpin /></ProtectedRoute>} />
            <Route path="/activities" element={<ProtectedRoute><ActivityCenter /></ProtectedRoute>} />

            {/* #57 short video feed — full-bleed, own chrome */}
            <Route path="/videos" element={<ProtectedRoute><VideoFeed /></ProtectedRoute>} />

            <Route
              path="/user/59237509"
              element={<ProtectedRoute><AgentProfileMock /></ProtectedRoute>}
            />
            <Route
              path="/user/:id"
              element={<ProtectedRoute><PublicProfile /></ProtectedRoute>}
            />
            <Route
              path="/user/:id/:listType"
              element={<ProtectedRoute><FollowersList /></ProtectedRoute>}
            />

            <Route
              path="/chat/:chatId"
              element={<ProtectedRoute><ChatThread /></ProtectedRoute>}
            />
            <Route
              path="/game/aviator"
              element={<ProtectedRoute><AviatorGame /></ProtectedRoute>}
            />
            <Route
              path="/game/teenpatti"
              element={<ProtectedRoute><TeenPattiGame /></ProtectedRoute>}
            />
            <Route
              path="/game/roulette"
              element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-ink-muted">Loading Roulette…</div>}>
                    <RouletteGame />
                  </Suspense>
                </ProtectedRoute>
              }
            />
          </Routes>
          <ToastContainer />
        </AuthListener>
      </NavigationManager>
    </BrowserRouter>
  </QueryClientProvider>
);
}
