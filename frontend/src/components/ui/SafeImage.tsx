import { useState, useEffect, type ReactNode, type ImgHTMLAttributes } from "react";

type SafeImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src?: string | null;
  /** Rendered instead of the image when src is missing OR the image fails to
   *  load (e.g. an expired signed URL). Keeps a graceful placeholder on screen
   *  rather than the browser's broken-image icon. */
  fallback?: ReactNode;
};

/**
 * Drop-in <img> replacement that degrades gracefully. Bucket-backed images are
 * served via short-lived signed URLs; if one expires before the page refetches,
 * a plain <img> would show a broken icon. SafeImage shows `fallback` instead.
 */
export function SafeImage({ src, fallback = null, alt = "", ...rest }: SafeImageProps) {
  const [errored, setErrored] = useState(false);

  // Reset the error state whenever the source changes (a fresh signed URL after
  // a refetch should be given a chance to load).
  useEffect(() => {
    setErrored(false);
  }, [src]);

  if (!src || errored) {
    return <>{fallback}</>;
  }

  return <img src={src} alt={alt} onError={() => setErrored(true)} {...rest} />;
}
