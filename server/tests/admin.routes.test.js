const test = require('node:test');
const assert = require('node:assert/strict');

const { validatePasswordResetPayload } = require('../modules/admin/admin.routes');

test('rejects empty or short password values', () => {
  assert.deepStrictEqual(validatePasswordResetPayload(''), {
    valid: false,
    message: 'Password must be at least 6 characters',
  });

  assert.deepStrictEqual(validatePasswordResetPayload('abc'), {
    valid: false,
    message: 'Password must be at least 6 characters',
  });
});

test('accepts trimmed passwords', () => {
  assert.deepStrictEqual(validatePasswordResetPayload('  Welcome123  '), {
    valid: true,
    password: 'Welcome123',
  });
});
