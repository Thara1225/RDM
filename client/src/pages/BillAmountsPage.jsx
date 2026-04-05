import { useEffect, useState } from 'react';
import api from '../services/api';
import { getApiError } from '../utils/apiError';

const emptyPaymentForm = {
  shopId: '',
  amount: '',
  paymentDate: new Date().toISOString().slice(0, 10),
  description: '',
  notes: ''
};

export default function BillAmountsPage({ token }) {
  const [shopAccounts, setShopAccounts] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');

  const [form, setForm] = useState(emptyPaymentForm);
  const [formError, setFormError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [shops, setShops] = useState([]);

  async function loadShopAccounts() {
    setApiError('');
    setIsLoading(true);

    try {
      const response = await api.get('/shop-payments/summary');
      setShopAccounts(response.data || []);
    } catch (error) {
      setApiError(getApiError(error, 'Failed to load shop accounts'));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadShops() {
    try {
      const response = await api.get('/shops');
      setShops(response.data || []);
    } catch (error) {
      console.error('Failed to load shops:', error);
    }
  }

  useEffect(() => {
    loadShopAccounts();
    loadShops();
  }, [token]);

  async function addPayment(event) {
    event.preventDefault();
    setFormError('');

    if (!form.shopId) {
      setFormError('Please select a shop');
      return;
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      setFormError('Payment amount must be greater than 0');
      return;
    }

    if (!form.paymentDate) {
      setFormError('Payment date is required');
      return;
    }

    setIsSaving(true);

    try {
      const payload = {
        shopId: parseInt(form.shopId),
        amount: parseFloat(form.amount),
        paymentDate: form.paymentDate,
        description: form.description.trim() || null,
        notes: form.notes.trim() || null
      };

      await api.post('/shop-payments', payload);

      setForm(emptyPaymentForm);
      setFormError('');
      await loadShopAccounts();
    } catch (error) {
      setFormError(getApiError(error, 'Failed to add payment'));
    } finally {
      setIsSaving(false);
    }
  }

  const totalCredit = shopAccounts.reduce((sum, shop) => sum + shop.totalCredit, 0);
  const totalDebit = shopAccounts.reduce((sum, shop) => sum + shop.totalDebit, 0);
  const totalBalance = totalCredit - totalDebit;

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Bill Amounts & Shop Accounts</h1>
          <p className="mt-1 text-sm text-slate-600">Track shop credit, debit (payments), and balance.</p>
        </div>
      </header>

      {apiError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <p>{apiError}</p>
          <button
            className="mt-2 rounded border border-red-300 px-3 py-1 text-xs font-medium"
            type="button"
            onClick={() => loadShopAccounts()}
          >
            Retry
          </button>
        </div>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">Add Payment (Debit)</h2>

        <form className="mt-4 space-y-4" onSubmit={addPayment}>
          {formError ? (
            <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {formError}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Shop Name *
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={form.shopId}
                onChange={(e) => setForm({ ...form, shopId: e.target.value })}
                required
              >
                <option value="">-- Select Shop --</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name} {shop.shopCode ? `(${shop.shopCode})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Payment Amount *
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="number"
                step="0.01"
                placeholder="Enter amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Payment Date *
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm({ ...form, paymentDate: e.target.value })}
                required
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Description
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="text"
                placeholder="e.g., Cheque payment, Bank transfer"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>

            <label className="col-span-full text-sm font-medium text-slate-700">
              Notes
              <textarea
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                rows="2"
                placeholder="Additional notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </label>
          </div>

          <div className="flex gap-2">
            <button
              className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              type="submit"
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Add Payment'}
            </button>
            <button
              className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
              type="button"
              onClick={() => {
                setForm(emptyPaymentForm);
                setFormError('');
              }}
            >
              Reset
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">Shop Accounts Summary</h2>

        {isLoading ? (
          <p className="mt-4 text-sm text-slate-600">Loading...</p>
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-slate-600">
                    <th className="px-3 py-2 font-medium">Shop Code</th>
                    <th className="px-3 py-2 font-medium">Shop Name</th>
                    <th className="px-3 py-2 font-medium text-right">Total Credit</th>
                    <th className="px-3 py-2 font-medium text-right">Total Debit</th>
                    <th className="px-3 py-2 font-medium text-right">Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {shopAccounts.map((account) => (
                    <tr key={account.id}>
                      <td className="px-3 py-2 font-medium text-slate-900">
                        {account.shopCode || '-'}
                      </td>
                      <td className="px-3 py-2">{account.name}</td>
                      <td className="px-3 py-2 text-right text-slate-900">
                        {account.totalCredit.toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-900">
                        {account.totalDebit.toFixed(2)}
                      </td>
                      <td
                        className={`px-3 py-2 text-right font-medium ${
                          account.balance > 0 ? 'text-red-600' : account.balance < 0 ? 'text-green-600' : 'text-slate-600'
                        }`}
                      >
                        {account.balance.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!isLoading && shopAccounts.length === 0 ? (
                <p className="mt-3 text-sm text-slate-600">No shop data available.</p>
              ) : null}
            </div>

            {shopAccounts.length > 0 ? (
              <div className="mt-4 border-t border-slate-200 pt-4">
                <div className="flex justify-end gap-8">
                  <div>
                    <p className="text-sm text-slate-600">Total Credit:</p>
                    <p className="text-lg font-semibold text-slate-900">{totalCredit.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600">Total Debit:</p>
                    <p className="text-lg font-semibold text-slate-900">{totalDebit.toFixed(2)}</p>
                  </div>
                  <div
                    className={`${
                      totalBalance > 0 ? 'text-red-600' : totalBalance < 0 ? 'text-green-600' : 'text-slate-600'
                    }`}
                  >
                    <p className="text-sm">Total Balance:</p>
                    <p className="text-lg font-semibold">{totalBalance.toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
