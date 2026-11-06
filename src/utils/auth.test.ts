import test from 'node:test';
import assert from 'node:assert/strict';
import { validateLoginForm, formatStoragePath } from './auth';

test('validateLoginForm accepts a name, valid email, and birth date', () => {
  const result = validateLoginForm({
    name: 'Anita Putri',
    email: 'anitaputriazzahra@example.com',
    birthDate: '2008-08-14',
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, {});
});

test('validateLoginForm catches missing name, invalid email, and missing birth date', () => {
  const result = validateLoginForm({
    name: 'A',
    email: 'not-an-email',
    birthDate: '',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.name);
  assert.ok(result.errors.email);
  assert.ok(result.errors.birthDate);
});

test('validateLoginForm rejects a birth date in the future', () => {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 1);
  const birthDate = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${String(futureDate.getDate()).padStart(2, '0')}`;
  const result = validateLoginForm({
    name: 'Anita Putri',
    email: 'anita@example.com',
    birthDate,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.birthDate);
});

test('formatStoragePath generates clean formatted destination paths', () => {
  const path = formatStoragePath('storage/movies/NitaCantik/hasildownload/', 'My Video (HD).mp4');
  assert.equal(path, 'storage/movies/NitaCantik/hasildownload/My_Video_HD_.mp4');
});
