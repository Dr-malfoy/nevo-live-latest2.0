export const startNativeParty = (roomName?: string) => {
  try {
    const bridge = (window as any).NevoNativeBridge || (window as any).NativeCallBridge;
    if (typeof bridge?.startOngoingParty === 'function') {
      bridge.startOngoingParty(roomName || 'Party Room');
    }
  } catch (e) {
    console.warn('[nativeParty] startOngoingParty error:', e);
  }
};

export const stopNativeParty = () => {
  try {
    const bridge = (window as any).NevoNativeBridge || (window as any).NativeCallBridge;
    if (typeof bridge?.stopOngoingParty === 'function') {
      bridge.stopOngoingParty();
    }
  } catch (e) {
    console.warn('[nativeParty] stopOngoingParty error:', e);
  }
};

export const enterNativePip = () => {
  try {
    const bridge = (window as any).NevoNativeBridge || (window as any).NativeCallBridge;
    if (typeof bridge?.enterPipMode === 'function') {
      bridge.enterPipMode();
    }
  } catch (e) {
    console.warn('[nativeParty] enterPipMode error:', e);
  }
};
