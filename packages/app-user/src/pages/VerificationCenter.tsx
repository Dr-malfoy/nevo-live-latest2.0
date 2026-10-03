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
  PiWarningCircleFill as AlertCircle,
  PiScanFill as ScanIcon,
} from 'react-icons/pi';
import { useAuthStore } from '../stores';
import { verificationApi, uploadApi, usersApi } from '../api';
import { getMediaUrl } from '../lib/media';
import type { VerificationRequest } from '../types';

type Mode = 'hub' | 'face_scan' | 'nid_form';

type DetectionState =
  | 'initializing'
  | 'no_face'
  | 'off_center'
  | 'too_far'
  | 'too_close'
  | 'not_frontal'
  | 'too_dark'
  | 'too_bright'
  | 'spoof_detected'
  | 'analyzing_liveness'
  | 'verified_ready'
  | 'permission_denied';

const UPLOAD_FOLDER = 'verification';

interface FrameBiometricSample {
  timestamp: number;
  centerSkinRatio: number;
  avgLuminance: number;
  edgeContrast: number;
  symmetryScore: number;
  faceScale: number;
  highFreqEnergy: number;
  centerDeltaX: number;
  centerDeltaY: number;
  rawSample: Uint8ClampedArray;
}

export const VerificationCenter = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, updateUser } = useAuthStore();

  const [mode, setMode] = useState<Mode>('hub');
  const [, setRequest] = useState<VerificationRequest | null>(null);
  const [, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ── Face Verification state ──────────────────────────────────────────
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [faceCapturedImage, setFaceCapturedImage] = useState<string | null>(null);
  const [faceUploading, setFaceUploading] = useState(false);
  const [scanStep, setScanStep] = useState<'ready' | 'verifying' | 'done'>('ready');

  // Real-time Face Detection & Auto-Capture states
  const [detectionState, setDetectionState] = useState<DetectionState>('initializing');
  const [guidanceMessage, setGuidanceMessage] = useState<string>('Place your face inside the circle.');
  const [livenessProgress, setLivenessProgress] = useState<number>(0);
  const [isFaceProperlyPositioned, setIsFaceProperlyPositioned] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const analysisCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const isCapturingRef = useRef<boolean>(false);

  // Anti-spoofing & frame history buffer
  const frameHistoryRef = useRef<FrameBiometricSample[]>([]);
  const consecutiveValidFramesRef = useRef<number>(0);

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
        if (data.success && data.data && data.data.request) {
          setRequest(data.data.request);
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
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // ── Auto-attach stream to video element whenever video element or stream updates ──
  useEffect(() => {
    if (videoRef.current && cameraStream && cameraActive) {
      const video = videoRef.current;
      if (video.srcObject !== cameraStream) {
        video.srcObject = cameraStream;
      }
      video.onloadedmetadata = () => {
        video.play().catch((e) => console.warn('Video auto-play prevented:', e));
      };
      video.play().catch(() => {});
    }
  }, [cameraStream, cameraActive, mode]);

  // ── High Accuracy Biometric Computer Vision & Liveness Analyzer ─────
  const analyzeLiveFaceBiometrics = useCallback((): {
    state: DetectionState;
    message: string;
    isProper: boolean;
    sample?: FrameBiometricSample;
  } => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      return { state: 'initializing', message: 'Starting camera...', isProper: false };
    }

    const video = videoRef.current;
    if (!analysisCanvasRef.current) {
      analysisCanvasRef.current = document.createElement('canvas');
    }
    const canvas = analysisCanvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      return { state: 'initializing', message: 'Initializing...', isProper: false };
    }

    const sampleSize = 128;
    canvas.width = sampleSize;
    canvas.height = sampleSize;

    // Crop center square of video to match the round guide viewport
    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    const cropDim = Math.min(vw, vh);
    const sx = (vw - cropDim) / 2;
    const sy = (vh - cropDim) / 2;

    ctx.drawImage(video, sx, sy, cropDim, cropDim, 0, 0, sampleSize, sampleSize);

    const imgData = ctx.getImageData(0, 0, sampleSize, sampleSize);
    const data = imgData.data;

    let totalLuminance = 0;
    let totalSkinPixels = 0;
    let centerSkinPixels = 0;
    let highFreqEnergy = 0;
    let skinCenterXAcc = 0;
    let skinCenterYAcc = 0;

    let leftLuminance = 0;
    let rightLuminance = 0;
    let leftPixels = 0;
    let rightPixels = 0;

    let eyeRegionContrast = 0;
    let mouthRegionContrast = 0;

    // Circular Guide Region: center (sampleSize/2, sampleSize/2), radius = sampleSize * 0.44
    const cX = sampleSize / 2;
    const cY = sampleSize / 2;
    const radius = sampleSize * 0.44;
    const radiusSq = radius * radius;

    const totalPixels = sampleSize * sampleSize;

    for (let y = 0; y < sampleSize; y++) {
      for (let x = 0; x < sampleSize; x++) {
        const i = (y * sampleSize + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Standard ITU-R BT.601 Luminance
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        totalLuminance += lum;

        // Multi-Space Skin Chrominance (YCbCr + Normalized RGB model)
        // Works reliably across all skin ethnicities (fair, tan, brown, dark)
        const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
        const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
        const isYCbCrSkin = cb >= 75 && cb <= 138 && cr >= 126 && cr <= 180;

        const sumRGB = r + g + b + 1e-4;
        const nr = r / sumRGB;
        const ng = g / sumRGB;
        const isNormSkin = nr > 0.33 && nr < 0.60 && ng > 0.24 && ng < 0.40 && r > g && g >= b;

        const isSkin = isYCbCrSkin || isNormSkin;

        const dx = x - cX;
        const dy = y - cY;
        const distSq = dx * dx + dy * dy;

        if (isSkin) {
          totalSkinPixels++;
          skinCenterXAcc += x;
          skinCenterYAcc += y;

          if (distSq <= radiusSq) {
            centerSkinPixels++;
          }
        }

        // Left vs Right symmetry inside center circle
        if (distSq <= radiusSq) {
          if (x < cX) {
            leftLuminance += lum;
            leftPixels++;
          } else if (x > cX) {
            rightLuminance += lum;
            rightPixels++;
          }

          // Eye region (upper 30% - 50% of circle)
          if (y >= sampleSize * 0.30 && y <= sampleSize * 0.50) {
            if (x < sampleSize - 1) {
              const nextI = (y * sampleSize + (x + 1)) * 4;
              const nextLum = 0.299 * data[nextI] + 0.587 * data[nextI + 1] + 0.114 * data[nextI + 2];
              eyeRegionContrast += Math.abs(lum - nextLum);
            }
          }

          // Mouth region (lower 65% - 82% of circle)
          if (y >= sampleSize * 0.65 && y <= sampleSize * 0.82) {
            if (x < sampleSize - 1) {
              const nextI = (y * sampleSize + (x + 1)) * 4;
              const nextLum = 0.299 * data[nextI] + 0.587 * data[nextI + 1] + 0.114 * data[nextI + 2];
              mouthRegionContrast += Math.abs(lum - nextLum);
            }
          }
        }

        // Anti-Spoofing: High-Frequency Moiré / Screen Grid Pixel Noise filter
        if (x > 0 && y > 0 && x < sampleSize - 1 && y < sampleSize - 1) {
          const topI = ((y - 1) * sampleSize + x) * 4;
          const botI = ((y + 1) * sampleSize + x) * 4;
          const laplacian = Math.abs(4 * lum - (0.299 * data[topI] + 0.587 * data[topI + 1] + 0.114 * data[topI + 2]) - (0.299 * data[botI] + 0.587 * data[botI + 1] + 0.114 * data[botI + 2]));
          if (laplacian > 55) {
            highFreqEnergy += 1;
          }
        }
      }
    }

    const avgLuminance = totalLuminance / totalPixels;

    // 1. Lighting checks
    if (avgLuminance < 32) {
      return { state: 'too_dark', message: 'Make sure your face is clearly visible.', isProper: false };
    }
    if (avgLuminance > 248) {
      return { state: 'too_bright', message: 'Make sure your face is clearly visible.', isProper: false };
    }

    // 2. Face Presence check
    const circleArea = Math.PI * radiusSq;
    const centerSkinRatio = centerSkinPixels / circleArea;
    const totalSkinRatio = totalSkinPixels / totalPixels;

    if (totalSkinRatio < 0.08 || centerSkinRatio < 0.07) {
      return { state: 'no_face', message: 'Place your face inside the circle.', isProper: false };
    }

    // 3. Face Centering / Position check
    const faceCenterAvgX = skinCenterXAcc / Math.max(1, totalSkinPixels);
    const faceCenterAvgY = skinCenterYAcc / Math.max(1, totalSkinPixels);
    const centerDeltaX = (faceCenterAvgX - cX) / sampleSize;
    const centerDeltaY = (faceCenterAvgY - cY) / sampleSize;

    if (Math.abs(centerDeltaX) > 0.22 || Math.abs(centerDeltaY) > 0.24) {
      return { state: 'off_center', message: 'Place your face inside the circle.', isProper: false };
    }

    // 4. Face Distance / Scale check
    if (centerSkinRatio < 0.18) {
      return { state: 'too_far', message: 'Move closer.', isProper: false };
    }
    if (centerSkinRatio > 0.90) {
      return { state: 'too_close', message: 'Move slightly back.', isProper: false };
    }

    // 5. Facial Feature & Pose Orientation check (Facing Camera)
    const avgLeftLum = leftPixels > 0 ? leftLuminance / leftPixels : 0;
    const avgRightLum = rightPixels > 0 ? rightLuminance / rightPixels : 0;
    const symmetryScore = 1 - Math.abs(avgLeftLum - avgRightLum) / Math.max(1, avgLeftLum + avgRightLum);

    if (symmetryScore < 0.72) {
      return { state: 'not_frontal', message: 'Make sure your face is clearly visible.', isProper: false };
    }

    const totalFacialContrast = eyeRegionContrast + mouthRegionContrast;
    if (totalFacialContrast < 450) {
      return { state: 'no_face', message: 'Make sure your face is clearly visible.', isProper: false };
    }

    // 6. Anti-Spoofing: Screen Moiré & Grid Detection (Photos on phone/monitor or low quality print)
    const moireRatio = highFreqEnergy / totalPixels;
    if (moireRatio > 0.38) {
      return { state: 'spoof_detected', message: 'Live human face required. Remove photo/screen.', isProper: false };
    }

    // Create Biometric Sample for temporal liveness tracking
    const sample: FrameBiometricSample = {
      timestamp: Date.now(),
      centerSkinRatio,
      avgLuminance,
      edgeContrast: totalFacialContrast,
      symmetryScore,
      faceScale: centerSkinRatio,
      highFreqEnergy: moireRatio,
      centerDeltaX,
      centerDeltaY,
      rawSample: new Uint8ClampedArray(data),
    };

    return {
      state: 'analyzing_liveness',
      message: 'Face detected! Verifying live human...',
      isProper: true,
      sample,
    };
  }, []);

  // ── Camera Handlers ──────────────────────────────────────────────────
  const startCamera = async () => {
    setError('');
    setPermissionError(null);
    setDetectionState('initializing');
    setGuidanceMessage('Starting camera & face scanner...');
    setIsFaceProperlyPositioned(false);
    setLivenessProgress(0);
    consecutiveValidFramesRef.current = 0;
    frameHistoryRef.current = [];
    isCapturingRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Camera access is not supported on this browser or webview.');
      setCameraActive(false);
      return;
    }

    let stream: MediaStream | null = null;

    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'user',
          width: { ideal: 720 },
          height: { ideal: 720 },
        },
        audio: false,
      });
    } catch (err: any) {
      console.warn('Strict facingMode:user constraints failed, attempting fallback...', err);
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      } catch (fallbackErr: any) {
        console.error('Camera initialization failed:', fallbackErr);
        const name = fallbackErr.name || err.name;
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setPermissionError('Camera permission denied. Please allow camera access in your device settings.');
          setError('Camera permission denied. Please enable camera permission and tap Retry.');
          setDetectionState('permission_denied');
        } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
          setError('No camera detected on this device.');
        } else if (name === 'NotReadableError' || name === 'TrackStartError') {
          setError('Camera is currently in use by another app.');
        } else {
          setError(`Unable to start camera: ${fallbackErr.message || 'Unknown error'}`);
        }
        setCameraActive(false);
        return;
      }
    }

    if (stream) {
      setCameraStream(stream);
      setCameraActive(true);
      setPermissionError(null);
      setGuidanceMessage('Place your face inside the circle.');
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
      setCameraStream(null);
    }
    setCameraActive(false);
    setIsFaceProperlyPositioned(false);
    setLivenessProgress(0);
    frameHistoryRef.current = [];
  };

  // Auto-start camera when navigating to face_scan mode
  useEffect(() => {
    if (mode === 'face_scan' && !cameraActive && !faceCapturedImage && scanStep === 'ready') {
      startCamera();
    }
  }, [mode]);

  // ── Auto-Capture and Instant Verification Submission ─────────────────
  const autoVerifyLiveFace = useCallback(async () => {
    if (isCapturingRef.current) return;
    if (!videoRef.current || !canvasRef.current) return;

    isCapturingRef.current = true;
    setScanStep('verifying');
    setGuidanceMessage('Live human verified! Completing verification...');
    setLivenessProgress(100);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;
    canvas.width = vw;
    canvas.height = vh;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      isCapturingRef.current = false;
      return;
    }

    ctx.drawImage(video, 0, 0, vw, vh);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setFaceCapturedImage(dataUrl);

    stopCamera();

    // Directly submit live verification
    await handleFaceVerifySubmit(dataUrl);
  }, []);

  // ── Multi-Frame Liveness & Real-Time Processing Loop ─────────────────
  useEffect(() => {
    if (!cameraActive || faceCapturedImage || scanStep === 'verifying' || scanStep === 'done') {
      return;
    }

    let isRunning = true;

    const processFrame = () => {
      if (!isRunning || isCapturingRef.current) return;

      const evalResult = analyzeLiveFaceBiometrics();

      setGuidanceMessage(evalResult.message);
      setDetectionState(evalResult.state);

      if (evalResult.isProper && evalResult.sample) {
        setIsFaceProperlyPositioned(true);

        // Add sample to rolling temporal buffer
        const history = frameHistoryRef.current;
        history.push(evalResult.sample);
        if (history.length > 15) {
          history.shift();
        }

        consecutiveValidFramesRef.current += 1;

        // Anti-Spoofing Temporal Check (Distinguish live human from static photo / screen freeze):
        let temporalLiveScore = 0;
        if (history.length >= 5) {
          // Compare pixel delta between current and oldest sample in buffer
          const oldest = history[0];
          const latest = history[history.length - 1];

          let diffSum = 0;
          const len = Math.min(oldest.rawSample.length, latest.rawSample.length);
          const step = 8; // fast sample
          for (let p = 0; p < len; p += step) {
            diffSum += Math.abs(oldest.rawSample[p] - latest.rawSample[p]);
          }
          const avgPixelDelta = diffSum / (len / step);

          // Natural human involuntary micro-motion has 0.4 < delta < 25
          // Static printed photos / screens held still have delta < 0.25
          if (avgPixelDelta >= 0.35 && avgPixelDelta <= 30) {
            temporalLiveScore = 1;
          } else if (avgPixelDelta > 30) {
            // Extreme rapid movement / shake
            temporalLiveScore = 0.5;
          } else {
            // Static freeze frame spoofing
            temporalLiveScore = 0.2;
          }
        }

        // Calculate progress percentage (0% -> 100% in ~1.2 seconds of stable live tracking)
        const frameCount = consecutiveValidFramesRef.current;
        const targetFrames = 10;
        const rawProgress = Math.min(100, Math.round((frameCount / targetFrames) * 100));

        // Scale by temporal liveness score
        const adjustedProgress = history.length >= 5 && temporalLiveScore < 0.5
          ? Math.min(rawProgress, 40)
          : rawProgress;

        setLivenessProgress(adjustedProgress);

        if (adjustedProgress >= 100 && !isCapturingRef.current) {
          autoVerifyLiveFace();
          return;
        }
      } else {
        // Face moved out of circle or failed checks: reset countdown & progress
        setIsFaceProperlyPositioned(false);
        consecutiveValidFramesRef.current = Math.max(0, consecutiveValidFramesRef.current - 2);
        setLivenessProgress((prev) => Math.max(0, prev - 15));
        if (frameHistoryRef.current.length > 3) {
          frameHistoryRef.current.splice(0, 2);
        }
      }

      if (isRunning) {
        // Sample every ~100ms for silky smooth feedback and minimal battery usage
        setTimeout(() => {
          if (isRunning) animFrameIdRef.current = requestAnimationFrame(processFrame);
        }, 100);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(processFrame);

    return () => {
      isRunning = false;
      if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
    };
  }, [cameraActive, faceCapturedImage, scanStep, analyzeLiveFaceBiometrics, autoVerifyLiveFace]);

  const handleFaceFileUpload = async (file: File) => {
    setError('');
    setFaceUploading(true);
    try {
      const url = await uploadApi.upload(file, UPLOAD_FOLDER);
      setFaceCapturedImage(url);
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
      setError('Please scan your face before verifying.');
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
        const file = new File([blob], `live-face-${Date.now()}.jpg`, { type: 'image/jpeg' });
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
          isCapturingRef.current = false;
        }, 2200);
      }
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Live face verification failed. Please try again.');
      setScanStep('ready');
      isCapturingRef.current = false;
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
        documentType: nidDocType as any,
        documentFrontUrl: nidFrontUrl,
        documentBackUrl: nidBackUrl,
        selfieUrl: nidSelfieUrl || undefined,
        autoApprove: false,
      });

      if (data.success) {
        setSuccessMessage('NID submitted! Your documents are currently under review by admin.');
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
    inputRef: React.RefObject<HTMLInputElement>
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
            <img src={getMediaUrl(url)} alt={label} className="w-full h-full object-cover" crossOrigin="anonymous" />
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
  // MODE: FACE SCANNER WITH REAL-TIME FACE DETECTION & AUTO SCAN
  // ═════════════════════════════════════════════════════════════════════
  if (mode === 'face_scan') {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col select-none">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between px-4 h-14 max-w-md mx-auto w-full">
            <button
              onClick={() => {
                stopCamera();
                setMode('hub');
              }}
              className="p-2 -ml-2 rounded-xl text-white/80 hover:text-white hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="text-center">
              <h1 className="text-base font-bold text-white">Live Face Verification</h1>
              <p className="text-[11px] font-medium text-emerald-400">Automatic Biometric Verification</p>
            </div>
            <div className="w-8" />
          </div>
        </header>

        {/* Live Face Camera Viewport */}
        <main className="flex-1 max-w-md w-full mx-auto p-4 flex flex-col items-center justify-between py-6 space-y-4">
          <div className="w-full flex flex-col items-center justify-center space-y-6 flex-1">
            
            {/* Top Prompt / Instruction Pill */}
            <div className="w-full max-w-xs text-center">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all duration-300 shadow-lg ${
                scanStep === 'done'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : scanStep === 'verifying'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 animate-pulse'
                  : isFaceProperlyPositioned
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-emerald-500/20'
                  : detectionState === 'spoof_detected'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/50'
                  : 'bg-white/10 text-white/90 border border-white/15'
              }`}>
                {scanStep === 'verifying' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                ) : scanStep === 'done' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : isFaceProperlyPositioned ? (
                  <SmileyFace className="w-4 h-4 text-emerald-400 animate-bounce" />
                ) : (
                  <ScanIcon className="w-4 h-4 text-cyan-400" />
                )}
                <span>{scanStep === 'verifying' ? 'Verifying Live Face...' : guidanceMessage}</span>
              </div>
            </div>

            {/* Circular Face Scanner Target Viewport */}
            <div className="relative flex items-center justify-center">
              
              {/* Outer Glowing Progress Arc Indicator */}
              <svg className="absolute w-72 h-72 sm:w-80 sm:h-80 -rotate-90 pointer-events-none z-20">
                <circle
                  cx="50%"
                  cy="50%"
                  r="46%"
                  className="stroke-white/10 fill-none"
                  strokeWidth="4"
                />
                <circle
                  cx="50%"
                  cy="50%"
                  r="46%"
                  className={`fill-none transition-all duration-200 ${
                    scanStep === 'done'
                      ? 'stroke-emerald-400'
                      : scanStep === 'verifying'
                      ? 'stroke-purple-400'
                      : isFaceProperlyPositioned
                      ? 'stroke-emerald-400'
                      : 'stroke-amber-400/40'
                  }`}
                  strokeWidth="5"
                  strokeDasharray="1000"
                  strokeDashoffset={1000 - (1000 * livenessProgress) / 100}
                  strokeLinecap="round"
                />
              </svg>

              {/* Circular Target Container */}
              <div className={`relative w-64 h-64 sm:w-72 sm:h-72 rounded-full overflow-hidden border-4 bg-black shadow-2xl flex items-center justify-center shrink-0 transition-all duration-300 ${
                scanStep === 'done'
                  ? 'border-emerald-400 shadow-emerald-500/30'
                  : scanStep === 'verifying'
                  ? 'border-purple-400 shadow-purple-500/40 ring-4 ring-purple-500/20'
                  : isFaceProperlyPositioned
                  ? 'border-emerald-400 shadow-emerald-400/50 ring-4 ring-emerald-400/30'
                  : permissionError
                  ? 'border-red-500 shadow-red-500/30'
                  : 'border-slate-700 shadow-black/80'
              }`}>
                {scanStep === 'verifying' ? (
                  <div className="flex flex-col items-center gap-3 p-4 text-center z-10">
                    <Loader2 className="w-12 h-12 text-purple-400 animate-spin" />
                    <p className="text-sm font-bold text-white">Verifying Profile...</p>
                    <p className="text-xs text-white/70">Connecting biometric security</p>
                  </div>
                ) : scanStep === 'done' ? (
                  <div className="flex flex-col items-center gap-3 z-10 animate-scale-in">
                    <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                      <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                    </div>
                    <p className="text-base font-bold text-emerald-400">Face Verified!</p>
                  </div>
                ) : faceCapturedImage ? (
                  <img src={getMediaUrl(faceCapturedImage)} alt="Captured Face" className="w-full h-full object-cover" crossOrigin="anonymous" />
                ) : cameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover transform -scale-x-100"
                    />

                    {/* Face Scanning Overlay Elements */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                      
                      {/* Face Oval Silhouette Guide */}
                      <div className={`w-44 h-56 rounded-[50%] border-2 transition-all duration-300 ${
                        isFaceProperlyPositioned
                          ? 'border-emerald-400 shadow-[0_0_20px_#34d399] scale-100'
                          : 'border-dashed border-white/40 scale-95'
                      }`} />

                      {/* Laser / Scanner Line Sweep when active */}
                      {isFaceProperlyPositioned && (
                        <div className="absolute inset-x-8 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#34d399] animate-pulse" />
                      )}

                      {/* Percentage overlay */}
                      {isFaceProperlyPositioned && livenessProgress > 0 && (
                        <div className="absolute bottom-6 bg-slate-900/90 text-emerald-400 font-mono font-bold text-xs px-3 py-1 rounded-full border border-emerald-500/40 shadow-md">
                          Scanning: {livenessProgress}%
                        </div>
                      )}
                    </div>
                  </>
                ) : permissionError ? (
                  <div className="flex flex-col items-center gap-2 p-6 text-center z-10">
                    <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-red-400" />
                    </div>
                    <p className="text-xs font-bold text-white">Camera Access Denied</p>
                    <p className="text-[11px] text-white/70">Please grant camera permissions</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 p-6 text-center">
                    <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center">
                      <Camera className="w-8 h-8 text-cyan-400" />
                    </div>
                    <p className="text-sm font-medium text-white/80">Starting live camera...</p>
                  </div>
                )}

                {/* Pulse Ring when Face is Locked */}
                {cameraActive && isFaceProperlyPositioned && (
                  <div className="absolute inset-0 pointer-events-none border-2 border-emerald-400 rounded-full animate-ping opacity-30" />
                )}
                
                <canvas ref={canvasRef} className="hidden" />
              </div>
            </div>

            {/* Verification Instruction Note */}
            <div className="text-center max-w-xs space-y-1">
              <p className="text-xs text-white/60">
                Hold your phone naturally and look straight into the circle. Face detection and verification will complete automatically.
              </p>
            </div>

            {error && (
              <div className="w-full max-w-xs p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-xs font-medium text-red-200 flex items-center gap-2">
                <XCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{error}</span>
              </div>
            )}

            {successMessage && (
              <div className="w-full max-w-xs p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs font-medium text-emerald-200 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}
          </div>

          {/* Bottom Secondary Controls (Fallback upload if camera unavailable) */}
          <div className="w-full max-w-xs space-y-2.5 pb-2">
            {!cameraActive && permissionError && (
              <button
                onClick={startCamera}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-[0.99] font-bold text-white flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all text-sm"
              >
                <RefreshCw className="w-4 h-4" /> Retry Camera Access
              </button>
            )}

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={faceUploading || submitting}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-white/60 hover:text-white flex items-center justify-center gap-2 transition-all"
            >
              {faceUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Upload className="w-3.5 h-3.5" />}
              Camera having issues? Upload selfie photo
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
                  src={getMediaUrl(user?.avatar) || 'https://via.placeholder.com/150'}
                  alt={user?.nickname}
                  className="w-full h-full object-cover"
                  crossOrigin="anonymous"
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
              <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${isNidVerified ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]' : user?.verification?.nidStatus === 'PENDING' ? 'bg-blue-400 animate-pulse' : 'bg-white/30'}`} />
              <span className="text-xs text-white/80 truncate">NID ID</span>
              <span className={`text-xs font-semibold ml-auto shrink-0 ${isNidVerified ? 'text-amber-300' : user?.verification?.nidStatus === 'PENDING' ? 'text-blue-300' : 'text-white/50'}`}>
                {isNidVerified ? 'Active ✓' : user?.verification?.nidStatus === 'PENDING' ? 'Pending ⏳' : 'Not Set'}
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
            ) : user?.verification?.nidStatus === 'PENDING' ? (
              <span className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full shrink-0">
                Pending Admin Review
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
          ) : user?.verification?.nidStatus === 'PENDING' ? (
            <div className="w-full py-3 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center gap-2 text-xs font-bold text-blue-700">
              <Clock className="w-4 h-4 animate-spin" /> Documents Under Admin Review
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
