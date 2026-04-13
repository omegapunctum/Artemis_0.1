// Файл: js/uploads.js
// Назначение: клиентская загрузка изображений UGC в backend (/api/uploads) с базовой валидацией.
// Интеграция: использовать в редакторе черновика перед сохранением поля source_media_url.

import { apiFetch } from './auth.js';

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

function validateUpload(file) {
  if (!file) return 'Файл не выбран.';
  if (!file.type.startsWith('image/')) return 'Можно загружать только изображения (image/*).';
  if (file.size > MAX_FILE_SIZE) return 'Размер файла превышает 5 MB.';

  const lower = file.name.toLowerCase();
  const extensionAllowed = ALLOWED_EXTENSIONS.some((ext) => lower.endsWith(ext));
  if (!extensionAllowed) return 'Недопустимое расширение. Разрешены: .jpg, .jpeg, .png, .webp.';

  return null;
}

export async function uploadFile(file, license) {
  const validationError = validateUpload(file);
  if (validationError) throw new Error(validationError);
  if (!license || !String(license).trim()) throw new Error('Не указана лицензия.');

  if (window.ARTEMIS_DRY_RUN) {
    return {
      id: 'dry-run',
      url: URL.createObjectURL(file),
      filename: file.name,
      license: String(license).trim()
    };
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('license', String(license).trim());

  const response = await apiFetch('/api/uploads', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    let detail = `Ошибка загрузки файла на сервер (HTTP ${response.status}).`;
    try {
      const payload = await response.json();
      if (payload?.detail) detail = `${detail} ${payload.detail}`;
    } catch (_) {
      // noop: keep default message
    }
    throw new Error(detail);
  }

  const data = await response.json();
  return {
    id: data.id,
    url: data.url,
    filename: data.filename,
    license: data.license || ''
  };
}

// Чеклист:
// - [ ] отклоняются не-image mime и недопустимые расширения
// - [ ] отклоняются файлы > 5 MB
// - [ ] успешный ответ возвращает {id,url,filename,license}
// - [ ] при пустой license UI показывает предупреждение
