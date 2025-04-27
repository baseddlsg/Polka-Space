import React, { useEffect, useRef } from 'react';

const READY_PLAYER_ME_URL = 'https://demo.readyplayer.me/avatar';

export const ReadyPlayerMeAvatar: React.FC<{ onAvatarExport: (url: string) => void }> = ({ onAvatarExport }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      // Only accept messages from Ready Player Me
      if (event.origin !== 'https://demo.readyplayer.me') return;
      const { data } = event;
      if (typeof data === 'string' && data.startsWith('avatarExported')) {
        // The URL of the GLB file is after the colon
        const url = data.split(':')[1];
        onAvatarExport(url);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onAvatarExport]);

  return (
    <iframe
      ref={iframeRef}
      title="Ready Player Me Avatar Creator"
      src={READY_PLAYER_ME_URL}
      style={{ width: '100%', height: 600, border: 'none' }}
      allow="camera *; microphone *"
    />
  );
}; 