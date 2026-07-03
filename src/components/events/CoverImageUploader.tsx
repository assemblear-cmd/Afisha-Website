'use client';

import { useEffect, useState } from 'react';
import { Button, Field, Input } from '@/components/ui';

type UploadResponse = {
  error?: string;
  url?: string;
};

type CoverImageUploaderProps = {
  disabled?: boolean;
  onChange: (value: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  value: string;
};

const MAX_FILE_BYTES = 5 * 1024 * 1024;

export function CoverImageUploader({
  disabled = false,
  onChange,
  onUploadingChange,
  value,
}: CoverImageUploaderProps) {
  const [localPreview, setLocalPreview] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const previewSrc = localPreview || value;

  useEffect(() => {
    return () => {
      if (localPreview.startsWith('blob:')) URL.revokeObjectURL(localPreview);
    };
  }, [localPreview]);

  function setUploadState(nextUploading: boolean) {
    setUploading(nextUploading);
    onUploadingChange?.(nextUploading);
  }

  function clearImage() {
    setError('');
    setUploadedFileName('');
    setLocalPreview('');
    onChange('');
  }

  async function uploadFile(file: File) {
    const previewUrl = URL.createObjectURL(file);
    setLocalPreview(previewUrl);
    setUploadedFileName(file.name);
    setError('');
    setUploadState(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/uploads/event-cover', {
        method: 'POST',
        body: formData,
      });
      const data = (await res.json().catch(() => ({}))) as UploadResponse;

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Could not upload poster image.');
      }

      onChange(data.url);
      setLocalPreview('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not upload poster image.');
      onChange('');
    } finally {
      setUploadState(false);
    }
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Choose an image file.');
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError('Poster image must be 5 MB or smaller.');
      return;
    }

    void uploadFile(file);
  }

  function handleUrlChange(event: React.ChangeEvent<HTMLInputElement>) {
    setError('');
    setUploadedFileName('');
    setLocalPreview('');
    onChange(event.target.value);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
        <div className="space-y-4">
          <Field
            label="Upload poster image"
            htmlFor="coverUpload"
            hint="JPG, PNG, WebP, or GIF. Maximum size: 5 MB."
            error={error || undefined}
          >
            <Input
              id="coverUpload"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              disabled={disabled || uploading}
              onChange={handleFileChange}
              className="cursor-pointer file:mr-3 file:rounded-md file:border-0 file:bg-coral file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white hover:file:bg-coral-dark"
            />
          </Field>

          <Field label="Cover image URL" htmlFor="coverImage" hint="Optional. Paste a hosted image URL, or upload a file above.">
            <Input
              id="coverImage"
              type="text"
              value={value}
              onChange={handleUrlChange}
              placeholder="https://example.com/image.jpg"
              disabled={disabled || uploading}
            />
          </Field>
        </div>

        <div className="overflow-hidden rounded-lg border border-ink/10 bg-surface dark:bg-white/5">
          {previewSrc ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewSrc} alt="Cover preview" className="h-full min-h-[10rem] w-full object-cover" />
          ) : (
            <div className="grid min-h-[10rem] place-items-center px-4 text-center text-sm font-medium text-muted">
              Poster preview
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted" aria-live="polite">
          {uploading
            ? 'Uploading poster image...'
            : uploadedFileName
              ? `Uploaded: ${uploadedFileName}`
              : value
                ? 'This image will be used as the event poster.'
                : 'A default image will be used if left blank.'}
        </p>

        {(value || localPreview) && (
          <Button type="button" variant="ghost" size="sm" onClick={clearImage} disabled={disabled || uploading}>
            Remove image
          </Button>
        )}
      </div>
    </div>
  );
}
