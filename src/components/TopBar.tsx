'use client';

interface Props {
  fetchedAt: string | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export default function TopBar({ fetchedAt, isLoading, onRefresh }: Props) {
  const formattedTime = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString('ja-JP', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null;

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-4 flex-shrink-0 shadow-sm z-50">
      {/* ロゴ */}
      <div className="flex items-center gap-2">
        <span className="text-[#E63946] text-xl font-black tracking-tight">USJ</span>
        <span className="text-gray-700 text-sm font-semibold">混雑マップ</span>
      </div>

      <div className="flex-1" />

      {/* 最終更新時刻 */}
      {formattedTime && (
        <span className="text-xs text-gray-500 hidden sm:block">
          最終更新: {formattedTime}
        </span>
      )}

      {/* 更新ボタン */}
      <button
        onClick={onRefresh}
        disabled={isLoading}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {isLoading ? (
          <svg className="animate-spin w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="w-3.5 h-3.5 text-gray-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        )}
        更新
      </button>

      {/* 免責 + 必須クレジット */}
      <div className="hidden md:flex items-center gap-3">
        <span className="text-[10px] text-gray-400">
          参考情報・公式データではありません
        </span>
        <a
          href="https://queue-times.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[10px] text-blue-500 hover:underline"
        >
          Powered by Queue-Times.com
        </a>
      </div>
    </header>
  );
}
