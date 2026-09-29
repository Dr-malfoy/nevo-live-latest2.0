import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  PiCaretLeftBold as ArrowLeft,
  PiShieldCheckFill as ShieldCheck,
  PiSealCheckFill as BadgeCheck,
  PiSpinnerBold as Loader2,
  PiUploadSimpleBold as Upload,
  PiCameraFill as Camera,
  PiCreditCardFill as CreditCard,
  PiCheckCircleFill as CheckCircle2,
  PiXCircleFill as XCircle,
  PiClockFill as Clock,
  PiVideoCameraFill as VideoCamera,
  PiChatCircleDotsFill as ChatDots,
  PiImagesFill as Images,
  PiCoinsFill as Coins,
  PiDiamondFill as Diamond,
  PiArrowsLeftRightFill as ArrowsLeftRight,
  PiArrowClockwiseBold as RefreshCw,
  PiSparkleFill as Sparkle,
  PiUserCheckFill as UserCheck,
  PiSmileyFill as SmileyFace,
} from 'react-icons/pi';
import { useAuthStore } from '../stores';
import { verificationApi, uploadApi, usersApi } from '../api';
import type { VerificationRequest } from '../types';

type Mode = 'hub' | 'face_scan' | 'nid_form';
type DetectionStatus = 'waiting' | 'no_face' | 'too_dark' | 'too_bright' | 'detected' | 'capturing';

const UPLOAD_FOLDER = 'verification';

export const VerificationCenter = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, updateUser } = useAuthStore();

  const [mode, setMode] = useState<Mode>('hub');
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ── Face Verification state ──────────────────────────────────────────
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [faceCapturedImage, setFaceCapturedImage] = useState<string | null>(null);
  const [faceUploading, setFaceUploading] = useState(false);
  const [scanStep, setScanStep] = useState<'ready' | 'capturing' | 'verifying' | 'done'>('ready');
  
  // Real-time Face Detection & Auto-Capture states
  const [detectionStatus, setDetectionStatus] = useState<DetectionStatus>('waiting');
  const [detectionCountdown, setDetectionCountdown] = useState<number | null>(null);
  const [isFaceInFrame, setIsFaceInFrame] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const consecutiveFaceFramesRef = useRef<number>(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ── NID Verification state ──────────────────────────────────────────
  const [nidFullName, setNidFullName] = useState(user?.nickname || '');
  const [nidNumber, setNidNumber] = useState(user?.verification?.nidNumber || '');
  const [nidDob, setNidDob] = useState(user?.birthday ? new Date(user.birthday).toISOString().slice(0, 10) : '');
  const [nidDocType, setNidDocType] = useState<'nid' | 'smart_card' | 'passport' | 'driving_license'>('nid');
  const [nidFrontUrl, setNidFrontUrl] = useState('');
  const [nidBackUrl, setNidBackUrl] = useState('');
  const [nidSelfieUrl, setNidSelfieUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState<null | 'front' | 'back' | 'selfie'>(null);

  const frontInputRef = useRef<HTMLInputElement | null>(null);
  const backInputRef = useRef<HTMLInputElement | null>(null);
  const selfieDocInputRef = useRef<HTMLInputElement | null>(null);

  const verification = user?.verification;
  const isFaceVerified = Boolean(verification?.faceVerified || (verification?.verified && !verification?.nidVerified));
  const isNidVerified = Boolean(verification?.nidVerified);

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'face' && !isFaceVerified) {
      setMode('face_scan');
    } else if (tab === 'nid' && !isNidVerified) {
      setMode('nid_form');
    }
  }, [searchParams, isFaceVerified, isNidVerified]);

  // Load existing verification request data
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await verificationApi.getMyRequest();
        if (data.success && data.data) {
          if (data.data.request) setRequest(data.data.request);
        }
      } catch {
        // non-fatal
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Sync profile after changes
  const refreshProfile = async () => {
    try {
      const profile = await usersApi.getProfile();
      if (profile.data.success && profile.data.data) {
        updateUser(profile.data.data);
      }
    } catch {
      // non-fatal
    }
  };

  // Clean up camera stream and animation on unmount or mode switch
  useEffect(() => {
    return () => {
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // ── Biometric Face Frame Evaluation Engine ──────────────────────────
  const evaluateVideoFrame = useCallback(async (): Promise<{ hasFace: boolean; status: DetectionStatus }> => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      return { hasFace: false, status: 'waiting' };
    }

    const video = videoRef.current;

    // 1. Try native Web API FaceDetector if supported by browser
    if (typeof (window as any).FaceDetector === 'function') {
      try {
        const detector = new (window as any).FaceDetector({ fastMode: true, maxDetectedFaces: 1 });
        const faces = await detector.detect(video);
        if (faces && faces.length > 0) {
          const face = faces[0];
          const box = face.boundingBox;
          if (box && box.width > 50 && box.height > 50) {
            return { hasFace: true, status: 'detected' };
          }
        }
      } catch {
        // fallback to canvas biometric heuristic
      }
    }

    // 2. High-speed Canvas Biometric & Lighting Heuristic
    if (!analysisCanvasRef.current) {
      analysisCanvasRef.current = document.createElement('canvas');
    }
    const canvas = analysisCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return { hasFace: false, status: 'waiting' };

    const sampleSize = 120;
    canvas.width = sampleSize;
    canvas.height = sampleSize;
    ctx.drawImage(video, 0, 0, sampleSize, sampleSize);

    const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imgData.data;

    let totalBrightness = 0;
    let skinPixels = 0;
    let centerSkinPixels = 0;
    const totalPixels = sampleSize * sampleSize;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const brightness = (r + g + b) / 3;
      totalBrightness += brightness;

      // Human skin-tone color model
      const isSkin =
        r > 50 &&
        g > 30 &&
        b > 15 &&
        r > g &&
        r > b &&
        r - g > 10 &&
        Math.abs(r - g) > 8;

      if (isSkin) {
        skinPixels++;
        const pxIdx = i / 4;
        const x = pxIdx % sampleSize;
        const y = Math.floor(pxIdx / sampleSize);
        // Center facial region (middle 50% circle)
        if (x >= sampleSize * 0.25 && x <= sampleSize * 0.75 && y >= sampleSize * 0.2 && y <= sampleSize * 0.8) {
          centerSkinPixels++;
        }
      }
    }

    const avgBrightness = totalBrightness / totalPixels;
    if (avgBrightness < 35) {
      return { hasFace: false, status: 'too_dark' };
    }
    if (avgBrightness > 245) {
      return { hasFace: false, status: 'too_bright' };
    }

    const centerZoneTotal = sampleSize * 0.5 * sampleSize * 0.6;
    const centerSkinRatio = centerSkinPixels / centerZoneTotal;

    // Face is in frame when center skin tone clustering is between 15% and 85%
    if (centerSkinRatio >= 0.16 && centerSkinRatio <= 0.85) {
      return { hasFace: true, status: 'detected' };
    }

    return { hasFace: false, status: 'no_face' };
  }, []);

  // ── Camera Handlers ──────────────────────────────────────────────────
  const startCamera = async () => {
    setError('');
    setDetectionStatus('waiting');
    setIsFaceInFrame(false);
    consecutiveFaceFramesRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      setCameraStream(stream);
      setCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access error:', err);
      setError('Camera access denied or unavailable. You can upload a selfie photo directly.');
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setIsFaceInFrame(false);
    setDetectionCountdown(null);
  };

  // ── Capture and Auto-Submit ──────────────────────────────────────────
  const captureAndAutoVerify = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth || 480;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

    setFaceCapturedImage(dataUrl);
    stopCamera();

    // Auto trigger submission immediately upon capturing
    await handleFaceVerifySubmit(dataUrl);
  }, []);

  // ── Real-Time Frame Evaluation Loop ──────────────────────────────────
  useEffect(() => {
    if (!cameraActive || faceCapturedImage || scanStep === 'verifying' || scanStep === 'done') {
      return;
    }

    let isRunning = true;

    const processLoop = async () => {
      if (!isRunning) return;

      const evalResult = await evaluateVideoFrame();

      if (evalResult.hasFace) {
        setIsFaceInFrame(true);
        setDetectionStatus('detected');
        consecutiveFaceFramesRef.current += 1;

        // If face has been stable for 4 consecutive frames (~400ms), start the auto-capture countdown
        if (consecutiveFaceFramesRef.current >= 4 && detectionCountdown === null) {
          setDetectionCountdown(2);
          
          let timeLeft = 2;
          countdownIntervalRef.current = setInterval(() => {
            timeLeft -= 1;
            if (timeLeft <= 0) {
              if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
              setDetectionCountdown(0);
              captureAndAutoVerify();
            } else {
              setDetectionCountdown(timeLeft);
            }
          }, 1000);
        }
      } else {
        // Reset if face was lost
        setIsFaceInFrame(false);
        setDetectionStatus(evalResult.status);
        consecutiveFaceFramesRef.current = 0;
        if (countdownIntervalRef.current) {
          clearInterval(countdownIntervalRef.current);
          countdownIntervalRef.current = null;
        }
        setDetectionCountdown(null);
      }

      if (isRunning) {
        // Sample every ~120ms for smooth real-time response without CPU load
        setTimeout(() => {
          if (isRunning) animFrameIdRef.current = requestAnimationFrame(processLoop);
        }, 120);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(processLoop);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [cameraActive, faceCapturedImage, scanStep, evaluateVideoFrame, detectionCountdown, captureAndAutoVerify]);

  const handleFaceFileUpload = async (file: File) => {
    setError('');
    setFaceUploading(true);
    try {
      const url = await uploadApi.upload(file, UPLOAD_FOLDER);
      setFaceCapturedImage(url);
      setScanStep('ready');
      // Prompt auto-verify on manual upload
      await handleFaceVerifySubmit(url);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Failed to upload photo');
    } finally {
      setFaceUploading(false);
    }
  };

  const handleFaceVerifySubmit = async (imageToSubmit?: string) => {
    const targetImage = imageToSubmit || faceCapturedImage;
    if (!targetImage) {
      setError('Please capture your face before verifying.');
      return;
    }

    setSubmitting(true);
    setScanStep('verifying');
    setError('');

    try {
      let selfieUrl = targetImage;
      if (targetImage.startsWith('data:image')) {
        const res = await fetch(targetImage);
        const blob = await res.blob();
        const file = new File([blob], 'face-verification.jpg', { type: 'image/jpeg' });
        selfieUrl = await uploadApi.upload(file, UPLOAD_FOLDER);
      }

      const { data } = await verificationApi.verifyFace({
        selfieUrl,
      });

      if (data.success) {
        setScanStep('done');
        setSuccessMessage('Face Verified! Live streaming, Party rooms, Chat, and Moments are now unlocked!');
        await refreshProfile();
        setTimeout(() => {
          setMode('hub');
          setScanStep('ready');
          setFaceCapturedImage(null);
          setSuccessMessage('');
        }, 2200);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Live face verification failed. Please try again.');
      setScanStep('ready');
    } finally {
      setSubmitting(false);
    }
  };

  // ── NID Document Upload Handlers ────────────────────────────────────
  const handleDocUpload = async (file: File, kind: 'front' | 'back' | 'selfie') => {
    setUploadingDoc(kind);
    setError('');
    try {
      const url = await uploadApi.upload(file, UPLOAD_FOLDER);
      if (kind === 'front') setNidFrontUrl(url);
      else if (kind === 'back') setNidBackUrl(url);
      else setNidSelfieUrl(url);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Upload failed. Try a different image.');
    } finally {
      setUploadingDoc(null);
    }
  };

  const handleNidSubmit = async () => {
    if (!nidFullName.trim() || !nidNumber.trim() || !nidDob || !nidFrontUrl || !nidBackUrl) {
      setError('Please fill in all required fields and upload both front and back photos of your NID.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const { data } = await verificationApi.submitNid({
        fullName: nidFullName.trim(),
        nidNumber: nidNumber.trim(),
        dateOfBirth: nidDob,
        documentType: nidDocType,
        documentFrontUrl: nidFrontUrl,
        documentBackUrl: nidBackUrl,
        selfieUrl: nidSelfieUrl || undefined,
        autoApprove: true,
      });

      if (data.success) {
        setSuccessMessage('NID Verified! Coin trading, buying and selling diamonds are now unlocked!');
        await refreshProfile();
        setTimeout(() => {
          setMode('hub');
          setSuccessMessage('');
        }, 2000);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'NID verification submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  // Helper for document upload boxes
  const renderUploadBox = (
    kind: 'front' | 'back' | 'selfie',
    label: string,
    url: string,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-ink-muted">{label}</label>
      <div
        onClick={() => inputRef.current?.click()}
        className={`relative w-full h-36 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all overflow-hidden ${
          url
            ? 'border-emerald-500/60 bg-emerald-50/50'
            : 'border-line-strong bg-surface-sunken/60 hover:bg-surface-sunken hover:border-amber-500/50'
        }`}
      >
        {uploadingDoc === kind ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 text-amber-500 animate-spin" />
            <span className="text-xs font-medium text-ink-muted">Uploading...</span>
          </div>
        ) : url ? (
          <div className="relative w-full h-full group">
            <img src={url} alt={label} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <span className="text-xs font-semibold text-white bg-black/70 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5" /> Replace
              </span>
            </div>
            <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1 shadow-md">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 text-ink-muted p-4 text-center">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm border border-line">
              <Upload className="w-5 h-5 text-amber-500" />
            </div>
            <span className="text-xs font-semibold text-ink">Upload {label}</span>
            <span className="text-[10px] text-ink-faint">JPG, PNG up to 10MB</span>
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleDocUpload(file, kind);
          e.target.value = '';
        }}
      />
    </div>
  );

  // ═════════════════════════════════════════════════════════════════════
  // MODE: FACE SCANNER WITH REAL-TIME FACE DETECTION & AUTO CAPTURE
  // ═════════════════════════════════════════════════════════════════════
  if (mode === 'face_scan') {
    return (
      <div className="min-h-screen bg-surface-soft text-ink flex flex-col">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-line">
          <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto w-full">
            <button
              onClick={() => {
                stopCamera();
                setMode('hub');
              }}
              className="p-2 -ml-2 rounded-xl text-ink hover:text-ink-muted hover:bg-surface-sunken transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h1 className="text-base font-bold text-ink">Live Face Verification</h1>
              <p className="text-[11px] font-medium text-purple-600">Automatic Biometric Verification</p>
            </div>
            <div className="w-8" />
          </div>
        </header>

        {/* Live Scan Viewport */}
        <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col justify-center space-y-5">
          <div className="bg-white rounded-2xl border border-line p-5 shadow-sm flex flex-col items-center justify-center space-y-4">
            
            {/* Circular Face Scanner Target Viewport */}
            <div className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden border-4 bg-slate-950 shadow-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
              scanStep === 'done'
                ? 'border-emerald-500 shadow-emerald-500/20'
                : scanStep === 'verifying'
                ? 'border-purple-500 shadow-purple-500/30'
                : isFaceInFrame
                ? 'border-emerald-400 shadow-emerald-400/40 ring-4 ring-emerald-400/30'
                : 'border-slate-700 shadow-slate-900/50'
            }`}>
              {scanStep === 'verifying' ? (
                <div className="flex flex-col items-center gap-3 p-4 text-center z-10">
                  <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                  <p className="text-sm font-bold text-white">Verifying Live Face...</p>
                  <p className="text-xs text-white/70">Connecting biometric profile</p>
                </div>
              ) : scanStep === 'done' ? (
                <div className="flex flex-col items-center gap-3 z-10">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                  <p className="text-base font-bold text-emerald-400">Face Verified!</p>
                </div>
              ) : faceCapturedImage ? (
                <img src={faceCapturedImage} alt="Captured Face" className="w-full h-full object-cover" />
              ) : cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover transform -scale-x-100"
                  />

                  {/* Face Tracking Guide Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                    {/* Face Oval Silhouette */}
                    <div className={`w-44 h-56 rounded-[50%] border-2 transition-all duration-300 ${
                      isFaceInFrame
                        ? 'border-emerald-400 shadow-[0_0_15px_#34d399]'
                        : 'border-dashed border-white/40'
                    }`} />
                    
                    {/* Countdown Badge overlay */}
                    {isFaceInFrame && detectionCountdown !== null && (
                      <div className="absolute bg-emerald-500/90 text-white font-black text-sm px-3.5 py-1.5 rounded-full shadow-lg backdrop-blur-sm animate-pulse flex items-center gap-1.5">
                        <SmileyFace className="w-4 h-4" />
                        Hold Still: {detectionCountdown}s
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 p-6 text-center">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                    <Camera className="w-8 h-8 text-purple-400" />
                  </div>
                  <p className="text-sm font-medium text-white/80">Position face inside the circle</p>
                </div>
              )}

              {/* Ping Ring Effect on Active Detection */}
              {cameraActive && isFaceInFrame && (
                <div className="absolute inset-0 pointer-events-none border-2 border-emerald-400 rounded-full animate-ping opacity-40" />
              )}
              <canvas ref={canvasRef} className="hidden" />
            </div>

            {/* Real-time Status Badge & Instructions */}
            <div className="text-center space-y-1 max-w-xs">
              {cameraActive && !faceCapturedImage && scanStep === 'ready' ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${
                      isFaceInFrame ? 'bg-emerald-500' : 'bg-amber-500'
                    }`} />
                    <span className={`text-xs font-bold ${
                      isFaceInFrame ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {isFaceInFrame
                        ? '✓ Face Detected! Auto-capturing...'
                        : detectionStatus === 'too_dark'
                        ? '⚠️ Lighting too dark. Move to bright area'
                        : detectionStatus === 'too_bright'
                        ? '⚠️ Lighting too bright. Adjust angle'
                        : 'Looking for human face...'}
                    </span>
                  </div>
                  <p className="text-xs text-ink-muted">
                    {isFaceInFrame
                      ? 'Hold still while your face is captured automatically.'
                      : 'Please look directly into the camera inside the circle.'}
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-sm font-bold text-ink">
                    {faceCapturedImage
                      ? 'Face Photo Captured'
                      : 'Instant Face Verification'}
                  </p>
                  <p className="text-xs text-ink-muted">
                    Unlocks Go Live, Party Rooms, Chat, and Moments automatically when your face is detected.
                  </p>
                </>
              )}
            </div>

            {error && (
              <div className="w-full p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="w-full p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-700 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                <span>{successMessage}</span>
              </div>
            )}

            {/* Controls */}
            <div className="w-full space-y-2.5 pt-2">
              {!faceCapturedImage ? (
                <>
                  {cameraActive ? (
                    <button
                      onClick={captureAndAutoVerify}
                      disabled={!isFaceInFrame || submitting}
                      className={`w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-md transition-all text-sm ${
                        isFaceInFrame
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.99] shadow-emerald-500/25'
                          : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      }`}
                    >
                      {submitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5" />
                      )}
                      {isFaceInFrame ? 'Capture & Verify Now' : 'Align Face to Capture'}
                    </button>
                  ) : (
                    <button
                      onClick={startCamera}
                      className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.99] font-bold text-white flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 transition-all text-sm"
                    >
                      <Camera className="w-5 h-5" /> Open Live Camera
                    </button>
                  )}

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={faceUploading || submitting}
                    className="w-full py-3 rounded-xl bg-surface-sunken hover:bg-surface-sunken/80 border border-line-strong text-xs font-semibold text-ink-muted hover:text-ink flex items-center justify-center gap-2 transition-all"
                  >
                    {faceUploading ? <Loader2 className="w-4 h-4 animate-spin text-purple-600" /> : <Upload className="w-4 h-4" />}
                    Or Upload Selfie Photo
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    hidden
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFaceFileUpload(file);
                      e.target.value = '';
                    }}
                  />
                </>
              ) : (
                <div className="space-y-2 w-full">
                  <button
                    onClick={() => handleFaceVerifySubmit()}
                    disabled={submitting}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.99] font-bold text-white flex items-center justify-center gap-2 shadow-md shadow-emerald-500/25 transition-all text-sm disabled:opacity-50"
                  >
                    {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                    {submitting ? 'Verifying Profile...' : 'Complete & Verify Face'}
                  </button>

                  <button
                    onClick={() => {
                      setFaceCapturedImage(null);
                      setScanStep('ready');
                      startCamera();
                    }}
                    disabled={submitting}
                    className="w-full py-2.5 text-xs font-semibold text-ink-muted hover:text-ink flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Retake Live Face
                  </button>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // MODE: NID FORM
  // ═════════════════════════════════════════════════════════════════════
  if (mode === 'nid_form') {
    return (
      <div className="min-h-screen bg-surface-soft text-ink pb-12">
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-line">
          <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto w-full">
            <button
              onClick={() => setMode('hub')}
              className="p-2 -ml-2 rounded-xl text-ink hover:text-ink-muted hover:bg-surface-sunken transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h1 className="text-base font-bold text-ink">NID / ID Verification</h1>
              <p className="text-[11px] font-medium text-amber-600">Unlock Trading & Financial Features</p>
            </div>
            <div className="w-8" />
          </div>
        </header>

        {/* Form Container */}
        <main className="max-w-md mx-auto px-4 py-4 space-y-4">
          {/* Identity Information */}
          <div className="bg-white rounded-2xl border border-line p-4 sm:p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-amber-500" /> Identity Information
            </h3>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5">Full Name (as on NID)</label>
              <input
                value={nidFullName}
                onChange={(e) => setNidFullName(e.target.value)}
                placeholder="Enter full legal name"
                className="w-full bg-surface-sunken/70 hover:bg-surface-sunken focus:bg-white border border-line-strong rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5">NID / ID Number</label>
              <input
                value={nidNumber}
                onChange={(e) => setNidNumber(e.target.value)}
                placeholder="e.g. 1994829102938"
                className="w-full bg-surface-sunken/70 hover:bg-surface-sunken focus:bg-white border border-line-strong rounded-xl px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5">Date of Birth</label>
              <input
                type="date"
                value={nidDob}
                onChange={(e) => setNidDob(e.target.value)}
                className="w-full bg-surface-sunken/70 hover:bg-surface-sunken focus:bg-white border border-line-strong rounded-xl px-3.5 py-2.5 text-sm text-ink focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-ink-muted mb-1.5">Document Type</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'nid', label: 'National ID (NID)' },
                  { id: 'smart_card', label: 'Smart NID Card' },
                  { id: 'passport', label: 'Passport' },
                  { id: 'driving_license', label: 'Driving License' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setNidDocType(item.id as any)}
                    className={`py-2 px-3 rounded-xl border text-xs font-semibold transition-all text-center ${
                      nidDocType === item.id
                        ? 'border-amber-500 bg-amber-50 text-amber-900 shadow-sm'
                        : 'border-line-strong bg-surface-sunken/70 text-ink-muted hover:bg-surface-sunken hover:text-ink'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Document Uploads */}
          <div className="bg-white rounded-2xl border border-line p-4 sm:p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-ink flex items-center gap-2">
              <Upload className="w-4 h-4 text-amber-500" /> Document Photos
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {renderUploadBox('front', 'NID Front Side', nidFrontUrl, frontInputRef)}
              {renderUploadBox('back', 'NID Back Side', nidBackUrl, backInputRef)}
            </div>

            {renderUploadBox('selfie', 'Holding NID Selfie (Optional)', nidSelfieUrl, selfieDocInputRef)}
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-medium text-red-700 flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{error}</span>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
              <span>{successMessage}</span>
            </div>
          )}

          <button
            onClick={handleNidSubmit}
            disabled={submitting || !nidFrontUrl || !nidBackUrl || !nidFullName.trim() || !nidNumber.trim()}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.99] font-bold text-white shadow-md shadow-amber-500/25 flex items-center justify-center gap-2 text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
            {submitting ? 'Submitting & Verifying...' : 'Submit & Verify NID'}
          </button>
        </main>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════
  // MODE: VERIFICATION HUB (DEFAULT)
  // ═════════════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-surface-soft text-ink pb-12">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto w-full">
          <button
            onClick={() => navigate(-1)}
            aria-label="Back"
            className="p-2 -ml-2 rounded-xl text-ink hover:text-ink-muted hover:bg-surface-sunken transition-colors"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink">Verification Center</h1>
          <div className="w-8" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-4 space-y-4">
        {/* Top Status Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4.5 sm:p-5 shadow-lg border border-slate-800">
          <div className="absolute top-0 right-0 w-36 h-36 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center gap-3.5">
            <div className="relative shrink-0">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-white/20 bg-black/40">
                <img
                  src={user?.avatar || 'https://via.placeholder.com/150'}
                  alt={user?.nickname}
                  className="w-full h-full object-cover"
                />
              </div>
              {(isFaceVerified || isNidVerified) && (
                <div className="absolute -bottom-1 -right-1 bg-sky-400 text-black rounded-full p-1 shadow-md">
                  <BadgeCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-bold text-white truncate">{user?.nickname}</h2>
                <span className="text-[11px] text-white/60 font-mono bg-white/10 px-2 py-0.5 rounded-md">ID: {user?.uid}</span>
              </div>
              <p className="text-xs text-white/80 mt-1 flex items-center gap-1 font-medium truncate">
                {isFaceVerified && isNidVerified
                  ? '🌟 Fully Verified (Social + Financial)'
                  : isFaceVerified
                  ? '✨ Live Face Verified'
                  : isNidVerified
                  ? '🪪 NID Verified'
                  : 'Unverified Account'}
              </p>
            </div>
          </div>

          {/* Verification Status Badges Row */}
          <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3.5 border-t border-white/10">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/10">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isFaceVerified ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-white/30'}`} />
              <span className="text-xs text-white/80 truncate">Face Scan</span>
              <span className={`text-xs font-semibold ml-auto shrink-0 ${isFaceVerified ? 'text-emerald-300' : 'text-white/50'}`}>
                {isFaceVerified ? 'Active ✓' : 'Not Set'}
              </span>
            </div>

            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-3 py-2 rounded-xl border border-white/10">
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isNidVerified ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : 'bg-white/30'}`} />
              <span className="text-xs text-white/80 truncate">NID ID</span>
              <span className={`text-xs font-semibold ml-auto shrink-0 ${isNidVerified ? 'text-amber-300' : 'text-white/50'}`}>
                {isNidVerified ? 'Active ✓' : 'Not Set'}
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CARD 1: LIVE FACE VERIFICATION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className={`rounded-2xl p-4 sm:p-5 border transition-all ${
          isFaceVerified
            ? 'bg-purple-50/40 border-purple-200'
            : 'bg-white border-line hover:border-purple-300 shadow-sm'
        }`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <Camera className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-base text-ink truncate">Live Face Verification</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 shrink-0">
                    Instant
                  </span>
                </div>
                <p className="text-xs text-ink-muted truncate">Automatic Profile & Creator Verification</p>
              </div>
            </div>

            {isFaceVerified ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            ) : (
              <span className="text-xs font-medium text-ink-muted bg-surface-sunken px-2.5 py-1 rounded-full shrink-0">
                Required
              </span>
            )}
          </div>

          <p className="text-xs text-ink-muted leading-relaxed mb-3.5">
            Verify with your live camera face scan to instantly unlock all social and broadcasting features:
          </p>

          {/* Unlocked Features List */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { icon: VideoCamera, title: 'Go Live', desc: 'Broadcast video & audio' },
              { icon: UserCheck, title: 'Party Rooms', desc: 'Host voice chat rooms' },
              { icon: ChatDots, title: 'Chat & Messages', desc: 'Message hosts & users' },
              { icon: Images, title: 'Post Moments', desc: 'Share photo posts' },
            ].map((feat) => (
              <div key={feat.title} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-soft border border-line">
                <feat.icon className={`w-4 h-4 shrink-0 ${isFaceVerified ? 'text-purple-600' : 'text-ink-muted'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink truncate">{feat.title}</p>
                  <p className="text-[10px] text-ink-faint truncate">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          {isFaceVerified ? (
            <div className="w-full py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700">
              <BadgeCheck className="w-4 h-4" /> Live Face Verified & Profile Active
            </div>
          ) : (
            <button
              onClick={() => {
                setMode('face_scan');
                startCamera();
              }}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-[0.99] font-bold flex items-center justify-center gap-2 text-sm text-white shadow-md shadow-purple-600/25 transition-all"
            >
              <Sparkle className="w-4 h-4" /> Verify Live Face (Instant)
            </button>
          )}
        </div>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* CARD 2: NID IDENTIFICATION */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <div className={`rounded-2xl p-4 sm:p-5 border transition-all ${
          isNidVerified
            ? 'bg-amber-50/40 border-amber-200'
            : 'bg-white border-line hover:border-amber-300 shadow-sm'
        }`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                <CreditCard className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-sm sm:text-base text-ink truncate">NID / ID Verification</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                    Financial
                  </span>
                </div>
                <p className="text-xs text-ink-muted truncate">Trading & Diamond Exchange</p>
              </div>
            </div>

            {isNidVerified ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" /> Verified
              </span>
            ) : (
              <span className="text-xs font-medium text-ink-muted bg-surface-sunken px-2.5 py-1 rounded-full shrink-0">
                Required
              </span>
            )}
          </div>

          <p className="text-xs text-ink-muted leading-relaxed mb-3.5">
            Submit your official government NID to unlock financial trading and diamond exchange:
          </p>

          {/* Unlocked Features List */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {[
              { icon: ArrowsLeftRight, title: 'Trade Coins', desc: 'Transfer & exchange coins' },
              { icon: Diamond, title: 'Buy Diamonds', desc: 'Agency & seller purchases' },
              { icon: Coins, title: 'Sell Diamonds', desc: 'Cash out & agent trading' },
              { icon: ShieldCheck, title: 'P2P Trading', desc: 'Verified trader access' },
            ].map((feat) => (
              <div key={feat.title} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-surface-soft border border-line">
                <feat.icon className={`w-4 h-4 shrink-0 ${isNidVerified ? 'text-amber-600' : 'text-ink-muted'}`} />
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-ink truncate">{feat.title}</p>
                  <p className="text-[10px] text-ink-faint truncate">{feat.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Action Button */}
          {isNidVerified ? (
            <div className="w-full py-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center gap-2 text-xs font-bold text-emerald-700">
              <BadgeCheck className="w-4 h-4" /> NID Verified & Trading Active
            </div>
          ) : (
            <button
              onClick={() => setMode('nid_form')}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.99] font-bold flex items-center justify-center gap-2 text-sm text-white shadow-md shadow-amber-500/25 transition-all"
            >
              <CreditCard className="w-4 h-4" /> Submit NID for Verification
            </button>
          )}
        </div>
      </main>
    </div>
  );
};
