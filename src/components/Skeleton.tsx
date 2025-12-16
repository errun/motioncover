/**
 * 骨架屏组件
 * 用于加载状态显示
 */

import { cn } from '@/lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-white/10',
        className
      )}
    />
  );
}

/**
 * 歌曲卡片骨架屏
 */
export function TrackCardSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5">
      {/* 专辑封面 */}
      <Skeleton className="w-16 h-16 rounded" />
      
      {/* 歌曲信息 */}
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  );
}

/**
 * Canvas 页面骨架屏
 */
export function CanvasPageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* 艺术家信息 */}
      <div className="flex items-center gap-4 p-6 rounded-xl bg-white/5">
        <Skeleton className="w-20 h-20 rounded-full" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-6 w-1/2" />
          <div className="flex items-center gap-3">
            <Skeleton className="w-14 h-14 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        </div>
      </div>
      
      {/* Canvas 预览 */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="aspect-[9/16] max-w-sm mx-auto rounded-xl" />
      </div>
      
      {/* 下载按钮 */}
      <div className="flex justify-center">
        <Skeleton className="h-12 w-48 rounded-full" />
      </div>
    </div>
  );
}

/**
 * 搜索结果骨架屏
 */
export function SearchResultsSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <TrackCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * 艺术家页面骨架屏
 */
export function ArtistPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto p-4 space-y-8">
      {/* 艺术家头部 */}
      <div className="flex items-center gap-6">
        <Skeleton className="w-32 h-32 rounded-full" />
        <div className="space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      
      {/* 热门歌曲 */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        {[...Array(5)].map((_, i) => (
          <TrackCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

export default Skeleton;

