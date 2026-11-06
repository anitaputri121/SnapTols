export interface AuthFormState {
  name: string;
  email: string;
  birthDate: string;
}

export function validateLoginForm(data: AuthFormState): {
  valid: boolean;
  errors: Partial<Record<keyof AuthFormState, string>>;
} {
  const errors: Partial<Record<keyof AuthFormState, string>> = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Nama minimal 2 karakter';
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email.trim())) {
    errors.email = 'Format email tidak valid';
  }

  if (!data.birthDate) {
    errors.birthDate = 'Tanggal lahir wajib diisi';
  } else {
    const birthDate = new Date(`${data.birthDate}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (Number.isNaN(birthDate.getTime())) {
      errors.birthDate = 'Tanggal lahir tidak valid';
    } else if (birthDate > today) {
      errors.birthDate = 'Tanggal lahir tidak boleh di masa depan';
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function formatStoragePath(folder: string, filename: string): string {
  const cleanFolder = folder.replace(/\/+$/, '');
  const cleanFilename = filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_+/g, '_');
  return `${cleanFolder}/${cleanFilename}`;
}
