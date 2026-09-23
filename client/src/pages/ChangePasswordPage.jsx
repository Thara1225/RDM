import { useState } from 'react';
import api from '../services/api';
import { getApiError } from '../utils/apiError';

const initialForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: ''
};

export default function ChangePasswordPage() {
  const [form, setForm] = useState(initialForm);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  async function changePassword(event) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (form.newPassword !== form.confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    setIsSaving(true);
    try {
      const response = await api.post('/auth/change-password', form);
      setMessage(response.data.message);
      setForm(initialForm);
    } catch (requestError) {
      setError(getApiError(requestError, 'Failed to change password'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <header className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Change Password</h1>
        <p className="mt-1 text-sm text-slate-600">Update your admin account password.</p>
      </header>

      <form className="mt-6 rounded-xl bg-white p-6 shadow" onSubmit={changePassword}>
        <div className="grid gap-4">
          <label className="text-sm font-medium text-slate-700">
            Current Password
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              type="password"
              minLength={1}
              required
              value={form.currentPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, currentPassword: event.target.value }))}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            New Password
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              type="password"
              minLength={6}
              required
              value={form.newPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, newPassword: event.target.value }))}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Confirm New Password
            <input
              className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
              type="password"
              minLength={6}
              required
              value={form.confirmPassword}
              onChange={(event) => setForm((prev) => ({ ...prev, confirmPassword: event.target.value }))}
            />
          </label>
        </div>

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-green-600">{message}</p> : null}

        <button
          className="mt-5 rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
          type="submit"
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
