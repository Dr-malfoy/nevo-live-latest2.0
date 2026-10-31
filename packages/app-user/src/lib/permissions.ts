/**
 * Request and verify microphone and camera permissions before starting calls.
 */
export async function requestMediaPermissions(
  type: 'audio' | 'video'
): Promise<{ granted: boolean; error?: string }> {
  if (!navigator?.mediaDevices?.getUserMedia) {
    return {
      granted: false,
      error: 'Media devices are not supported on this browser or environment.',
    };
  }

  const constraints: MediaStreamConstraints = {
    audio: true,
    video: type === 'video',
  };

  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    // Release probe stream immediately
    stream.getTracks().forEach((t) => t.stop());
    return { granted: true };
  } catch (err: any) {
    let name = err?.name || '';
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      // Driver might still be releasing previous call session, wait and retry once
      await new Promise((r) => setTimeout(r, 250));
      try {
        const retryStream = await navigator.mediaDevices.getUserMedia(constraints);
        retryStream.getTracks().forEach((t) => t.stop());
        return { granted: true };
      } catch (retryErr: any) {
        err = retryErr;
        name = retryErr?.name || '';
      }
    }
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return {
        granted: false,
        error:
          type === 'video'
            ? 'Camera and microphone permissions are required for video calls. Please enable them in your settings.'
            : 'Microphone permission is required for audio calls. Please enable it in your settings.',
      };
    } else if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return {
        granted: false,
        error:
          type === 'video'
            ? 'No camera or microphone was found on this device.'
            : 'No microphone was found on this device.',
      };
    } else if (name === 'NotReadableError' || name === 'TrackStartError') {
      return {
        granted: false,
        error: 'Your microphone or camera is currently being used by another application.',
      };
    }
    return {
      granted: false,
      error: err?.message || 'Failed to get media permissions',
    };
  }
}
