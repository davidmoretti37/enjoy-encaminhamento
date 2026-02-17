import { useRef, useCallback, useEffect, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { Button } from "@/components/ui/button";
import { Eraser } from "lucide-react";

interface SignaturePadProps {
  onSave: (signature: string) => void;
}

export default function SignaturePad({ onSave }: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 500, height: 150 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        setCanvasSize({ width: w, height: 150 });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const handleClear = useCallback(() => {
    sigPadRef.current?.clear();
    onSave("");
  }, [onSave]);

  const handleEnd = useCallback(() => {
    if (sigPadRef.current) {
      const dataUrl = sigPadRef.current.toDataURL("image/png");
      onSave(dataUrl);
    }
  }, [onSave]);

  return (
    <div className="space-y-2">
      <div ref={containerRef} className="border-2 border-dashed border-gray-300 rounded-lg bg-white overflow-hidden">
        <SignatureCanvas
          ref={sigPadRef}
          canvasProps={{
            width: canvasSize.width,
            height: canvasSize.height,
            style: { width: canvasSize.width, height: canvasSize.height, display: "block" },
          }}
          onEnd={handleEnd}
          penColor="black"
          minWidth={1}
          maxWidth={2.5}
          backgroundColor="white"
        />
      </div>
      <div className="flex justify-end">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleClear}
        >
          <Eraser className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      </div>
    </div>
  );
}
