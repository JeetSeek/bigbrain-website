import React from 'react';

const shimmer = 'animate-pulse bg-gray-200 rounded';

export const SkeletonLine = ({ width = '100%', height = '14px', className = '' }) => (
  <div className={`${shimmer} ${className}`} style={{ width, height }} />
);

export const SkeletonCard = ({ className = '' }) => (
  <div className={`p-4 border border-gray-100 rounded-xl space-y-3 ${className}`}>
    <SkeletonLine width="60%" height="18px" />
    <SkeletonLine width="40%" height="12px" />
    <div className="flex gap-2 mt-2">
      <SkeletonLine width="60px" height="22px" className="rounded-full" />
      <SkeletonLine width="70px" height="22px" className="rounded-full" />
    </div>
    <div className="flex gap-3 mt-3">
      <SkeletonLine width="50%" height="40px" className="rounded-lg" />
      <SkeletonLine width="50%" height="40px" className="rounded-lg" />
    </div>
  </div>
);

export const SkeletonList = ({ count = 4, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonChat = ({ count = 3 }) => (
  <div className="space-y-4 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
        <div className={`space-y-2 ${i % 2 === 0 ? 'max-w-[75%]' : 'max-w-[60%]'}`}>
          <SkeletonLine width={i % 2 === 0 ? '200px' : '150px'} height="16px" />
          <SkeletonLine width={i % 2 === 0 ? '280px' : '120px'} height="14px" />
          {i % 2 === 0 && <SkeletonLine width="220px" height="14px" />}
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonToolPage = () => (
  <div className="p-4 space-y-4">
    <SkeletonLine width="50%" height="24px" />
    <SkeletonLine width="100%" height="44px" className="rounded-lg" />
    <SkeletonLine width="100%" height="44px" className="rounded-lg" />
    <SkeletonLine width="100%" height="44px" className="rounded-lg" />
    <SkeletonLine width="40%" height="44px" className="rounded-lg mt-4" />
  </div>
);

export default { SkeletonLine, SkeletonCard, SkeletonList, SkeletonChat, SkeletonToolPage };
