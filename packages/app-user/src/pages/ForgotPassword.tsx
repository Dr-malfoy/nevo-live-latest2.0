import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiMagnifyingGlassBold as SearchIcon,
  PiPhoneFill as Phone,
  PiLockFill as Lock,
  PiShieldCheckFill as ShieldCheck,
  PiCheckCircleFill as CheckCircle,
  PiIdentificationCardFill as IdCardIcon,
  PiEyeFill as EyeOpen,
  PiEyeSlashFill as EyeClosed,
  PiArrowClockwiseFill as RefreshIcon,
} from 'react-icons/pi';
import { Button, Input } from '../components/ui';
import { authApi, type SearchAccountResponseData } from '../api';
import { useUIStore } from '../stores';
import {
  setupRecaptcha,
  clearRecaptcha,
  sendPhoneOtp,
  verifyPhoneOtp,
  mapFirebaseAuthError,
} from '../lib/firebase';
import { ConfirmationResult } from 'firebase/auth';

type Step = 'search' | 'otp' | 'password' | 'done';

export const ForgotPassword = () => {
  const navigate = useNavigate();
  const showToast = useUIStore((s) => s.showToast);

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<any>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step state
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundAccount, setFoundAccount] = useState<SearchAccountResponseData | null>(null);

  // OTP state
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [firebaseIdToken, setFirebaseIdToken] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);

  // New Password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((c) => (c > 0 ? c - 1 : 0));
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

  // STEP 1: Search for Account
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setError('Please enter your phone number, UID, username, or email.');
      return;
    }
    setError(null);
    setIsSearching(true);
    setFoundAccount(null);

    try {
      const res = await authApi.searchAccount(query);
      if (res.data.success && res.data.data) {
        setFoundAccount(res.data.data);
      } else {
        setError(res.data.error || 'No account found matching this query.');
      }
    } catch (err: any) {
      setError(
        err.response?.data?.error ||
        'No account found matching this phone number, UID, or username. Please check and try again.'
      );
    } finally {
      setIsSearching(false);
    }
  };

  // STEP 2: Send Firebase OTP to the found account's phone
  const handleSendOtp = async () => {
    if (!foundAccount) return;
    setError(null);
    setIsSendingOtp(true);

    const targetPhone = foundAccount.rawPhone;

    try {
      let devOtpFound: string | null = null;

      // 1. Dispatch backend SMS / dev OTP
      try {
        const sendRes = await authApi.sendOtp(targetPhone, 'sms', 'reset_password');
        if (sendRes.data?.data?.devOtp) {
          devOtpFound = sendRes.data.data.devOtp;
        }
      } catch (backendErr) {
        console.warn('Backend sendOtp notice:', backendErr);
      }

      // 2. Try Firebase Phone Auth (if enabled in Firebase Console)
      try {
        const verifier = setupRecaptcha('recaptcha-container');
        verifierRef.current = verifier;
        const confirmation = await sendPhoneOtp(targetPhone, verifier);
        confirmationResultRef.current = confirmation;
      } catch (fbErr: any) {
        console.warn('Firebase sendPhoneOtp skipped/failed, using system SMS OTP fallback:', fbErr);
        clearRecaptcha();
        confirmationResultRef.current = null;
      }

      setStep('otp');
      setOtpDigits(['', '', '', '', '', '']);
      setDevOtp(devOtpFound);
      setCooldown(60);

      if (devOtpFound) {
        showToast(`Verification code sent! (Dev OTP: ${devOtpFound})`, 'info');
      } else {
        showToast(`Verification code sent to ${foundAccount.phone}`, 'info');
      }

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      console.error('Failed to send OTP:', err);
      const friendlyMsg = mapFirebaseAuthError(err);
      setError(friendlyMsg || 'Failed to send verification code. Please check your network and try again.');
      clearRecaptcha();
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isSendingOtp) return;
    await handleSendOtp();
  };

  // OTP Input handler
  const handleOtpChange = (index: number, val: string) => {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, '').slice(0, 6).split('');
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

    const digit = val.replace(/\D/g, '');
    const newOtp = [...otpDigits];
    newOtp[index] = digit;
    setOtpDigits(newOtp);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (digit && newOtp.every((d) => d !== '')) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // STEP 3: Verify OTP Code
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit verification code.');
      return;
    }
    if (!foundAccount) return;

    setError(null);
    setIsVerifyingOtp(true);

    try {
      let idToken: string | undefined;
      let verified = false;

      // 1. Verify via Firebase confirmation if active
      if (confirmationResultRef.current) {
        try {
          const verifyRes = await verifyPhoneOtp(confirmationResultRef.current, code);
          idToken = verifyRes.idToken;
          setFirebaseIdToken(idToken);
          verified = true;
        } catch (fbErr: any) {
          console.warn('Firebase confirmation failed, checking backend OTP verification:', fbErr);
        }
      }

      // 2. Verify via backend system OTP
      try {
        const verifyRes = await authApi.verifyOtpOnly(foundAccount.rawPhone, code, 'reset_password');
        if (verifyRes.data?.data?.verificationToken) {
          setVerificationToken(verifyRes.data.data.verificationToken);
          verified = true;
        }
      } catch (backendOtpErr: any) {
        if (!verified) {
          setError(backendOtpErr.response?.data?.error || 'Invalid verification code. Please check and try again.');
          setIsVerifyingOtp(false);
          return;
        }
      }

      if (!verified) {
        setError('Invalid verification code. Please check and try again.');
        setIsVerifyingOtp(false);
        return;
      }

      showToast('OTP verified successfully! Now set your new password.', 'success');
      setStep('password');
    } catch (err: any) {
      console.error('OTP verification failed:', err);
      const friendlyMsg = mapFirebaseAuthError(err);
      setError(friendlyMsg || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // STEP 4: Set New Password
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!foundAccount) return;

    if (!newPassword || newPassword.length < 6) {
      setError('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-type password correctly.');
      return;
    }

    setError(null);
    setIsResetting(true);

    try {
      const code = otpDigits.join('');
      const res = await authApi.resetPassword({
        phone: foundAccount.rawPhone,
        newPassword,
        verificationToken: verificationToken || undefined,
        idToken: firebaseIdToken || undefined,
        code: code || undefined,
      });

      if (res.data.success) {
        showToast('Password updated successfully!', 'success');
        setStep('done');
      } else {
        setError(res.data.error || 'Failed to update password.');
      }
    } catch (err: any) {
      console.error('Password reset error:', err);
      setError(
        err.response?.data?.error ||
        err.response?.data?.message ||
        'Password reset failed. Please try again.'
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Invisible Firebase Recaptcha Container */}
      <div id="recaptcha-container" ref={recaptchaRef} />

      <div className="flex-1 flex flex-col p-4 sm:p-6 bg-black/45 backdrop-blur-md overflow-y-auto">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pt-2 mb-4 max-w-sm mx-auto w-full">
          <button
            onClick={() => {
              if (step === 'otp') setStep('search');
              else if (step === 'password') setStep('otp');
              else if (step === 'done') navigate('/login');
              else navigate('/login');
            }}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-transform hover:bg-white/30"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-white/90 font-bold text-xs bg-black/40 px-3.5 py-1 rounded-full backdrop-blur-sm">
            {step === 'search' && 'Step 1: Find Account'}
            {step === 'otp' && 'Step 2: Verify OTP'}
            {step === 'password' && 'Step 3: New Password'}
            {step === 'done' && 'Completed'}
          </span>
        </div>

        {/* Card Container */}
        <div className="my-auto max-w-sm mx-auto w-full bg-white/95 rounded-3xl p-6 shadow-2xl backdrop-blur-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold p-3 rounded-xl mb-4 animate-fade-in text-center">
              {error}
            </div>
          )}

          {/* STEP 1: Search Account */}
          {step === 'search' && (
            <div>
              <div className="flex items-center justify-center w-12 h-12 bg-[#4C3BFF]/10 text-[#4C3BFF] rounded-2xl mb-4 mx-auto">
                <SearchIcon className="w-6 h-6" />
              </div>

              <h1 className="text-2xl font-black text-center text-ink tracking-tight mb-1">Find Your Account</h1>
              <p className="text-ink-muted text-xs text-center mb-6">
                Enter your phone number, UID, or username to find your account and reset password.
              </p>

              <form onSubmit={handleSearch} className="space-y-4">
                <Input
                  icon={<SearchIcon className="w-4 h-4 text-ink-muted" />}
                  placeholder="Phone, UID, or Username"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    if (error) setError(null);
                  }}
                  autoFocus
                />

                <Button
                  type="submit"
                  fullWidth
                  loading={isSearching}
                  disabled={!searchQuery.trim()}
                  className="h-12 text-sm font-bold bg-[#4C3BFF] hover:bg-[#3d2fe0]"
                >
                  Search Account
                </Button>
              </form>

              {/* Found Account Preview Card */}
              {foundAccount && (
                <div className="mt-5 p-4 bg-[#4C3BFF]/5 border-2 border-[#4C3BFF] rounded-2xl animate-in zoom-in-95 duration-200">
                  <div className="text-[11px] font-bold text-[#4C3BFF] uppercase tracking-wider mb-2">
                    Account Found
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <img
                      src={foundAccount.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                      alt={foundAccount.nickname}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm"
                    />
                    <div className="overflow-hidden flex-1">
                      <div className="font-black text-ink text-base truncate">{foundAccount.nickname}</div>
                      <div className="text-xs text-ink-muted flex items-center gap-1 font-mono">
                        <IdCardIcon className="w-3.5 h-3.5 text-brand" /> UID: {foundAccount.uid}
                      </div>
                      <div className="text-xs text-ink-muted flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-ink-faint" /> {foundAccount.phone}
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleSendOtp}
                    loading={isSendingOtp}
                    fullWidth
                    className="h-11 text-xs font-bold bg-[#4C3BFF] hover:bg-[#3d2fe0]"
                  >
                    Send OTP to My Phone &rarr;
                  </Button>
                </div>
              )}

              <div className="mt-6 text-center">
                <Link to="/login" className="text-xs text-ink-muted hover:text-ink font-medium">
                  Remember your password? <strong className="text-[#4C3BFF] underline">Login</strong>
                </Link>
              </div>
            </div>
          )}

          {/* STEP 2: Enter Verification Code */}
          {step === 'otp' && foundAccount && (
            <div>
              <div className="flex items-center justify-center w-12 h-12 bg-[#4C3BFF]/10 text-[#4C3BFF] rounded-2xl mb-4 mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <h1 className="text-2xl font-black text-center text-ink tracking-tight mb-1">Enter Verification Code</h1>
              <p className="text-ink-muted text-xs text-center mb-1">
                We sent a 6-digit verification code to
              </p>
              <div className="text-center font-bold text-ink text-sm mb-4">{foundAccount.phone}</div>

              {/* Dev Mode OTP Indicator & Auto-fill */}
              {devOtp && (
                <div className="mb-4 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1.5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-center gap-1 text-[11px] font-bold text-amber-800 uppercase tracking-wider">
                    <span>⚡ Development OTP Code</span>
                  </div>
                  <div className="text-2xl font-black font-mono tracking-widest text-[#4C3BFF]">
                    {devOtp}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = devOtp.split('').slice(0, 6);
                      setOtpDigits(digits);
                      handleVerifyOtp(devOtp);
                    }}
                    className="text-xs font-bold text-[#4C3BFF] hover:underline"
                  >
                    Tap to auto-fill & verify
                  </button>
                </div>
              )}

              {/* 6 Digit Input Boxes */}
              <div className="flex justify-between gap-2 mb-6">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={idx === 0 ? 6 : 1}
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-lg font-black bg-surface border border-line rounded-xl focus:outline-none focus:border-[#4C3BFF] focus:ring-2 focus:ring-[#4C3BFF]/20 text-ink transition-all shadow-sm"
                  />
                ))}
              </div>

              <Button
                fullWidth
                onClick={() => handleVerifyOtp()}
                loading={isVerifyingOtp}
                disabled={otpDigits.some((d) => !d)}
                className="h-12 text-sm font-bold mb-4 bg-[#4C3BFF] hover:bg-[#3d2fe0]"
              >
                Verify Code
              </Button>

              {/* Resend Code */}
              <div className="text-center">
                <div className="text-xs text-ink-muted">
                  {cooldown > 0 ? (
                    <span>Resend code in <strong className="text-ink font-bold">{cooldown}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isSendingOtp}
                      className="text-[#4C3BFF] font-bold hover:underline inline-flex items-center gap-1.5"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" /> Resend Verification Code
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Create New Password & Re-type */}
          {step === 'password' && (
            <div>
              <div className="flex items-center justify-center w-12 h-12 bg-[#4C3BFF]/10 text-[#4C3BFF] rounded-2xl mb-4 mx-auto">
                <Lock className="w-6 h-6" />
              </div>

              <h1 className="text-2xl font-black text-center text-ink tracking-tight mb-1">Create New Password</h1>
              <p className="text-ink-muted text-xs text-center mb-6">
                Enter your new password and re-type it to confirm.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                {/* New Password */}
                <div>
                  <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1 ml-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Input
                      icon={<Lock className="w-4 h-4 text-ink-muted" />}
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1"
                      aria-label="Toggle new password visibility"
                    >
                      {showPassword ? <EyeClosed className="w-4 h-4" /> : <EyeOpen className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Re-type Password (Confirm) */}
                <div>
                  <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1 ml-1">
                    Re-type Password
                  </label>
                  <div className="relative">
                    <Input
                      icon={<Lock className="w-4 h-4 text-ink-muted" />}
                      placeholder="Re-enter new password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1"
                      aria-label="Toggle confirm password visibility"
                    >
                      {showConfirmPassword ? <EyeClosed className="w-4 h-4" /> : <EyeOpen className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  loading={isResetting}
                  disabled={!newPassword || !confirmPassword}
                  className="h-12 text-sm font-bold mt-2 bg-[#4C3BFF] hover:bg-[#3d2fe0]"
                >
                  Save New Password
                </Button>
              </form>
            </div>
          )}

          {/* STEP 4: Done Screen */}
          {step === 'done' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-3xl flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-black text-ink tracking-tight">Password Reset Complete!</h1>
              <p className="text-ink-muted text-xs max-w-xs mx-auto">
                Your password has been successfully reset. You can now login with your new password.
              </p>
              <Button
                fullWidth
                onClick={() => navigate('/login')}
                className="h-12 text-sm font-bold bg-green-600 hover:bg-green-700"
              >
                Go to Login
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
