import { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiMagnifyingGlassBold as SearchIcon,
  PiPhoneFill as Phone,
  PiLockFill as Lock,
  PiShieldCheckFill as ShieldCheck,
  PiCheckCircleFill as CheckCircle,
  PiWhatsappLogoFill as Whatsapp,
  PiChatCircleDotsFill as SmsIcon,
  PiUserFill as UserIcon,
  PiIdentificationCardFill as IdCardIcon,
  PiEyeFill as EyeOpen,
  PiEyeSlashFill as EyeClosed,
  PiArrowClockwiseFill as RefreshIcon,
} from 'react-icons/pi';
import { Button, Input } from '../components/ui';
import { authApi, type SearchAccountResponseData } from '../api';

type Step = 'search' | 'channel' | 'otp' | 'password' | 'done';
type Channel = 'sms' | 'whatsapp';

export const ForgotPassword = () => {
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [foundAccount, setFoundAccount] = useState<SearchAccountResponseData | null>(null);

  const [channel, setChannel] = useState<Channel>('sms');
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // OTP
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Password
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [error, setError] = useState<string | null>(null);

  // Cooldown effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (cooldown > 0) {
      timer = setInterval(() => {
        setCooldown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [cooldown]);

  // Handle Account Search
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) {
      setError('Please enter your phone number, account ID (UID), or username.');
      return;
    }
    setError(null);
    setIsSearching(true);
    setFoundAccount(null);

    try {
      const res = await authApi.searchAccount(searchQuery.trim());
      if (res.data.success && res.data.data) {
        setFoundAccount(res.data.data);
      } else {
        setError(res.data.error || 'No account found matching this query.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Account search failed. Please verify your input.');
    } finally {
      setIsSearching(false);
    }
  };

  // Handle Select Account & Go to Channel Selection
  const handleSelectAccount = () => {
    if (!foundAccount) return;
    setError(null);
    setStep('channel');
  };

  // Handle Send OTP
  const handleSendOtp = async (selectedChannel: Channel = channel) => {
    if (!foundAccount) return;
    setError(null);
    setIsSendingOtp(true);

    try {
      const res = await authApi.sendOtp(foundAccount.rawPhone, selectedChannel, 'reset_password');
      if (res.data.success && res.data.data) {
        setChannel(selectedChannel);
        setCooldown(res.data.data.cooldownSeconds || 60);
        if (res.data.data.devOtp) {
          setDevOtp(res.data.data.devOtp);
        }
        setStep('otp');
        setOtpDigits(['', '', '', '', '', '']);
        setTimeout(() => {
          otpInputRefs.current[0]?.focus();
        }, 150);
      } else {
        setError(res.data.error || 'Failed to send OTP code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to send verification code.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Handle OTP digit changes
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

  // Handle Verify OTP
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      setError('Please enter complete 6-digit OTP code.');
      return;
    }
    if (!foundAccount) return;

    setError(null);
    setIsVerifyingOtp(true);

    try {
      const res = await authApi.verifyOtpOnly(foundAccount.rawPhone, code, 'reset_password');
      if (res.data.success && res.data.data?.verificationToken) {
        setVerificationToken(res.data.data.verificationToken);
        setStep('password');
      } else {
        setError(res.data.error || 'Invalid or expired OTP code.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code. Please check and try again.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Handle Reset Password Submit
  const handleResetPassword = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!foundAccount) return;

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
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
        code: code || undefined,
      });

      if (res.data.success) {
        setStep('done');
      } else {
        setError(res.data.error || 'Failed to update password.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Password reset failed. Please try again.');
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <div className="flex-1 flex flex-col p-6 bg-black/45 backdrop-blur-md">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between pt-6 mb-4 max-w-sm mx-auto w-full">
          <button
            onClick={() => {
              if (step === 'channel') setStep('search');
              else if (step === 'otp') setStep('channel');
              else if (step === 'password') setStep('otp');
              else if (step === 'done') navigate('/login');
              else navigate('/login');
            }}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-transform"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-white/80 font-medium text-xs">
            {step === 'search' && 'Find Account'}
            {step === 'channel' && 'Select Delivery'}
            {step === 'otp' && 'Verify OTP'}
            {step === 'password' && 'New Password'}
            {step === 'done' && 'Completed'}
          </span>
        </div>

        {/* Card Container */}
        <div className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full bg-white/95 rounded-3xl p-6 shadow-2xl backdrop-blur-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          
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
                Enter your phone number, account UID, or username to reset your password.
              </p>

              <form onSubmit={handleSearch} className="space-y-4">
                <Input
                  icon={<SearchIcon className="w-4 h-4 text-ink-muted" />}
                  placeholder="Phone, UID, or Username"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />

                <Button
                  type="submit"
                  fullWidth
                  loading={isSearching}
                  disabled={!searchQuery.trim()}
                  className="h-12 text-sm font-bold"
                >
                  Search Account
                </Button>
              </form>

              {/* Account Search Result Preview */}
              {foundAccount && (
                <div className="mt-5 p-4 bg-[#4C3BFF]/5 border-2 border-[#4C3BFF] rounded-2xl animate-in zoom-in-95 duration-200">
                  <div className="text-[11px] font-bold text-[#4C3BFF] uppercase tracking-wider mb-2">
                    Account Found
                  </div>
                  <div className="flex items-center gap-3 mb-3">
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
                    onClick={handleSelectAccount}
                    fullWidth
                    className="h-10 text-xs font-bold bg-[#4C3BFF] hover:bg-[#3d2fe0]"
                  >
                    This is My Account &rarr;
                  </Button>
                </div>
              )}

              <div className="mt-6 text-center">
                <Link to="/login" className="text-xs text-ink-muted hover:text-ink font-medium">
                  Remember your password? <strong className="text-[#4C3BFF] underline">Log in</strong>
                </Link>
              </div>
            </div>
          )}

          {/* STEP 2: Choose Delivery Option (WhatsApp vs SMS) */}
          {step === 'channel' && foundAccount && (
            <div>
              <div className="flex items-center gap-3 p-3 bg-surface-sunken rounded-2xl mb-5">
                <img
                  src={foundAccount.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                  alt={foundAccount.nickname}
                  className="w-10 h-10 rounded-full object-cover border"
                />
                <div className="overflow-hidden flex-1">
                  <div className="font-bold text-ink text-sm truncate">{foundAccount.nickname}</div>
                  <div className="text-xs text-ink-muted">{foundAccount.phone}</div>
                </div>
              </div>

              <h1 className="text-xl font-black text-ink tracking-tight mb-1">Select Delivery Option</h1>
              <p className="text-ink-muted text-xs mb-5">
                Where would you like to receive your 6-digit verification code?
              </p>

              <div className="space-y-3 mb-6">
                {/* WhatsApp Option Card */}
                <div
                  onClick={() => setChannel('whatsapp')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                    channel === 'whatsapp'
                      ? 'border-[#25D366] bg-[#25D366]/10 shadow-sm'
                      : 'border-line bg-surface hover:bg-surface-sunken'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#25D366]/20 flex items-center justify-center shrink-0">
                    <Whatsapp className="w-6 h-6 text-[#25D366]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-ink text-sm">WhatsApp OTP</div>
                    <div className="text-xs text-ink-muted">Send code directly to WhatsApp</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    channel === 'whatsapp' ? 'border-[#25D366] bg-[#25D366]' : 'border-line'
                  }`}>
                    {channel === 'whatsapp' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>

                {/* SMS Option Card */}
                <div
                  onClick={() => setChannel('sms')}
                  className={`cursor-pointer p-4 rounded-2xl border-2 transition-all flex items-center gap-3 ${
                    channel === 'sms'
                      ? 'border-[#4C3BFF] bg-[#4C3BFF]/10 shadow-sm'
                      : 'border-line bg-surface hover:bg-surface-sunken'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#4C3BFF]/20 flex items-center justify-center shrink-0">
                    <SmsIcon className="w-6 h-6 text-[#4C3BFF]" />
                  </div>
                  <div className="flex-1">
                    <div className="font-black text-ink text-sm">SMS OTP</div>
                    <div className="text-xs text-ink-muted">Send code via standard SMS</div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    channel === 'sms' ? 'border-[#4C3BFF] bg-[#4C3BFF]' : 'border-line'
                  }`}>
                    {channel === 'sms' && <div className="w-2 h-2 rounded-full bg-white" />}
                  </div>
                </div>
              </div>

              <Button
                fullWidth
                onClick={() => handleSendOtp(channel)}
                loading={isSendingOtp}
                className="h-12 text-sm font-bold"
              >
                Send Verification Code
              </Button>
            </div>
          )}

          {/* STEP 3: Enter OTP */}
          {step === 'otp' && foundAccount && (
            <div>
              <div className="flex items-center justify-center w-12 h-12 bg-[#4C3BFF]/10 text-[#4C3BFF] rounded-2xl mb-4 mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <h1 className="text-2xl font-black text-center text-ink tracking-tight mb-1">Enter Verification Code</h1>
              <p className="text-ink-muted text-xs text-center mb-1">
                We sent a 6-digit code via <strong className="text-ink font-bold uppercase">{channel}</strong> to
              </p>
              <div className="text-center font-bold text-ink text-sm mb-4">{foundAccount.phone}</div>

              {/* Dev Mode OTP auto-helper */}
              {devOtp && (
                <div className="mb-4 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-center">
                  <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Dev Mode OTP:</span>{' '}
                  <span className="font-mono font-black text-amber-900 text-sm tracking-widest">{devOtp}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const digits = devOtp.split('');
                      setOtpDigits(digits);
                      handleVerifyOtp(devOtp);
                    }}
                    className="block mx-auto mt-1 text-[11px] text-amber-700 font-bold underline hover:text-amber-900"
                  >
                    Auto-fill & Continue
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
                className="h-12 text-sm font-bold mb-4"
              >
                Verify Code
              </Button>

              {/* Resend & channel switch */}
              <div className="text-center space-y-2">
                <div className="text-xs text-ink-muted">
                  {cooldown > 0 ? (
                    <span>Resend code in <strong className="text-ink font-bold">{cooldown}s</strong></span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSendOtp(channel)}
                      disabled={isSendingOtp}
                      className="text-[#4C3BFF] font-bold hover:underline inline-flex items-center gap-1.5"
                    >
                      <RefreshIcon className="w-3.5 h-3.5" /> Resend Code
                    </button>
                  )}
                </div>

                {channel === 'sms' ? (
                  <button
                    type="button"
                    onClick={() => handleSendOtp('whatsapp')}
                    disabled={isSendingOtp || cooldown > 0}
                    className="text-[11px] text-ink-muted hover:text-[#128C7E] transition-colors font-medium flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <Whatsapp className="w-3.5 h-3.5 text-[#25D366]" />
                    Didn't receive SMS? Send via WhatsApp OTP
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleSendOtp('sms')}
                    disabled={isSendingOtp || cooldown > 0}
                    className="text-[11px] text-ink-muted hover:text-[#4C3BFF] transition-colors font-medium flex items-center justify-center gap-1.5 mx-auto"
                  >
                    <SmsIcon className="w-3.5 h-3.5 text-[#4C3BFF]" />
                    Didn't receive WhatsApp? Send via SMS OTP
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: Create New Password */}
          {step === 'password' && (
            <div>
              <div className="flex items-center justify-center w-12 h-12 bg-[#4C3BFF]/10 text-[#4C3BFF] rounded-2xl mb-4 mx-auto">
                <Lock className="w-6 h-6" />
              </div>

              <h1 className="text-2xl font-black text-center text-ink tracking-tight mb-1">Create New Password</h1>
              <p className="text-ink-muted text-xs text-center mb-6">
                Enter your new secure password below to complete account recovery.
              </p>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="relative">
                  <Input
                    icon={<Lock className="w-4 h-4 text-ink-muted" />}
                    placeholder="New password (min 6 characters)"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink"
                  >
                    {showPassword ? <EyeClosed className="w-4 h-4" /> : <EyeOpen className="w-4 h-4" />}
                  </button>
                </div>

                <div className="relative">
                  <Input
                    icon={<Lock className="w-4 h-4 text-ink-muted" />}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    type={showConfirmPassword ? 'text' : 'password'}
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
                  loading={isResetting}
                  disabled={!newPassword || !confirmPassword}
                  className="h-12 text-sm font-bold mt-2"
                >
                  Save & Set New Password
                </Button>
              </form>
            </div>
          )}

          {/* STEP 5: Done Screen */}
          {step === 'done' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-16 h-16 bg-green-500/10 text-green-500 rounded-3xl flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle className="w-10 h-10" />
              </div>
              <h1 className="text-2xl font-black text-ink tracking-tight">Password Updated!</h1>
              <p className="text-ink-muted text-xs max-w-xs mx-auto">
                Your password has been successfully reset. You can now use your new password to sign in.
              </p>
              <Button
                fullWidth
                onClick={() => navigate('/login')}
                className="h-12 text-sm font-bold bg-green-600 hover:bg-green-700"
              >
                Go to Sign In
              </Button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
