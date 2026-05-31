'use client';

import dynamic from 'next/dynamic';

// Leaflet は window に依存するため SSR 無効化必須
export default dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="animate-pulse text-gray-500 text-sm">地図を読み込み中...</div>
    </div>
  ),
});
