import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PiPhoneFill as Phone,
  PiLockFill as Lock,
  PiEnvelopeSimpleFill as Mail,
  PiCaretLeftBold as ArrowLeft,
  PiLightningFill as Zap,
  PiUserFill as User,
  PiCheckCircleFill as CheckCircle,
  PiFacebookLogoFill as Facebook,
  PiGoogleLogoFill as Google,
  PiShieldCheckFill as ShieldCheck,
  PiArrowClockwiseFill as RefreshIcon,
  PiPencilSimpleFill as EditIcon,
} from 'react-icons/pi';
import { Button, Input, PhoneInputWithCountry, formatFullPhoneNumber } from '../components/ui';
import { useAuthStore, useUIStore } from '../stores';
import { authApi } from '../api';
import {
  setupRecaptcha,
  clearRecaptcha,
  sendPhoneOtp,
  verifyPhoneOtp,
  signInWithGoogle,
  signInWithFacebook,
  mapFirebaseAuthError,
} from '../lib/firebase';
import { ConfirmationResult } from 'firebase/auth';

type LoginMode = 'social' | 'phone' | 'password' | 'dev';

export const Login = () => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);
  const { login, loginWithOTP, loginWithGoogle, loginWithFacebook, isLoading: storeLoading, error: storeError, clearError } = useAuthStore();

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<any>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [mode, setMode] = useState<LoginMode>('social');
  const [countryCode, setCountryCode] = useState('BD');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [passwordLoginMethod, setPasswordLoginMethod] = useState<'phone' | 'email'>('phone');
  const [password, setPassword] = useState('');
  
  // OTP Verification state
  const [step, setStep] = useState<'input' | 'otp'>('input');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [cooldown, setCooldown] = useState(0);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  const getFullPhone = () => formatFullPhoneNumber(countryCode, phone.trim());

  // ── Password Login Handler ──────────────────────────────────────────
  const handlePasswordLogin = async () => {
    setLocalError(null);
    clearError();
    const identifier = passwordLoginMethod === 'phone' ? getFullPhone() : email.trim();
    if (passwordLoginMethod === 'phone') {
      if (!phone.trim()) {
        setLocalError('Please enter your mobile phone number');
        return;
      }
    } else {
      if (!email.trim()) {
        setLocalError('Please enter your Gmail or Email address');
        return;
      }
    }
    if (!password) {
      setLocalError('Please enter your password');
      return;
    }

    setIsActionLoading(true);
    try {
      await login(identifier, password);
      showToast('Welcome back!', 'success');
      navigate('/', { replace: true });
    } catch (err: any) {
      setLocalError(err?.response?.data?.error || err?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── Firebase Phone OTP Handlers ─────────────────────────────────────
  const handleSendOtp = async () => {
    setLocalError(null);
    clearError();

    const cleanNumber = phone.trim().replace(/\D/g, '');
    if (!cleanNumber || cleanNumber.length < 5) {
      setLocalError('Please enter a valid mobile phone number');
      return;
    }

    setIsActionLoading(true);
    try {
      const fullPhone = getFullPhone();
      
      // Setup Firebase invisible reCAPTCHA
      const verifier = setupRecaptcha('recaptcha-container');
      verifierRef.current = verifier;

      const confirmation = await sendPhoneOtp(fullPhone, verifier);
      confirmationResultRef.current = confirmation;

      setStep('otp');
      setOtpDigits(['', '', '', '', '', '']);
      setCooldown(60);
      showToast(`Verification code sent to ${fullPhone}`, 'info');

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      console.error('Firebase Phone Auth OTP send error:', err);
      const friendlyMsg = mapFirebaseAuthError(err);
      setLocalError(friendlyMsg);
      clearRecaptcha();
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isActionLoading) return;
    await handleSendOtp();
  };

  const handleOtpDigitChange = (index: number, value: string) => {
    // Handle paste of full 6-digit code
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      if (digits.length > 0) {
        const newOtp = [...otpDigits];
        digits.forEach((d, i) => {
          if (index + i < 6) newOtp[index + i] = d;
        });
        setOtpDigits(newOtp);
        const nextIdx = Math.min(index + digits.length, 5);
        otpInputRefs.current[nextIdx]?.focus();

        if (newOtp.every((d) => d !== '')) {
          handleVerifyOtp(newOtp.join(''));
        }
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otpDigits];
    newOtp[index] = digit;
    setOtpDigits(newOtp);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto verify when all 6 digits entered
    if (digit && newOtp.every((d) => d !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      setLocalError('Please enter the complete 6-digit verification code');
      return;
    }

    setLocalError(null);
    clearError();
    setIsActionLoading(true);

    try {
      const fullPhone = getFullPhone();
      
      // Verify code with Firebase confirmation
      let idToken: string | undefined;
      if (confirmationResultRef.current) {
        const verifyRes = await verifyPhoneOtp(confirmationResultRef.current, code);
        idToken = verifyRes.idToken;
      }

      // Complete login on backend
      await loginWithOTP(fullPhone, code, idToken);
      showToast('Signed in successfully!', 'success');
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('OTP verification failed:', err);
      const friendlyMsg = mapFirebaseAuthError(err);
      setLocalError(friendlyMsg || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── Social Login Handlers ───────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setLocalError(null);
    clearError();
    setIsActionLoading(true);
    try {
      const idToken = await signInWithGoogle();
      await loginWithGoogle(idToken);
      showToast('Signed in with Google!', 'success');
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Google login error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setLocalError(mapFirebaseAuthError(err));
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setLocalError(null);
    clearError();
    setIsActionLoading(true);
    try {
      const { idToken, accessToken } = await signInWithFacebook();
      await loginWithFacebook(idToken, accessToken);
      showToast('Signed in with Facebook!', 'success');
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Facebook login error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setLocalError(mapFirebaseAuthError(err));
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  // ── Dev Login Handler ───────────────────────────────────────────────
  const handleDevLogin = async () => {
    if (!phone.trim()) {
      setLocalError('Please enter a phone number for dev login');
      return;
    }
    setIsActionLoading(true);
    try {
      const fullPhone = getFullPhone();
      const { data } = await authApi.devLogin(fullPhone, 'DevUser');
      if (data.success && data.data) {
        useAuthStore.setState({ user: data.data.user, token: data.data.token, isAuthenticated: true });
        showToast('Logged in as Dev User', 'success');
        navigate('/', { replace: true });
      }
    } catch (err: any) {
      setLocalError(err?.response?.data?.error || 'Dev login failed');
    } finally {
      setIsActionLoading(false);
    }
  };

  const displayError = localError || storeError;
  const isLoading = storeLoading || isActionLoading;

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Invisible Firebase Recaptcha Container */}
      <div id="recaptcha-container" ref={recaptchaRef} />

      {/* Top right help */}
      <div className="absolute top-10 right-6 text-white font-medium text-sm drop-shadow-md z-10">
        <Link to="/help" className="hover:underline">Need help?</Link>
      </div>


      {mode === 'social' ? (
        <div className="mt-auto w-full px-6 sm:px-8 pb-10 flex flex-col items-center max-w-md mx-auto">
          {displayError && (
            <div className="w-full bg-red-600/90 text-white text-xs font-semibold p-3 rounded-2xl mb-4 text-center shadow-lg backdrop-blur-md animate-fade-in">
              {displayError}
            </div>
          )}

          <div className="w-full flex justify-end pr-4 mb-2">
            <div className="bg-[#4C3BFF] text-white text-[11px] font-bold px-2.5 py-1 rounded-full relative shadow-md">
              Latest Login
              <div className="absolute -bottom-1 right-4 w-2 h-2 bg-[#4C3BFF] rotate-45"></div>
            </div>
          </div>

          {/* Google Login Button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full bg-white text-black h-14 rounded-full flex items-center justify-center font-bold text-[16px] mb-3.5 gap-3 shadow-lg active:scale-95 transition-all disabled:opacity-60"
          >
            <Google className="w-[22px] h-[22px] text-[#DB4437]" /> Sign in with Google
          </button>

          {/* Facebook Login Button */}
          <button
            type="button"
            onClick={handleFacebookLogin}
            disabled={isLoading}
            className="w-full bg-white text-black h-14 rounded-full flex items-center justify-center font-bold text-[16px] mb-8 gap-3 shadow-lg active:scale-95 transition-all disabled:opacity-60"
          >
            <Facebook className="w-[22px] h-[22px] text-[#1877F2]" /> Sign in with Facebook
          </button>

          <div className="flex items-center justify-center gap-4 mb-5 opacity-80 w-full">
            <div className="h-px flex-1 bg-white/50"></div>
            <span className="text-white text-xs font-medium tracking-wide">Manual & Alternative Login</span>
            <div className="h-px flex-1 bg-white/50"></div>
          </div>

          {/* Manual Method Icons */}
          <div className="flex items-center justify-center gap-5 mb-6">
            <button
              type="button"
              onClick={() => {
                setMode('phone');
                setStep('input');
                clearError();
                setLocalError(null);
              }}
              title="Manual Phone OTP"
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-white/40 text-white flex flex-col items-center justify-center bg-black/30 backdrop-blur-md active:scale-95 transition-all hover:bg-black/40"
            >
              <Phone className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('password');
                clearError();
                setLocalError(null);
              }}
              title="Password Login"
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-white/40 text-white flex flex-col items-center justify-center bg-black/30 backdrop-blur-md active:scale-95 transition-all hover:bg-black/40"
            >
              <Mail className="w-6 h-6" />
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('dev');
                clearError();
                setLocalError(null);
              }}
              title="Dev Quick Login"
              className="w-13 h-13 sm:w-14 sm:h-14 rounded-full border border-white/40 text-white flex flex-col items-center justify-center bg-black/30 backdrop-blur-md active:scale-95 transition-all hover:bg-black/40"
            >
              <User className="w-6 h-6" />
            </button>
          </div>

          {/* Sign Up Prompt */}
          <div className="w-full flex flex-col items-center justify-center gap-2 mb-6">
            <Link
              to="/register"
              className="px-6 py-2.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all shadow-md border border-white/30"
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

          {/* Terms Agreement */}
          <div className="flex items-start gap-2.5 px-2">
            <div className="mt-0.5 relative flex items-center justify-center shrink-0">
              <div className="w-4 h-4 rounded-full bg-white" />
              <CheckCircle className="w-[18px] h-[18px] text-[#4C3BFF] absolute" />
            </div>
            <p className="text-white/95 text-[11px] font-medium leading-[1.4] flex-1">
              I have read and agree to the <Link to="/terms" className="underline underline-offset-2">Terms of Service</Link> and <Link to="/privacy" className="underline underline-offset-2">Privacy Policy</Link>
            </p>
          </div>
        </div>
      ) : (
        /* Manual Login Mode Container */
        <div className="flex-1 flex flex-col p-6 bg-white/95 backdrop-blur-md animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between mb-6 max-w-sm mx-auto w-full">
            <button
              type="button"
              onClick={() => {
                if (step === 'otp') {
                  setStep('input');
                } else {
                  setMode('social');
                }
                clearError();
                setLocalError(null);
              }}
              className="p-2 -ml-2 text-ink hover:text-ink-muted transition-colors rounded-full"
              aria-label="Back"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <Link to="/register" className="text-sm font-bold text-[#4C3BFF] hover:underline">
              Create Account
            </Link>
          </div>

          <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full pb-16">
            <h1 className="text-2xl font-black mb-1 text-ink">
              {step === 'otp' ? 'Enter Verification Code' : 'Manual Sign In'}
            </h1>
            <p className="text-xs text-ink-muted mb-6">
              {step === 'otp'
                ? `6-digit Firebase OTP sent to ${getFullPhone()}`
                : 'Select your country code and enter phone number'}
            </p>

            {displayError && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold p-3 rounded-xl mb-4 animate-fade-in">
                {displayError}
              </div>
            )}

            {step === 'input' && (
              <>
                {/* Method selector tabs */}
                <div className="flex gap-1.5 mb-5 bg-surface-sunken rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('phone');
                      clearError();
                      setLocalError(null);
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      mode === 'phone' ? 'bg-black text-white shadow-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Phone OTP
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('password');
                      clearError();
                      setLocalError(null);
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      mode === 'password' ? 'bg-black text-white shadow-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Password
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('dev');
                      clearError();
                      setLocalError(null);
                    }}
                    className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                      mode === 'dev' ? 'bg-black text-white shadow-sm' : 'text-ink-muted hover:text-ink'
                    }`}
                  >
                    Dev Mode
                  </button>
                </div>

                {/* Mode: Phone OTP */}
                {mode === 'phone' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendOtp();
                    }}
                    className="space-y-4"
                  >
                    <div>
                      <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                        Mobile Phone Number
                      </label>
                      <PhoneInputWithCountry
                        countryCode={countryCode}
                        onCountryCodeChange={setCountryCode}
                        phone={phone}
                        onPhoneChange={(val) => {
                          setPhone(val);
                          if (localError) setLocalError(null);
                        }}
                        placeholder="e.g. 1712345678"
                        autoFocus
                      />
                    </div>

                    <Button fullWidth onClick={handleSendOtp} loading={isLoading}>
                      Send Firebase OTP
                    </Button>
                  </form>
                )}

                {/* Mode: Password Login */}
                {mode === 'password' && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handlePasswordLogin();
                    }}
                    className="space-y-4"
                  >
                    {/* Switcher: Phone vs Gmail */}
                    <div className="flex gap-2 p-1 bg-surface-sunken rounded-xl">
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordLoginMethod('phone');
                          if (localError) setLocalError(null);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          passwordLoginMethod === 'phone'
                            ? 'bg-white text-ink shadow-xs'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        Phone Number
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setPasswordLoginMethod('email');
                          if (localError) setLocalError(null);
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          passwordLoginMethod === 'email'
                            ? 'bg-white text-ink shadow-xs'
                            : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        Gmail / Email
                      </button>
                    </div>

                    {passwordLoginMethod === 'phone' ? (
                      <div>
                        <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                          Mobile Phone Number
                        </label>
                        <PhoneInputWithCountry
                          countryCode={countryCode}
                          onCountryCodeChange={setCountryCode}
                          phone={phone}
                          onPhoneChange={(val) => {
                            setPhone(val);
                            if (localError) setLocalError(null);
                          }}
                          placeholder="e.g. 1712345678"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                          Gmail / Email Address
                        </label>
                        <Input
                          icon={<Mail className="w-4 h-4 text-ink-muted" />}
                          placeholder="e.g. user@gmail.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (localError) setLocalError(null);
                          }}
                          type="email"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                        Password
                      </label>
                      <Input
                        icon={<Lock className="w-4 h-4 text-ink-muted" />}
                        placeholder="Enter password"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          if (localError) setLocalError(null);
                        }}
                        type="password"
                      />
                    </div>

                    <div className="flex justify-end -mt-1">
                      <Link to="/forgot-password" className="text-xs font-semibold text-[#4C3BFF] hover:underline">
                        Forgot Password?
                      </Link>
                    </div>

                    <Button fullWidth onClick={handlePasswordLogin} loading={isLoading}>
                      Sign In
                    </Button>
                  </form>
                )}

                {/* Mode: Dev Login */}
                {mode === 'dev' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-ink-muted uppercase tracking-wider mb-1.5">
                        Mobile Phone Number
                      </label>
                      <PhoneInputWithCountry
                        countryCode={countryCode}
                        onCountryCodeChange={setCountryCode}
                        phone={phone}
                        onPhoneChange={(val) => {
                          setPhone(val);
                          if (localError) setLocalError(null);
                        }}
                        placeholder="e.g. 1712345678"
                      />
                    </div>
                    <Button fullWidth onClick={handleDevLogin} loading={isLoading}>
                      <Zap className="w-4 h-4" /> Quick Dev Sign In
                    </Button>
                    <p className="text-[11px] text-ink-muted text-center leading-relaxed">
                      Instant bypass login for development & testing. Creates the user account if not existing.
                    </p>
                  </div>
                )}
              </>
            )}

            {/* OTP Entry Step */}
            {step === 'otp' && (
              <div className="space-y-5">
                {/* Phone Preview / Change Phone */}
                <div className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken border border-line">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-ink-muted" />
                    <span className="text-xs font-bold text-ink">{getFullPhone()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep('input');
                      setLocalError(null);
                    }}
                    className="text-xs font-semibold text-[#4C3BFF] hover:underline flex items-center gap-1"
                  >
                    <EditIcon className="w-3.5 h-3.5" /> Edit
                  </button>
                </div>

                {/* 6-Digit OTP Inputs */}
                <div className="flex justify-between gap-2 max-w-xs mx-auto">
                  {otpDigits.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => {
                        otpInputRefs.current[index] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={index === 0 ? 6 : 1}
                      value={digit}
                      onChange={(e) => handleOtpDigitChange(index, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(index, e)}
                      className={`w-11 h-13 text-center text-xl font-bold rounded-xl border transition-all ${
                        digit
                          ? 'border-[#4C3BFF] bg-white text-ink shadow-sm'
                          : 'border-line-strong bg-surface-sunken text-ink focus:border-[#4C3BFF] focus:bg-white'
                      } focus:outline-none focus:ring-2 focus:ring-[#4C3BFF]/20`}
                    />
                  ))}
                </div>

                <Button fullWidth onClick={() => handleVerifyOtp()} loading={isLoading}>
                  <ShieldCheck className="w-5 h-5" /> Verify & Log In
                </Button>

                {/* Resend OTP button */}
                <div className="text-center pt-2">
                  <button
                    type="button"
                    disabled={cooldown > 0 || isLoading}
                    onClick={handleResendOtp}
                    className="text-xs font-bold text-ink-muted hover:text-ink disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                  >
                    <RefreshIcon className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
                    {cooldown > 0 ? (
                      <span>Resend code in <strong className="text-ink">{cooldown}s</strong></span>
                    ) : (
                      <span className="text-[#4C3BFF] underline underline-offset-2">Resend Verification Code</span>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Bottom link to Register */}
            <p className="text-center text-xs text-ink-muted mt-8">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#4C3BFF] font-bold hover:underline">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
