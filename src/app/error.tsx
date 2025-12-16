'use client';

/**
 * 全局错误边界
 * 捕获并处理未处理的错误
 */

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 记录错误到控制台或分析服务
    console.error('Application error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 bg-black">
      <div className="text-center max-w-md">
        {/* 错误图标 */}
        <div className="mb-6">
          <svg
            className="w-20 h-20 mx-auto text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* 错误标题 */}
        <h1 className="text-2xl font-bold text-white mb-2">
          Something went wrong
        </h1>

        {/* 错误描述 */}
        <p className="text-gray-400 mb-6">
          An unexpected error occurred. Please try again or go back to the home page.
        </p>

        {/* 错误详情（开发环境） */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mb-6 p-4 bg-red-500/10 rounded-lg text-left">
            <p className="text-red-400 text-sm font-mono break-all">
              {error.message}
            </p>
            {error.digest && (
              <p className="text-gray-500 text-xs mt-2">
                Error ID: {error.digest}
              </p>
            )}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="px-6 py-3 bg-[#1db954] text-white font-semibold rounded-full hover:bg-[#1ed760] transition-colors"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-6 py-3 bg-white/10 text-white font-semibold rounded-full hover:bg-white/20 transition-colors"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

