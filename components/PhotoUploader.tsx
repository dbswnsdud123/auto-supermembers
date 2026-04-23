'use client';

import { useRef, useState } from 'react';
import type { PhotoItem } from '@/lib/storage';

type Props = {
  photos: PhotoItem[];
  onChange: (photos: PhotoItem[]) => void;
};

export default function PhotoUploader({ photos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const newItems: PhotoItem[] = await Promise.all(
      arr.map(async (f) => ({
        id: crypto.randomUUID(),
        name: f.name,
        dataUrl: await fileToDataUrl(f),
        memo: '',
      }))
    );
    onChange([...photos, ...newItems]);
  }

  function move(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= photos.length) return;
    const copy = [...photos];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    onChange(copy);
  }

  function remove(idx: number) {
    onChange(photos.filter((_, i) => i !== idx));
  }

  function updateMemo(idx: number, memo: string) {
    onChange(photos.map((p, i) => (i === idx ? { ...p, memo } : p)));
  }

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
          dragOver
            ? 'border-black bg-gray-100 dark:border-white dark:bg-gray-800'
            : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900'
        }`}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          사진을 드래그하거나 <span className="underline">클릭</span>해서 업로드
        </p>
        <p className="text-xs text-gray-400 mt-1">여러 장 한꺼번에 선택 가능</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = '';
          }}
          className="hidden"
        />
      </div>

      {photos.length > 0 && (
        <div className="space-y-2">
          {photos.map((p, i) => (
            <div
              key={p.id}
              className="flex gap-3 items-start border border-gray-200 dark:border-gray-800 rounded-lg p-3"
            >
              <div className="w-6 text-center font-mono text-sm text-gray-500 pt-1">
                {i + 1}
              </div>
              <img
                src={p.dataUrl}
                alt={p.name}
                className="w-20 h-20 object-cover rounded flex-shrink-0"
              />
              <div className="flex-1 space-y-2 min-w-0">
                <input
                  value={p.memo}
                  onChange={(e) => updateMemo(i, e.target.value)}
                  placeholder="사진 메모 (선택): 예) 시그니처 파스타, 창가 자리..."
                  className="w-full border border-gray-300 dark:border-gray-700 rounded px-2 py-1 text-sm bg-transparent"
                />
                <div className="flex gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === photos.length - 1}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="px-2 py-1 border border-gray-300 dark:border-gray-700 rounded text-red-500 ml-auto"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const MAX_DIM = 1024;
const JPEG_QUALITY = 0.85;

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const objUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objUrl);
      try {
        let { width, height } = img;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width >= height) {
            height = Math.round(height * (MAX_DIM / width));
            width = MAX_DIM;
          } else {
            width = Math.round(width * (MAX_DIM / height));
            height = MAX_DIM;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
      } catch (e) {
        reject(e);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(objUrl);
      reject(new Error('이미지를 읽을 수 없습니다'));
    };
    img.src = objUrl;
  });
}
