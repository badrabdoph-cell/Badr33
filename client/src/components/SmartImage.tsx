import React from "react";
import { cn } from "@/lib/utils";

type SmartImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean; // لو true: eager + fetchPriority high
  sizes?: string;     // مهم للموبايل
};

export default function SmartImage({
  priority = false,
  sizes,
  className,
  loading,
  decoding,
  ...props
}: SmartImageProps) {
  return (
    <img
      {...props}
      className={cn("block max-w-full h-auto", className)}
      loading={loading ?? (priority ? "eager" : "lazy")}
      decoding={decoding ?? "async"}
      // React يدعمها كده:
      fetchPriority={(priority ? "high" : "auto") as any}
      sizes={sizes}
    />
  );
}
