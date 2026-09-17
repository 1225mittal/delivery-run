let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioCtx = new Ctor();
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/** Request browser notification permission if not already granted. */
export function requestNotificationPermission(): void {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') {
    void Notification.requestPermission();
  }
}

/**
 * Plays a repeating two-tone alert beep for approximately 3 seconds.
 * Uses the Web Audio API so no audio file is needed.
 * Also fires a browser notification and vibration pattern so the
 * alert works even when the tab is in the background or screen is off.
 */
export function playNewOrderPing(orderCount = 1): void {
  // --- Audio beep ---
  const ctx = getAudioContext();
  if (ctx) {
    const beepDuration = 0.15;
    const gap = 0.12;
    const cycle = beepDuration * 2 + gap * 2;
    const totalCycles = Math.floor(3 / cycle);

    for (let i = 0; i < totalCycles; i++) {
      const t0 = ctx.currentTime + i * cycle;

      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, t0);
      gain1.gain.setValueAtTime(0, t0);
      gain1.gain.linearRampToValueAtTime(0.4, t0 + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, t0 + beepDuration);
      osc1.connect(gain1).connect(ctx.destination);
      osc1.start(t0);
      osc1.stop(t0 + beepDuration);

      const t1 = t0 + beepDuration + gap;
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(660, t1);
      gain2.gain.setValueAtTime(0, t1);
      gain2.gain.linearRampToValueAtTime(0.4, t1 + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, t1 + beepDuration);
      osc2.connect(gain2).connect(ctx.destination);
      osc2.start(t1);
      osc2.stop(t1 + beepDuration);
    }
  }

  // --- Browser notification (works when tab is in background) ---
  if ('Notification' in window && Notification.permission === 'granted') {
    const body = orderCount > 1
      ? `${orderCount} new orders assigned to you!`
      : 'New order assigned to you!';
    const notification = new Notification('New Delivery Order', {
      body,
      icon: '/icon-192.png',
      tag: 'new-order',
      requireInteraction: false,
    });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  }

  // --- Vibration (works on mobile when screen is off) ---
  if ('vibrate' in navigator) {
    // Vibrate for ~3 seconds: pulse pattern
    navigator.vibrate([200, 100, 200, 100, 200, 100, 200, 100, 200, 100, 200, 100, 200, 100, 200]);
  }
}
