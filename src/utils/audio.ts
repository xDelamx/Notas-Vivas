export const playSuccessSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(523.25, now); // C5
    osc.frequency.setValueAtTime(659.25, now + 0.1); // E5
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {
    console.error("Erro ao tocar som de sucesso:", e);
  }
};

export const playAlertSound = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const audioCtx = new AudioContext();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'triangle';
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(440, now); // A4
    osc.frequency.setValueAtTime(880, now + 0.2); // A5
    osc.frequency.setValueAtTime(440, now + 0.4); // A4
    osc.frequency.setValueAtTime(880, now + 0.6); // A5
    
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.1);
    gainNode.gain.linearRampToValueAtTime(0.4, now + 0.7);
    gainNode.gain.linearRampToValueAtTime(0, now + 0.8);
    
    osc.start(now);
    osc.stop(now + 0.8);
  } catch (e) {
    console.error("Erro ao tocar som de alerta:", e);
  }
};
