interface ClassicLoaderProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export default function ClassicLoader({ size = "md", className = "" }: ClassicLoaderProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-10 w-10 border-4",
    lg: "h-16 w-16 border-4",
  };

  return (
    <div className={`border-primary animate-spin rounded-full border-t-transparent ${sizeClasses[size]} ${className}`}></div>
  );
}
