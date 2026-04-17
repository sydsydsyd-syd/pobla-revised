//image_upload
import React, { useRef, useState, useCallback } from "react";
import { uploadToCloudinary, thumbUrl } from "@/lib/cloudinary";
import { cn } from "@/lib/utils";
import { PhotoIcon, XMarkIcon, ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

interface ImageUploadProps {
  value?: string;           // current image URL / public_id
  onChange: (url: string) => void;
  onPublicId?: (id: string) => void;
  folder?: string;
  label?: string;
  className?: string;
  aspectRatio?: "square" | "landscape" | "portrait";
}

type UploadState = "idle" | "uploading" | "success" | "error";

export default function ImageUpload({
  value,
  onChange,
  onPublicId,
  folder = "pobla-menu",
  label = "Upload Image",
  className,
  aspectRatio = "landscape",
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const aspectClass = {
    square: "aspect-square",
    landscape: "aspect-video",
    portrait: "aspect-[3/4]",
  }[aspectRatio];

  async function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("File must be under 10 MB.");
      return;
    }

    setError("");
    setState("uploading");
    setProgress(0);

    // Simulate progress (Cloudinary doesn't expose XHR progress on fetch)
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + Math.random() * 20, 85));
    }, 200);

    try {
      const result = await uploadToCloudinary(file, folder);
      clearInterval(interval);
      setProgress(100);
      setState("success");
      onChange(result.secure_url);
      onPublicId?.(result.public_id);
    } catch (err: unknown) {
      clearInterval(interval);
      setState("error");
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  }

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setDragging(true); };
  const onDragLeave = () => setDragging(false);

  function clearImage() {
    onChange("");
    onPublicId?.("");
    setState("idle");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <label className="block text-sm font-semibold font-display text-foreground">{label}</label>
      )}

      {/* Drop zone / preview */}
      <div
        className={cn(
          "relative w-full rounded-2xl border-2 border-dashed transition-all duration-200 overflow-hidden",
          aspectClass,
          dragging ? "border-brand bg-brand/5 scale-[1.01]" : "border-border",
          state === "error" ? "border-destructive bg-destructive/5" : "",
          !value ? "cursor-pointer hover:border-brand/50 hover:bg-muted/40" : "",
        )}
        onClick={() => !value && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
      >
        {/* Preview image */}
        {value && state !== "uploading" && (
          <>
            <img
              src={thumbUrl(value)}
              alt="Uploaded"
              className="w-full h-full object-cover"
            />
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all flex items-center justify-center opacity-0 hover:opacity-100 group">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); inputRef.current?.click(); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-foreground text-xs font-semibold shadow-lg hover:bg-brand hover:text-white transition-all"
                >
                  <ArrowUpTrayIcon className="w-3.5 h-3.5" /> Replace
                </button>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); clearImage(); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white text-destructive text-xs font-semibold shadow-lg hover:bg-destructive hover:text-white transition-all"
                >
                  <XMarkIcon className="w-3.5 h-3.5" /> Remove
                </button>
              </div>
            </div>
            {/* Success badge */}
            {state === "success" && (
              <div className="absolute top-2 right-2 w-7 h-7 rounded-full bg-green-500 flex items-center justify-center shadow-md">
                <CheckCircleIcon className="w-4 h-4 text-white" />
              </div>
            )}
          </>
        )}

        {/* Uploading state */}
        {state === "uploading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90">
            <div className="w-16 h-16 rounded-full border-4 border-muted flex items-center justify-center mb-3 relative">
              <svg className="absolute inset-0 -rotate-90" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#bc5d5d" strokeWidth="4"
                  strokeDasharray={`${progress * 1.76} 176`} strokeLinecap="round" />
              </svg>
              <span className="text-xs font-black text-brand font-display">{Math.round(progress)}%</span>
            </div>
            <p className="text-sm font-semibold text-foreground">Uploading…</p>
            <div className="w-32 h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-brand rounded-full transition-all duration-200" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        {/* Idle / no image */}
        {!value && state !== "uploading" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <div className={cn(
              "w-12 h-12 rounded-2xl flex items-center justify-center mb-3 transition-colors",
              dragging ? "bg-brand text-white" : "bg-muted text-muted-foreground"
            )}>
              {dragging
                ? <ArrowUpTrayIcon className="w-6 h-6" />
                : <PhotoIcon className="w-6 h-6" />
              }
            </div>
            <p className="text-sm font-semibold text-foreground">
              {dragging ? "Drop to upload" : "Click or drag image here"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 10MB</p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <XMarkIcon className="w-3.5 h-3.5" /> {error}
        </p>
      )}

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onInputChange}
      />
    </div>
  );
}
