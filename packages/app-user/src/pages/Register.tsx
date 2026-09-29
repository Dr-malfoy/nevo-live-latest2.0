import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiPhoneFill as Phone,
  PiUserFill as UserIcon,
  PiAtBold as AtIcon,
  PiEnvelopeSimpleFill as MailIcon,
  PiLockFill as Lock,
  PiCheckCircleFill as CheckCircle,
  PiGoogleLogoFill as Google,
  PiFacebookLogoFill as Facebook,
  PiWhatsappLogoFill as Whatsapp,
  PiChatCircleDotsFill as SmsIcon,
  PiArrowClockwiseFill as RefreshIcon,
  PiPencilSimpleFill as EditIcon,
  PiShieldCheckFill as ShieldCheck,
  PiEyeFill as EyeOpen,
  PiEyeSlashFill as EyeClosed,
} from 'react-icons/pi';
import { Button, Input } from '../components/ui';
import { useAuthStore } from '../stores';
import { authApi } from '../api';
import { signInWithGoogle } from '../lib/firebase';

type OtpChannel = 'sms' | 'whatsapp';

export const Register = () => {
  const navigate = useNavigate();
  const { register, loginWithGoogle, isLoading: storeLoading, error: storeError, clearError } = useAuthStore();
  
  // Step: 'details' or 'otp'
  const [step, setStep] = useState<'details' | 'otp'>('details');
  
  // Form fields
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [channel, setChannel] = useState<OtpChannel>('sms');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // OTP state
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown countdown effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  const validateDetails = (): boolean => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setLocalError('Full name must be at least 2 characters');
      return false;
    }
    if (!username.trim() || username.trim().length < 3) {
      setLocalError('Username must be at least 3 characters');
      return false;
    }
    if (!/^[a-zA-Z0-9_.-]+$/.test(username.trim())) {
      setLocalError('Username can only contain letters, numbers, underscores, dashes, and periods');
      return false;
    }
    if (!phone.trim() || phone.trim().length < 6) {
      setLocalError('Please enter a valid phone number');
      return false;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setLocalError('Please enter a valid email address');
      return false;
    }
    if (!password || password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return false;
    }
    return true;
  };

  const handleSendOtp = async (selectedChannel: OtpChannel = channel) => {
    setLocalError(null);
    clearError();

    if (!validateDetails()) return;

    setIsSendingOtp(true);
    try {
      const { data } = await authApi.sendOtp(phone.trim(), selectedChannel, 'signup');
      if (data.success && data.data) {
        setChannel(selectedChannel);
        setCooldown(data.data.cooldownSeconds || 60);
        if (data.data.devOtp) {
          setDevOtp(data.data.devOtp);
        }
        setStep('otp');
        setOtpCode(['', '', '', '', '', '']);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setLocalError(data.error || 'Failed to send verification code');
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.error || 'Failed to send verification code');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async (targetChannel: OtpChannel = channel) => {
    if (cooldown > 0 || isSendingOtp) return;
    setLocalError(null);
    clearError();
    setIsSendingOtp(true);

    try {
      const { data } = await authApi.resendOtp(phone.trim(), targetChannel, 'signup');
      if (data.success && data.data) {
        setChannel(targetChannel);
        setCooldown(data.data.cooldownSeconds || 60);
        if (data.data.devOtp) {
          setDevOtp(data.data.devOtp);
        }
        setOtpCode(['', '', '', '', '', '']);
        otpInputRefs.current[0]?.focus();
      } else {
        setLocalError(data.error || 'Failed to resend code');
      }
    } catch (err: any) {
      setLocalError(err.response?.data?.error || 'Failed to resend code');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    // Handle paste of 6 digits
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      if (digits.length > 0) {
        const newOtp = [...otpCode];
        digits.forEach((d, i) => {
          if (index + i < 6) newOtp[index + i] = d;
        });
        setOtpCode(newOtp);
        const nextIdx = Math.min(index + digits.length, 5);
        otpInputRefs.current[nextIdx]?.focus();
        if (newOtp.every((d) => d !== '')) {
          handleVerifyAndRegister(newOtp.join(''));
        }
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    const newOtp = [...otpCode];
    newOtp[index] = digit;
    setOtpCode(newOtp);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    // Auto submit when complete
    if (digit && newOtp.every((d) => d !== '')) {
      handleVerifyAndRegister(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyAndRegister = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode.join('');
    if (code.length !== 6) {
      setLocalError('Please enter complete 6-digit OTP');
      return;
    }

    setLocalError(null);
    clearError();
    setIsSubmitting(true);

    try {
      // 1. Verify OTP
      const verifyRes = await authApi.verifyOtpOnly(phone.trim(), code, 'signup');
      const token = verifyRes.data?.data?.verificationToken;
      if (!token) {
        throw new Error(verifyRes.data?.error || 'Verification token missing');
      }
      setVerificationToken(token);

      // 2. Register User with all fields
      await register({
        fullName: fullName.trim(),
        username: username.trim().toLowerCase(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        nickname: fullName.trim(),
        password,
        confirmPassword,
        verificationToken: token,
        code,
      });

      navigate('/', { replace: true });
    } catch (err: any) {
      setLocalError(err.response?.data?.error || err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignUp = async () => {
    try {
      const idToken = await signInWithGoogle();
      await loginWithGoogle(idToken);
      navigate('/', { replace: true });
    } catch {}
  };

  const displayError = localError || storeError;

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="flex-1 flex flex-col p-6 bg-black/45 backdrop-blur-md overflow-y-auto">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between pt-4 mb-4 max-w-sm mx-auto w-full">
          <button
            onClick={() => {
              if (step === 'otp') {
                setStep('details');
                setLocalError(null);
              } else {
                navigate('/login');
              }
            }}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-white/80 font-medium text-xs">
            {step === 'otp' ? 'Step 2: Verification' : 'Step 1: Account Info'}
          </span>
        </div>

        <div className="my-auto max-w-sm mx-auto w-full bg-white/95 rounded-3xl p-6 shadow-2xl backdrop-blur-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {step === 'details' ? (
            <>
              <h1 className="text-2xl font-black mb-1 text-ink tracking-tight">Create Account</h1>
              <p className="text-ink-muted text-xs mb-4">Join Navo Live and start streaming today</p>

              {displayError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold p-3 rounded-xl mb-4 animate-fade-in">
                  {displayError}
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendOtp();
                }}
                className="space-y-3"
              >
                {/* Full Name */}
                <Input
                  icon={<UserIcon className="w-4 h-4 text-ink-muted" />}
                  placeholder="Full Name (e.g. John Doe)"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  maxLength={50}
                  required
                />

                {/* Username */}
                <Input
                  icon={<AtIcon className="w-4 h-4 text-ink-muted" />}
                  placeholder="Username (e.g. johndoe123)"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  maxLength={30}
                  required
                />

                {/* Phone Number */}
                <Input
                  icon={<Phone className="w-4 h-4 text-ink-muted" />}
                  placeholder="Phone Number (e.g. 01712345678)"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  type="tel"
                  required
                />

                {/* Email Address */}
                <Input
                  icon={<MailIcon className="w-4 h-4 text-ink-muted" />}
                  placeholder="Email Address (e.g. john@example.com)"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (localError) setLocalError(null);
                  }}
                  type="email"
                />

                {/* OTP Channel Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1.5 ml-1">
                    Send Verification Code Via
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setChannel('sms')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        channel === 'sms'
                          ? 'border-[#4C3BFF] bg-[#4C3BFF]/10 text-[#4C3BFF] shadow-sm'
                          : 'border-line bg-surface text-ink-muted hover:bg-surface-sunken'
                      }`}
                    >
                      <SmsIcon className="w-4 h-4" />
                      SMS OTP
                    </button>
                    <button
                      type="button"
                      onClick={() => setChannel('whatsapp')}
                      className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                        channel === 'whatsapp'
                          ? 'border-[#25D366] bg-[#25D366]/10 text-[#128C7E] shadow-sm'
                          : 'border-line bg-surface text-ink-muted hover:bg-surface-sunken'
                      }`}
                    >
                      <Whatsapp className="w-4 h-4 text-[#25D366]" />
                      WhatsApp OTP
                    </button>
                  </div>
                </div>

                {/* Password */}
                <div className="relative">
                  <Input
                    icon={<Lock className="w-4 h-4 text-ink-muted" />}
                    placeholder="Password (minimum 6 characters)"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    type={showPassword ? 'text' : 'password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  >
                    {showPassword ? <EyeClosed className="w-4 h-4" /> : <EyeOpen className="w-4 h-4" />}
                  </button>
                </div>

                {/* Confirm Password */}
                <div className="relative">
                  <Input
                    icon={<Lock className="w-4 h-4 text-ink-muted" />}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  >
                    {showConfirmPassword ? <EyeClosed className="w-4 h-4" /> : <EyeOpen className="w-4 h-4" />}
                  </button>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  loading={isSendingOtp}
                  className="h-12 text-sm font-bold mt-2"
                >
                  Continue & Send Code
                </Button>
              </form>

              {/* Social Sign Up Divider */}
              <div className="flex items-center justify-center gap-3 my-3 opacity-70">
                <div className="h-px flex-1 bg-ink/15"></div>
                <span className="text-ink-muted text-[11px] font-medium">or sign up with</span>
                <div className="h-px flex-1 bg-ink/15"></div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  className="flex-1 h-10 rounded-xl border border-line bg-surface flex items-center justify-center gap-2 text-xs font-bold text-ink hover:bg-surface-sunken active:scale-95 transition-all shadow-sm"
                >
                  <Google className="w-4 h-4 text-[#DB4437]" /> Google
                </button>
                <button
                  type="button"
                  className="flex-1 h-10 rounded-xl border border-line bg-surface flex items-center justify-center gap-2 text-xs font-bold text-ink hover:bg-surface-sunken active:scale-95 transition-all shadow-sm"
                >
                  <Facebook className="w-4 h-4 text-[#1877F2]" /> Facebook
                </button>
              </div>

              <p className="text-center text-xs text-ink-muted mt-4">
                Already have an account?{' '}
                <Link to="/login" className="text-[#4C3BFF] font-bold hover:underline">
                  Log in
                </Link>
              </p>
            </>
          ) : (
            /* Step 2: OTP Verification */
            <div className="animate-in fade-in duration-200">
              <div className="flex items-center justify-center w-12 h-12 bg-[#4C3BFF]/10 text-[#4C3BFF] rounded-2xl mb-4 mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <h1 className="text-2xl font-black mb-1 text-center text-ink tracking-tight">Verify Phone</h1>
              <p className="text-ink-muted text-xs text-center mb-1">
                We sent a 6-digit code via <strong className="text-ink font-semibold uppercase">{channel}</strong> to
              </p>
              
              {/* Phone target with quick edit button */}
              <div className="flex items-center justify-center gap-2 mb-4">
                <span className="font-bold text-ink text-sm">{phone}</span>
                <button
                  type="button"
                  onClick={() => setStep('details')}
                  className="text-[#4C3BFF] text-xs font-semibold flex items-center gap-1 hover:underline bg-brand/5 px-2 py-0.5 rounded-md"
                >
                  <EditIcon className="w-3 h-3" /> Edit
                </button>
              </div>

              {/* Dev Mode OTP auto-helper */}
              {devOtp && (
                <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Dev Mode OTP:</span>{' '}
                  <span className="font-mono font-black text-amber-900 text-sm tracking-widest">{devOtp}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = devOtp.split('');
                      setOtpCode(digits);
                      handleVerifyAndRegister(devOtp);
                    }}
                    className="block mx-auto mt-1 text-[11px] text-amber-700 font-bold underline hover:text-amber-900"
                  >
                    Auto-fill & Submit
                  </button>
                </div>
              )}

              {displayError && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold p-3 rounded-xl mb-4 animate-fade-in text-center">
                  {displayError}
                </div>
              )}

              {/* 6 Digit Input boxes */}
              <div className="flex justify-between gap-2 mb-6">
                {otpCode.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => (otpInputRefs.current[idx] = el)}
                    type="text"
                    inputMode="numeric"
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
                onClick={() => handleVerifyAndRegister()}
                loading={isSubmitting || storeLoading}
                disabled={otpCode.some((d) => !d)}
                className="h-12 text-sm font-bold mb-4"
              >
                Verify & Create Account
              </Button>

              {/* Resend actions */}
              <div className="text-center space-y-2">
                <div className="text-xs text-ink-muted">
                  {cooldown > 0 ? (
                    <span>Resend code in <strong className="text-ink font-bold">{cooldown}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleResendOtp(channel)}
                      disabled={isSendingOtp}
                      className="text-[#4C3BFF] font-bold hover:underline inline-flex items-center gap-1.5"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" /> Resend Code
                    </button>
                  )}
                </div>

                {/* Alternative channel toggle on resend */}
                {channel === 'sms' ? (
                  <button
                    type="button"
                    onClick={() => handleResendOtp('whatsapp')}
                    disabled={isSendingOtp || cooldown > 0}
                    className="text-[11px] text-ink-muted hover:text-[#128C7E] transition-colors font-medium flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <Whatsapp className="w-3.5 h-3.5 text-[#25D366]" />
                    Didn't receive SMS? Try WhatsApp OTP
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleResendOtp('sms')}
                    disabled={isSendingOtp || cooldown > 0}
                    className="text-[11px] text-ink-muted hover:text-[#4C3BFF] transition-colors font-medium flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <SmsIcon className="w-3.5 h-3.5 text-[#4C3BFF]" />
                    Didn't receive WhatsApp? Try SMS OTP
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="flex items-start gap-2 mt-4 pt-3 border-t border-line/60">
            <div className="mt-0.5 relative flex items-center justify-center shrink-0">
              <CheckCircle className="w-4 h-4 text-[#4C3BFF]" />
            </div>
            <p className="text-ink-faint text-[10px] leading-tight">
              By creating an account, you agree to our <Link to="/terms" className="underline">Terms</Link> & <Link to="/privacy" className="underline">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
