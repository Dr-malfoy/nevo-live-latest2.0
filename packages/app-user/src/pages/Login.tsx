import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PiPhoneFill as Phone, PiLockFill as Lock, PiEnvelopeSimpleFill as Mail, PiCaretLeftBold as ArrowLeft, PiLightningFill as Zap, PiUserFill as User, PiCheckCircleFill as CheckCircle, PiFacebookLogoFill as Facebook, PiGoogleLogoFill as Google } from 'react-icons/pi';
import { Button, Input } from '../components/ui';
import { useAuthStore } from '../stores';
import { authApi } from '../api';
import { setupRecaptcha, sendPhoneOtp, verifyPhoneOtp, signInWithGoogle } from '../lib/firebase';

type LoginMode = 'social' | 'phone' | 'password' | 'dev';

export const Login = () => {
  const navigate = useNavigate();
  const { login, loginWithOTP, loginWithGoogle, isLoading, error, clearError } = useAuthStore();
  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<any>(null);
  const verificationIdRef = useRef<string>('');
  const [mode, setMode] = useState<LoginMode>('social');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [otpCode, setOtpCode] = useState('');

  const handlePasswordLogin = async () => {
    try {
      await login(phone, password);
      navigate('/', { replace: true });
    } catch {}
  };

  const handleSendOtp = async () => {
    try {
      verifierRef.current = setupRecaptcha('recaptcha-container');
      await verifierRef.current.verify();
      const verificationId = await sendPhoneOtp(phone, verifierRef.current);
      verificationIdRef.current = verificationId;
      setStep('otp');
    } catch (err: any) {
      console.error('OTP send failed:', err);
    }
  };

  const handleVerifyOtp = async () => {
    try {
      const idToken = await verifyPhoneOtp(verificationIdRef.current, otpCode);
      await loginWithOTP(phone, otpCode, idToken);
      navigate('/', { replace: true });
    } catch {}
  };

  const handleDevLogin = async () => {
    if (!phone) return;
    try {
      const { data } = await authApi.devLogin(phone, 'DevUser');
      if (data.success && data.data) {
        useAuthStore.setState({ user: data.data.user, token: data.data.token, isAuthenticated: true });
        navigate('/', { replace: true });
      }
    } catch {}
  };

  const handleGoogleLogin = async () => {
    try {
      const idToken = await signInWithGoogle();
      await loginWithGoogle(idToken);
      navigate('/', { replace: true });
    } catch {}
  };

  return (
    <div 
      className="min-h-screen flex flex-col relative"
      style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div id="recaptcha-container" ref={recaptchaRef} />
      
      {/* Top right help */}
      <div className="absolute top-12 right-6 text-white font-medium text-[15px] drop-shadow-md">
        Need help?
      </div>

      {mode === 'social' ? (
        <div className="mt-auto w-full px-8 pb-10 flex flex-col items-center">
          
          <div className="w-full flex justify-end pr-4 mb-2">
             <div className="bg-[#4C3BFF] text-white text-[11px] font-bold px-2.5 py-1 rounded-full relative shadow-md">
                Latest Login
                <div className="absolute -bottom-1 right-4 w-2 h-2 bg-[#4C3BFF] rotate-45"></div>
             </div>
          </div>

          <button 
            onClick={handleGoogleLogin} 
            className="w-full bg-white text-black h-14 rounded-full flex items-center justify-center font-bold text-[16px] mb-4 gap-3 shadow-lg active:scale-95 transition-transform"
          >
            <Google className="w-[22px] h-[22px] text-[#DB4437]" /> Log in with Google
          </button>
          
          <button 
            className="w-full bg-white text-black h-14 rounded-full flex items-center justify-center font-bold text-[16px] mb-10 gap-3 shadow-lg active:scale-95 transition-transform"
          >
            <Facebook className="w-[22px] h-[22px] text-[#1877F2]" /> Log in with Facebook
          </button>

          <div className="flex items-center justify-center gap-4 mb-6 opacity-80 w-full">
            <div className="h-px flex-1 bg-white/50"></div>
            <span className="text-white text-xs font-medium tracking-wide">More Login Methods</span>
            <div className="h-px flex-1 bg-white/50"></div>
          </div>

          <div className="flex items-center justify-center gap-6 mb-6">
            <button onClick={() => setMode('phone')} title="Phone OTP" className="w-14 h-14 rounded-full border border-white/40 text-white flex items-center justify-center bg-black/20 backdrop-blur-sm active:scale-95 transition-transform">
               <Phone className="w-6 h-6" />
            </button>
            <button onClick={() => setMode('dev')} title="Dev Login" className="w-14 h-14 rounded-full border border-white/40 text-white flex items-center justify-center bg-black/20 backdrop-blur-sm active:scale-95 transition-transform">
               <User className="w-6 h-6" />
            </button>
            <button onClick={() => setMode('password')} title="Password Login" className="w-14 h-14 rounded-full border border-white/40 text-white flex items-center justify-center bg-black/20 backdrop-blur-sm active:scale-95 transition-transform">
               <Mail className="w-6 h-6" />
            </button>
          </div>

          {/* New User Sign Up & Forgot Password Prompt */}
          <div className="w-full flex flex-col items-center justify-center gap-2 mb-8">
            <Link
              to="/register"
              className="px-5 py-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md border border-white/30"
            >
              <span>Don't have an account?</span>
              <span className="text-[#FFDD00] underline underline-offset-2">Sign Up</span>
            </Link>
            <Link
              to="/forgot-password"
              className="text-white/80 hover:text-white text-xs font-medium underline underline-offset-2 transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <div className="flex items-start gap-2.5 px-2">
             <div className="mt-0.5 relative flex items-center justify-center">
                <div className="w-4 h-4 rounded-full bg-white" />
                <CheckCircle className="w-[18px] h-[18px] text-[#4C3BFF] absolute" />
             </div>
             <p className="text-white/95 text-[11px] font-medium leading-[1.4] flex-1">
                I have read and agree to the <Link to="/terms" className="underline underline-offset-2">Navo Live Terms Of Service</Link> And <Link to="/privacy" className="underline underline-offset-2">Privacy Policy</Link>
             </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col p-6 bg-white/95 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setMode('social')} className="p-2 -ml-2 text-ink" aria-label="Back">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <Link to="/register" className="text-sm font-bold text-[#4C3BFF] hover:underline">
              Sign Up
            </Link>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full pb-20">
            <h1 className="text-2xl font-bold mb-1 text-ink">Welcome Back</h1>
            <p className="text-ink-muted mb-8">Sign in with your alternative method</p>

            {error && (
              <div className="bg-red-600/20 border border-red-600/50 text-red-400 text-sm p-3 rounded-lg mb-4">{error}</div>
            )}

            <div className="flex gap-2 mb-6 bg-surface-sunken rounded-lg p-1">
              <button onClick={() => { setMode('password'); clearError(); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'password' ? 'bg-black text-white' : 'text-ink-muted'}`}>Password</button>
              <button onClick={() => { setMode('phone'); clearError(); setStep('input'); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'phone' ? 'bg-black text-white' : 'text-ink-muted'}`}>OTP</button>
              <button onClick={() => { setMode('dev'); clearError(); }} className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'dev' ? 'bg-black text-white' : 'text-ink-muted'}`}>Dev</button>
            </div>

            {mode === 'password' && (
              <div className="space-y-4">
                <Input icon={<Phone className="w-4 h-4" />} placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
                <Input icon={<Lock className="w-4 h-4" />} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" />
                <div className="flex justify-end -mt-1">
                  <Link to="/forgot-password" className="text-xs text-brand-primary hover:underline">
                    Forgot Password?
                  </Link>
                </div>
                <Button fullWidth onClick={handlePasswordLogin} loading={isLoading}>Sign In</Button>
              </div>
            )}

            {mode === 'phone' && step === 'input' && (
              <div className="space-y-4">
                <Input icon={<Phone className="w-4 h-4" />} placeholder="Phone number" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
                <Button fullWidth onClick={handleSendOtp} loading={isLoading}>Send OTP</Button>
              </div>
            )}

            {mode === 'phone' && step === 'otp' && (
              <div className="space-y-4">
                <Input placeholder="Enter OTP code" value={otpCode} onChange={(e) => setOtpCode(e.target.value)} maxLength={6} />
                <Button fullWidth onClick={handleVerifyOtp} loading={isLoading}>Verify & Login</Button>
              </div>
            )}

            {mode === 'dev' && (
              <div className="space-y-4">
                <Input icon={<Phone className="w-4 h-4" />} placeholder="Phone (auto-creates if new)" value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" />
                <Button fullWidth onClick={handleDevLogin} loading={isLoading}><Zap className="w-4 h-4" /> Dev Login</Button>
                <p className="text-xs text-ink-faint text-center">Immediate login — creates user if not found</p>
              </div>
            )}

            {/* Bottom link to Register */}
            <p className="text-center text-xs text-ink-muted mt-6">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#4C3BFF] font-bold hover:underline">
                Create Account
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
