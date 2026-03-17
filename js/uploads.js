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

export async function uploadFile(file) {
  const validationError = validateUpload(file);
  if (validationError) throw new Error(validationError);

  if (window.ARTEMIS_DRY_RUN) {
    return {
      url: URL.createObjectURL(file),
      width: null,
      height: null,
      license: ''
    };
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await apiFetch('/api/uploads', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Ошибка загрузки файла на сервер.');
  }

  const data = await response.json();
  return {
    url: data.url,
    width: data.width,
    height: data.height,
    license: data.license || ''
  };
}

// Чеклист:
// - [ ] отклоняются не-image mime и недопустимые расширения
// - [ ] отклоняются файлы > 5 MB
// - [ ] успешный ответ возвращает {url,width,height,license}
// - [ ] при пустой license UI показывает предупреждение
