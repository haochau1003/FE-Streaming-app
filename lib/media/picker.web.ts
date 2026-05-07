import type { UploadFile } from '../api/upload';

export interface PickerResult {
  files: UploadFile[];
  cancelled: boolean;
}

const ACCEPT = 'image/*,video/*,audio/*';

export async function pickMedia(): Promise<PickerResult> {
  return new Promise<PickerResult>((resolve) => {
    if (typeof document === 'undefined') {
      resolve({ files: [], cancelled: true });
      return;
    }
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = ACCEPT;
    input.style.display = 'none';

    let resolved = false;
    const finish = (result: PickerResult) => {
      if (resolved) return;
      resolved = true;
      input.remove();
      resolve(result);
    };

    input.addEventListener('change', () => {
      const files = input.files ? Array.from(input.files) : [];
      finish({ files, cancelled: files.length === 0 });
    });

    window.addEventListener(
      'focus',
      () => {
        setTimeout(() => {
          if (!resolved) finish({ files: [], cancelled: true });
        }, 500);
      },
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
  });
}
