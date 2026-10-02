import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiPhoneFill as Phone,
  PiUserFill as UserIcon,
  PiEnvelopeSimpleFill as MailIcon,
  PiLockFill as Lock,
  PiGiftFill as GiftIcon,
  PiCheckCircleFill as CheckCircle,
  PiGoogleLogoFill as Google,
  PiFacebookLogoFill as Facebook,
  PiEyeFill as EyeOpen,
  PiEyeSlashFill as EyeClosed,
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

type Step = 'details' | 'otp';

export const Register = () => {
  const navigate = useNavigate();
  const params = useParams<{ inviteCode?: string }>();
  const [searchParams] = useSearchParams();
  const showToast = useUIStore((s) => s.showToast);
  const { register, loginWithGoogle, loginWithFacebook, isLoading: storeLoading, error: storeError, clearError } = useAuthStore();

  const recaptchaRef = useRef<HTMLDivElement>(null);
  const verifierRef = useRef<any>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Step state: 'details' or 'otp'
  const [step, setStep] = useState<Step>('details');

  // Contact Method: 'phone' or 'email'
  const [contactMethod, setContactMethod] = useState<'phone' | 'email'>('phone');

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [countryCode, setCountryCode] = useState('BD');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [inviteCode, setInviteCode] = useState('');
  const [autoDetectedInvite, setAutoDetectedInvite] = useState(false);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // OTP State
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

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

  // Clean up reCAPTCHA on unmount
  useEffect(() => {
    return () => {
      clearRecaptcha();
    };
  }, []);

  // Automatically detect invite code from URL parameters or path
  useEffect(() => {
    // 1. Path param from /invite/:inviteCode
    const pathCode = params.inviteCode;
    // 2. Query params from ?code=XYZ, ?invite=XYZ, ?inviter=XYZ, ?referrer=XYZ
    const queryCode =
      searchParams.get('code') ||
      searchParams.get('invite') ||
      searchParams.get('inviter') ||
      searchParams.get('referrer');

    const detected = pathCode || queryCode;
    if (detected && detected.trim()) {
      const clean = detected.trim();
      setInviteCode(clean);
      setAutoDetectedInvite(true);
    }
  }, [params, searchParams]);

  const getFullPhone = () => formatFullPhoneNumber(countryCode, phone.trim());

  // Form validation
  const validateDetails = (): boolean => {
    if (!fullName.trim() || fullName.trim().length < 2) {
      setLocalError('Please enter your full name (minimum 2 characters)');
      return false;
    }

    if (contactMethod === 'phone') {
      const cleanNumber = phone.trim().replace(/\D/g, '');
      if (!cleanNumber || cleanNumber.length < 5) {
        setLocalError('Please enter a valid mobile phone number');
        return false;
      }
    } else {
      if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        setLocalError('Please enter a valid Gmail / email address');
        return false;
      }
    }

    if (!password || password.length < 6) {
      setLocalError('Password must be at least 6 characters long');
      return false;
    }

    if (!dob) {
      setLocalError('Please select your Date of Birth');
      return false;
    }

    const birthDate = new Date(dob);
    if (isNaN(birthDate.getTime())) {
      setLocalError('Please enter a valid Date of Birth');
      return false;
    }

    const today = new Date();
    if (birthDate > today) {
      setLocalError('Date of Birth cannot be in the future');
      return false;
    }

    if (!gender) {
      setLocalError('Please select your gender');
      return false;
    }

    return true;
  };

  // STEP 1: Handle Send OTP
  const handleInitiateSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!validateDetails()) return;

    // If signing up with Email only
    if (contactMethod === 'email') {
      setIsSendingOtp(true);
      try {
        await register({
          fullName: fullName.trim(),
          email: email.trim().toLowerCase(),
          password,
          dob,
          birthday: dob,
          gender,
          inviteCode: inviteCode.trim() || undefined,
        });
        showToast('Account created successfully! Welcome to Navo Live.', 'success');
        navigate('/', { replace: true });
      } catch (err: any) {
        setLocalError(err?.response?.data?.error || err?.message || 'Registration failed.');
      } finally {
        setIsSendingOtp(false);
      }
      return;
    }

    // If signing up with Phone: Send OTP (Firebase with automatic fallback to Backend SMS/Dev OTP)
    setIsSendingOtp(true);
    const fullPhone = getFullPhone();

    try {
      let devOtpFound: string | null = null;

      // 1. Always pre-check with backend AND trigger system SMS OTP / dev OTP
      try {
        const sendRes = await authApi.sendOtp(fullPhone, 'sms', 'signup');
        if (sendRes.data?.data?.devOtp) {
          devOtpFound = sendRes.data.data.devOtp;
        }
      } catch (checkErr: any) {
        if (
          checkErr.response?.status === 409 ||
          checkErr.response?.data?.error?.includes('already exists') ||
          checkErr.response?.data?.error?.includes('already registered')
        ) {
          setLocalError('An account with this phone number already exists. Please log in.');
          setIsSendingOtp(false);
          return;
        }
      }

      // 2. Try Firebase Phone Auth (if enabled in Firebase Console)
      try {
        const verifier = setupRecaptcha('recaptcha-container');
        verifierRef.current = verifier;
        const confirmation = await sendPhoneOtp(fullPhone, verifier);
        confirmationResultRef.current = confirmation;
      } catch (fbErr: any) {
        console.warn('Firebase Phone Auth OTP skipped/failed, using system SMS OTP fallback:', fbErr);
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
        showToast(`Verification code sent to ${fullPhone}`, 'info');
      }

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 150);
    } catch (err: any) {
      console.error('Phone Auth OTP send error:', err);
      const friendlyMsg = mapFirebaseAuthError(err);
      setLocalError(friendlyMsg || 'Failed to send verification code. Please check your number.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (cooldown > 0 || isSendingOtp) return;
    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
    await handleInitiateSignUp(fakeEvent);
  };

  // OTP Digits Handling
  const handleOtpDigitChange = (index: number, value: string) => {
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
          handleVerifyAndCreateAccount(newOtp.join(''));
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

    if (digit && newOtp.every((d) => d !== '')) {
      handleVerifyAndCreateAccount(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // STEP 2: Verify OTP and Create Account ONLY IF MATCHED
  const handleVerifyAndCreateAccount = async (codeToVerify?: string) => {
    const code = codeToVerify || otpDigits.join('');
    if (code.length !== 6) {
      setLocalError('Please enter the complete 6-digit verification code.');
      return;
    }

    setLocalError(null);
    clearError();
    setIsVerifyingOtp(true);

    const fullPhone = getFullPhone();

    try {
      let idToken: string | undefined;
      let verified = false;

      // 1. Verify OTP with Firebase confirmation if active
      if (confirmationResultRef.current) {
        try {
          const verifyRes = await verifyPhoneOtp(confirmationResultRef.current, code);
          idToken = verifyRes.idToken;
          verified = true;
        } catch (fbErr: any) {
          console.warn('Firebase OTP verification failed, verifying with system SMS OTP:', fbErr);
        }
      }

      // 2. Verify with backend system OTP if Firebase not verified
      if (!verified) {
        try {
          await authApi.verifyOtpOnly(fullPhone, code, 'signup');
          verified = true;
        } catch (backendErr: any) {
          setLocalError(backendErr.response?.data?.error || 'Invalid verification code. Please check and try again.');
          setIsVerifyingOtp(false);
          return;
        }
      }

      // 3. ONLY IF OTP MATCHED: Create the Account on Backend
      await register({
        fullName: fullName.trim(),
        phone: fullPhone,
        password,
        dob,
        birthday: dob,
        gender,
        inviteCode: inviteCode.trim() || undefined,
        code,
        idToken,
      });

      showToast('Account created successfully! Welcome to Navo Live.', 'success');
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Registration error:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Account creation failed. Please check your information and try again.';
      setLocalError(msg);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  // Social Sign Up Handlers
  const handleGoogleSignUp = async () => {
    setLocalError(null);
    clearError();
    setIsSendingOtp(true);
    try {
      const idToken = await signInWithGoogle();
      await loginWithGoogle(idToken);
      showToast('Signed up with Google!', 'success');
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Google sign up error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setLocalError(mapFirebaseAuthError(err));
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleFacebookSignUp = async () => {
    setLocalError(null);
    clearError();
    setIsSendingOtp(true);
    try {
      const { idToken, accessToken } = await signInWithFacebook();
      await loginWithFacebook(idToken, accessToken);
      showToast('Signed up with Facebook!', 'success');
      navigate('/', { replace: true });
    } catch (err: any) {
      console.error('Facebook sign up error:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setLocalError(mapFirebaseAuthError(err));
      }
    } finally {
      setIsSendingOtp(false);
    }
  };

  const displayError = localError || storeError;
  const isLoading = storeLoading || isSendingOtp || isVerifyingOtp;

  return (
    <div
      className="min-h-screen flex flex-col relative"
      style={{ backgroundImage: "url('/login-bg.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Invisible Firebase Recaptcha Container */}
      <div id="recaptcha-container" ref={recaptchaRef} />

      <div className="flex-1 flex flex-col p-4 sm:p-6 bg-black/45 backdrop-blur-md overflow-y-auto">
        {/* Top Navigation Bar */}
        <div className="flex items-center justify-between pt-2 mb-3 max-w-md mx-auto w-full">
          <button
            type="button"
            onClick={() => {
              if (step === 'otp') {
                setStep('details');
                setLocalError(null);
              } else {
                navigate('/login');
              }
            }}
            className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md text-white flex items-center justify-center active:scale-95 transition-transform hover:bg-white/30"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-white/90 font-bold text-xs bg-black/40 px-3.5 py-1 rounded-full backdrop-blur-sm">
            {step === 'otp' ? 'Step 2: Verify Phone' : 'Step 1: Account Info'}
          </span>
        </div>

        <div className="my-auto max-w-md mx-auto w-full bg-white/95 rounded-3xl p-6 shadow-2xl backdrop-blur-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          
          {displayError && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-600 text-xs font-semibold p-3 rounded-xl mb-4 animate-fade-in text-center">
              {displayError}
            </div>
          )}

          {/* STEP 1: Account Details Form */}
          {step === 'details' ? (
            <>
              <h1 className="text-2xl font-black mb-1 text-ink tracking-tight">Create Account</h1>
              <p className="text-ink-muted text-xs mb-4">Fill in your details to create a new account</p>

              <form onSubmit={handleInitiateSignUp} className="space-y-3.5">
                {/* 1. Full Name */}
                <div>
                  <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1 ml-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    icon={<UserIcon className="w-4 h-4 text-ink-muted" />}
                    placeholder="e.g. John Doe"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      if (localError) setLocalError(null);
                    }}
                    maxLength={50}
                    required
                  />
                </div>

                {/* 2. Phone Number OR Gmail Switcher */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 ml-1">
                    <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      {contactMethod === 'phone' ? 'Phone Number' : 'Gmail / Email'} <span className="text-red-500">*</span>
                    </label>
                    <div className="flex gap-1 bg-surface-sunken p-0.5 rounded-lg">
                      <button
                        type="button"
                        onClick={() => {
                          setContactMethod('phone');
                          if (localError) setLocalError(null);
                        }}
                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                          contactMethod === 'phone' ? 'bg-brand text-white shadow-xs' : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        Phone
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setContactMethod('email');
                          if (localError) setLocalError(null);
                        }}
                        className={`px-2.5 py-0.5 text-[10px] font-bold rounded-md transition-colors ${
                          contactMethod === 'email' ? 'bg-brand text-white shadow-xs' : 'text-ink-muted hover:text-ink'
                        }`}
                      >
                        Gmail
                      </button>
                    </div>
                  </div>

                  {contactMethod === 'phone' ? (
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
                  ) : (
                    <Input
                      icon={<MailIcon className="w-4 h-4 text-ink-muted" />}
                      placeholder="e.g. yourname@gmail.com"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (localError) setLocalError(null);
                      }}
                      type="email"
                    />
                  )}
                </div>

                {/* 3. Password */}
                <div>
                  <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1 ml-1">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Input
                      icon={<Lock className="w-4 h-4 text-ink-muted" />}
                      placeholder="Minimum 6 characters"
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
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-muted hover:text-ink p-1"
                      aria-label="Toggle password visibility"
                    >
                      {showPassword ? <EyeClosed className="w-4 h-4" /> : <EyeOpen className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 4. Date of Birth & Gender Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Date of Birth */}
                  <div>
                    <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1 ml-1">
                      Date of Birth <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      value={dob}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={(e) => {
                        setDob(e.target.value);
                        if (localError) setLocalError(null);
                      }}
                      required
                      className="w-full h-11 px-3.5 rounded-xl border border-line-strong bg-white text-xs font-semibold text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all cursor-pointer"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1 ml-1">
                      Gender <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-3 gap-1 h-11 bg-surface-sunken p-1 rounded-xl">
                      {(['male', 'female', 'other'] as const).map((g) => (
                        <button
                          key={g}
                          type="button"
                          onClick={() => {
                            setGender(g);
                            if (localError) setLocalError(null);
                          }}
                          className={`flex items-center justify-center text-xs font-bold rounded-lg capitalize transition-all ${
                            gender === g
                              ? 'bg-brand text-white shadow-xs'
                              : 'text-ink-muted hover:text-ink'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. Invite Code (Optional / Auto-detected) */}
                <div>
                  <div className="flex items-center justify-between mb-1 ml-1">
                    <label className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Invite Code <span className="text-ink-faint font-normal">(Optional)</span>
                    </label>
                    {autoDetectedInvite && (
                      <span className="text-[10px] font-bold text-green-600 flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> Auto-detected
                      </span>
                    )}
                  </div>
                  <Input
                    icon={<GiftIcon className="w-4 h-4 text-ink-muted" />}
                    placeholder="Enter invite / referral code"
                    value={inviteCode}
                    onChange={(e) => {
                      setInviteCode(e.target.value);
                      if (autoDetectedInvite) setAutoDetectedInvite(false);
                      if (localError) setLocalError(null);
                    }}
                  />
                </div>

                {/* Continue to OTP Verification Button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    fullWidth
                    loading={isLoading}
                    className="bg-[#4C3BFF] hover:bg-[#3D2DE0] text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-[#4C3BFF]/30"
                  >
                    {contactMethod === 'phone' ? 'Send OTP Verification Code' : 'Create Account'}
                  </Button>
                </div>
              </form>

              {/* Social Sign Up Divider */}
              <div className="flex items-center justify-center gap-3 my-4 opacity-70">
                <div className="h-px flex-1 bg-line-strong"></div>
                <span className="text-[11px] text-ink-muted font-bold tracking-wider uppercase">Or Sign Up With</span>
                <div className="h-px flex-1 bg-line-strong"></div>
              </div>

              {/* Social Buttons */}
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleGoogleSignUp}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-line hover:bg-surface-sunken font-bold text-xs text-ink transition-colors shadow-2xs disabled:opacity-50"
                >
                  <Google className="w-4 h-4 text-[#DB4437]" /> Google
                </button>

                <button
                  type="button"
                  onClick={handleFacebookSignUp}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-line hover:bg-surface-sunken font-bold text-xs text-ink transition-colors shadow-2xs disabled:opacity-50"
                >
                  <Facebook className="w-4 h-4 text-[#1877F2]" /> Facebook
                </button>
              </div>

              {/* Already have account? Login */}
              <p className="text-center text-xs text-ink-muted mt-5">
                Already have an account?{' '}
                <Link to="/login" className="text-[#4C3BFF] font-bold hover:underline">
                  Login
                </Link>
              </p>
            </>
          ) : (
            /* STEP 2: Phone OTP Verification */
            <div className="space-y-5">
              <div className="flex items-center justify-center w-12 h-12 bg-[#4C3BFF]/10 text-[#4C3BFF] rounded-2xl mx-auto">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <h1 className="text-2xl font-black text-center text-ink tracking-tight mb-1">Verify Phone Number</h1>
              <p className="text-ink-muted text-xs text-center leading-relaxed">
                Enter the 6-digit OTP verification code sent to <strong className="text-ink">{getFullPhone()}</strong>
              </p>

              {/* Phone Preview / Edit */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-surface-sunken border border-line">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-ink-muted" />
                  <span className="text-xs font-bold text-ink">{getFullPhone()}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStep('details');
                    setLocalError(null);
                  }}
                  className="text-xs font-semibold text-[#4C3BFF] hover:underline flex items-center gap-1"
                >
                  <EditIcon className="w-3.5 h-3.5" /> Edit Info
                </button>
              </div>

              {/* Dev Mode OTP Indicator & Auto-fill */}
              {devOtp && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center space-y-1.5 animate-in fade-in duration-300">
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
                      handleVerifyAndCreateAccount(devOtp);
                    }}
                    className="text-xs font-bold text-[#4C3BFF] hover:underline"
                  >
                    Tap to auto-fill & verify
                  </button>
                </div>
              )}

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
                    className={`w-11 h-12 text-center text-lg font-black rounded-xl border transition-all ${
                      digit
                        ? 'border-[#4C3BFF] bg-white text-ink shadow-sm'
                        : 'border-line-strong bg-surface-sunken text-ink focus:border-[#4C3BFF] focus:bg-white'
                    } focus:outline-none focus:ring-2 focus:ring-[#4C3BFF]/20`}
                  />
                ))}
              </div>

              {/* Verify & Create Account Button */}
              <Button
                fullWidth
                onClick={() => handleVerifyAndCreateAccount()}
                loading={isLoading}
                disabled={otpDigits.some((d) => !d)}
                className="bg-[#4C3BFF] hover:bg-[#3D2DE0] text-white py-3.5 rounded-xl font-bold text-sm shadow-md shadow-[#4C3BFF]/30"
              >
                <ShieldCheck className="w-5 h-5" /> Verify & Create Account
              </Button>

              {/* Resend OTP Code Button */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  disabled={cooldown > 0 || isSendingOtp}
                  onClick={handleResendOtp}
                  className="text-xs font-bold text-ink-muted hover:text-ink disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                >
                  <RefreshIcon className={`w-3.5 h-3.5 ${isSendingOtp ? 'animate-spin' : ''}`} />
                  {cooldown > 0 ? (
                    <span>Resend code in <strong className="text-ink">{cooldown}s</strong></span>
                  ) : (
                    <span className="text-[#4C3BFF] underline underline-offset-2">Resend Verification Code</span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
