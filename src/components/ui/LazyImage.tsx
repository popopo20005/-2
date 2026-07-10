/**
 * LazyImage - 遅延ロード画像コンポーネント
 *
 * Task#22: パフォーマンス最適化
 *
 * 機能:
 * - Intersection Observer APIを使用した遅延ロード
 * - 低解像度プレースホルダー（LQIP）
 * - WebP対応（フォールバック付き）
 * - ロード状態の管理
 */

import { useState, useEffect, useRef } from 'react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  width?: number;
  height?: number;
  webpSrc?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  className = '',
  placeholder,
  width,
  height,
  webpSrc,
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (!imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // 50px前からロード開始
      }
    );

    observer.observe(imgRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  return (
    <div
      ref={imgRef}
      className={`lazy-image-wrapper ${className}`}
      style={{
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* プレースホルダー */}
      {!isLoaded && placeholder && (
        <img
          src={placeholder}
          alt=""
          className="absolute inset-0 w-full h-full object-cover blur-sm"
          aria-hidden="true"
        />
      )}

      {/* スケルトンローダー */}
      {!isLoaded && !placeholder && (
        <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse" />
      )}

      {/* メイン画像 */}
      {isInView && !hasError && (
        <picture>
          {/* WebPフォーマット（対応ブラウザのみ） */}
          {webpSrc && <source srcSet={webpSrc} type="image/webp" />}

          {/* フォールバック画像 */}
          <img
            src={src}
            alt={alt}
            width={width}
            height={height}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            loading="lazy"
          />
        </picture>
      )}

      {/* エラー表示 */}
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
          <span className="text-gray-400 dark:text-gray-500 text-sm">
            画像の読み込みに失敗しました
          </span>
        </div>
      )}
    </div>
  );
}

/**
 * 背景画像用の遅延ロードコンポーネント
 */
interface LazyBackgroundProps {
  src: string;
  children?: React.ReactNode;
  className?: string;
  placeholder?: string;
}

export function LazyBackground({
  src,
  children,
  className = '',
  placeholder,
}: LazyBackgroundProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px',
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.src = src;
    img.onload = () => setIsLoaded(true);
  }, [isInView, src]);

  return (
    <div
      ref={ref}
      className={`lazy-background ${className}`}
      style={{
        backgroundImage: isLoaded
          ? `url(${src})`
          : placeholder
          ? `url(${placeholder})`
          : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        transition: 'background-image 0.3s ease-in-out',
      }}
    >
      {children}
    </div>
  );
}

/**
 * 使用例:
 *
 * // 基本的な使い方
 * <LazyImage
 *   src="/images/hero.jpg"
 *   alt="Hero image"
 *   width={800}
 *   height={600}
 * />
 *
 * // WebP対応
 * <LazyImage
 *   src="/images/hero.jpg"
 *   webpSrc="/images/hero.webp"
 *   alt="Hero image"
 * />
 *
 * // プレースホルダー付き
 * <LazyImage
 *   src="/images/hero.jpg"
 *   placeholder="/images/hero-placeholder.jpg"
 *   alt="Hero image"
 * />
 *
 * // 背景画像
 * <LazyBackground src="/images/bg.jpg">
 *   <h1>Content over background</h1>
 * </LazyBackground>
 */
