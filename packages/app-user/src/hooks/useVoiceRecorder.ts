import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Press-and-hold voice recorder.
 * Records via MediaRecorder (webm/opus), surfaces duration + a cancel,
 * and returns the blob for upload.
 */
export const useVoiceRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const startTimeRef = useRef(0);

  const cleanup = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = undefined;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
  }, []);

  const startRecording = useCallback(async () => {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
          ? 'audio/mp4'
          : '';

      const recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onerror = () => {
        setError('Recording failed');
        setRecording(false);
        cleanup();
      };

      recorder.start();
      startTimeRef.current = Date.now();
      setRecording(true);
      setDuration(0);

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);
    } catch {
      setError('Microphone permission denied');
    }
  }, [cleanup]);

  /** Stop and return the audio blob + duration, or null if cancelled/empty. */
  const stopRecording = useCallback((): Promise<{ blob: Blob; duration: number } | null> => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        cleanup();
        setRecording(false);
        resolve(null);
        return;
      }
      const finalDuration = Math.max(1, Math.floor((Date.now() - startTimeRef.current) / 1000));

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        cleanup();
        setRecording(false);
        resolve(blob.size > 0 ? { blob, duration: finalDuration } : null);
      };
      recorder.stop();
    });
  }, [cleanup]);

  const cancelRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.ondataavailable = null;
      recorder.onstop = null;
      try { recorder.stop(); } catch { /* noop */ }
    }
    cleanup();
    setRecording(false);
    setDuration(0);
  }, [cleanup]);

  useEffect(() => () => cleanup(), [cleanup]);

  return { recording, duration, error, startRecording, stopRecording, cancelRecording };
};
