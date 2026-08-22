import { useEffect, useRef, useState } from "react";
import { Camera, X, Check, RotateCw, Loader2 } from "lucide-react";
import { uploadDirectToGCS } from "../utils/imageCompressor";

interface CameraCaptureProps {
  onCapture: (urlOrBase64: string) => void;
  onClose: () => void;
  title: string;
}

export default function CameraCapture({ onCapture, onClose, title }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [stream]);

  const startCamera = async () => {
    setLoading(true);
    setError(null);
    stopCamera();

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
    } catch (err: any) {
      console.error("Camera access error:", err);
      setError("Unable to access camera. Please ensure permissions are granted and no other application is using it.");
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Draw flipped if user facing to keep mirrored intuition, but standard if environment
        if (facingMode === "user") {
          context.translate(canvas.width, 0);
          context.scale(-1, 1);
        }
        
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        // Use quality 1.0 (no compression) to preserve full camera quality
        const dataUrl = canvas.toDataURL("image/jpeg", 1.0);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const toggleFacingMode = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
  };

  const handleConfirm = async () => {
    if (capturedImage) {
      setUploading(true);
      try {
        const url = await uploadDirectToGCS(capturedImage, "camera-captures");
        onCapture(url);
      } catch (err: any) {
        // Show a clear error — never silently pass base64 back (would cause 413 on submit)
        alert(`Photo upload to cloud storage failed: ${err?.message || "Unknown error"}. Please check your internet connection and try again.`);
      } finally {
        setUploading(false);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-surface shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between bg-primary p-4 text-white">
          <h3 className="font-sans font-semibold tracking-tight text-white">{title}</h3>
          <button 
            type="button" 
            disabled={uploading}
            onClick={() => { stopCamera(); onClose(); }}
            className="rounded-lg p-1 text-white/80 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Camera Feed or Captured Image */}
        <div className="relative aspect-4/3 w-full bg-slate-950 flex items-center justify-center">
          {error ? (
            <div className="p-6 text-center text-rose-500 font-sans text-sm">
              <p className="font-semibold mb-2">Camera Error</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">{error}</p>
              <button 
                type="button" 
                onClick={startCamera}
                className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-medium text-white hover:bg-primary-hover transition-colors"
              >
                Retry Camera
              </button>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center gap-2 text-slate-400">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-primary" />
              <span className="text-xs font-sans">Initializing Camera...</span>
            </div>
          ) : capturedImage ? (
            <div className="relative w-full h-full">
              <img 
                src={capturedImage} 
                alt="Captured document" 
                className="h-full w-full object-contain"
              />
              {uploading && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2 text-white">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                  <span className="text-xs font-medium">Uploading to cloud storage...</span>
                </div>
              )}
            </div>
          ) : null}
          
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`h-full w-full object-cover ${facingMode === "user" ? "scale-x-[-1]" : ""} ${(loading || error || capturedImage) ? "hidden" : ""}`}
          />
        </div>

        {/* Actions bar */}
        <div className="bg-slate-50 p-4 border-t border-border/40 flex justify-between items-center gap-4">
          {capturedImage ? (
            <>
              <button
                type="button"
                disabled={uploading}
                onClick={handleRetake}
                className="flex items-center gap-2 rounded-xl bg-white border border-border px-4 py-2.5 text-xs font-semibold text-text-muted hover:bg-slate-100 transition-all shadow-xs disabled:opacity-50"
              >
                <RotateCw className="h-4 w-4" />
                Retake Photo
              </button>
              <button
                type="button"
                disabled={uploading}
                onClick={handleConfirm}
                className="flex items-center gap-2 rounded-xl bg-green px-5 py-2.5 text-xs font-semibold text-white hover:bg-green/95 transition-all shadow-md shadow-green-500/10 disabled:opacity-50 cursor-pointer"
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                {uploading ? "Saving..." : "Use Photo"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={error !== null || loading}
                onClick={toggleFacingMode}
                className="flex items-center gap-2 rounded-xl bg-white border border-border px-4 py-2.5 text-xs font-semibold text-text-muted hover:bg-slate-100 disabled:opacity-50 transition-all shadow-xs"
              >
                <RotateCw className="h-4 w-4" />
                Switch Camera
              </button>
              <button
                type="button"
                disabled={error !== null || loading}
                onClick={capturePhoto}
                className="flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-white hover:bg-primary-hover disabled:opacity-50 transition-all shadow-md shadow-primary/10"
              >
                <Camera className="h-4 w-4" />
                Capture Photo
              </button>
            </>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
