  const [payroll, setPayroll] = useState({ records: [], totals: {}, paymentCount: 0 });
import { useEffect, useState } from 'react';
import api from '../services/api';
import { getApiError } from '../utils/apiError';

const currentDate = new Date();
const emptyEmployee = { empCode: '', name: '', department: '', payType: 'daily', dailyRate: '', pieceRate: '', hourlyRate: '' };

function amount(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function EmployeePaymentsPage({ token }) {
  const [period, setPeriod] = useState({ month: currentDate.getMonth() + 1, year: currentDate.getFullYear() });
  const [employees, setEmployees] = useState([]);
  const [payroll, setPayroll] = useState({ records: [], totals: {}, count: 0 });
  const [employeeForm, setEmployeeForm] = useState(emptyEmployee);
  const [editingId, setEditingId] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ employeeId: '', amount: '', notes: '' });

  async function load() {
    setError('');
    try {
      const [employeeResponse, salaryResponse] = await Promise.all([
        api.get('/employees'),
        api.get('/salaries/payments', { params: period })
      ]);
      setEmployees(employeeResponse.data);
      setPayroll(salaryResponse.data);
    } catch (requestError) {
      setError(getApiError(requestError, 'Failed to load employee payments'));
    }
  }

  async function addPayment(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    try {
      await api.post('/salaries/payments', {
        ...period,
        employeeId: Number(paymentForm.employeeId),
        amount: Number(paymentForm.amount),
        notes: paymentForm.notes || undefined
      });
      setPaymentForm({ employeeId: '', amount: '', notes: '' });
      setMessage('Payment added. You can add another payment for the same employee this month.');
      await load();
    } catch (requestError) {
      setError(getApiError(requestError, 'Failed to add payment'));
    }
  }

  useEffect(() => { load(); }, [period.month, period.year, token]);

  function updateEmployeeField(event) {
    setEmployeeForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function saveEmployee(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSaving(true);
    try {
      const payload = {
        ...employeeForm,
        dailyRate: employeeForm.dailyRate ? Number(employeeForm.dailyRate) : null,
        pieceRate: employeeForm.pieceRate ? Number(employeeForm.pieceRate) : null,
        hourlyRate: employeeForm.hourlyRate ? Number(employeeForm.hourlyRate) : null
      };
      if (editingId) await api.put(`/employees/${editingId}`, payload);
      else await api.post('/employees', payload);
      setEmployeeForm(emptyEmployee);
      setEditingId(null);
      setMessage('Employee saved.');
      await load();
    } catch (requestError) {
      setError(getApiError(requestError, 'Failed to save employee'));
    } finally {
      setIsSaving(false);
    }
  }

  async function generateSalaries() {
    setError('');
    setMessage('');
    try {
      const response = await api.post('/salaries/generate', period);
      setMessage(`${response.data.created} salary record(s) generated.`);
      await load();
    } catch (requestError) {
      setError(getApiError(requestError, 'Failed to generate salaries'));
    }
  }

  async function editSalary(record) {
    const fields = [
      ['daysWorked', 'Days worked'],
      ['piecesDone', 'Pieces completed'],
      ['otHours', 'Overtime hours'],
      ['allowances', 'Allowances'],
      ['bonus', 'Bonus'],
      ['advanceDeduction', 'Advance deduction'],
      ['otherDeductions', 'Other deductions']
    ];
    const values = {};

    for (const [field, label] of fields) {
      const value = window.prompt(label, record[field]);
      if (value === null) {
        return;
      }
      values[field] = value;
    }

    try {
      await api.put(`/salaries/${record.id}`, values);
      setMessage('Salary updated.');
      await load();
    } catch (requestError) {
      setError(getApiError(requestError, 'Failed to update salary'));
    }
  }

  async function updateStatus(record, status) {
    try {
      await api.patch(`/salaries/${record.id}/status`, { status });
      await load();
    } catch (requestError) {
      setError(getApiError(requestError, 'Failed to update salary status'));
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Payroll workspace</p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Employee Payments</h1>
            <p className="mt-1 text-sm text-slate-600">Manage employees and calculate monthly wages from approved inputs.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <select value={period.month} onChange={(event) => setPeriod({ ...period, month: Number(event.target.value) })} className="rounded-lg border px-3 py-2">
              {Array.from({ length: 12 }, (_, index) => <option key={index + 1} value={index + 1}>{new Date(2000, index).toLocaleString(undefined, { month: 'long' })}</option>)}
            </select>
            <input type="number" value={period.year} onChange={(event) => setPeriod({ ...period, year: Number(event.target.value) })} className="w-24 rounded-lg border px-3 py-2" />
          </div>
        </div>
        {message ? <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-700">{message}</p> : null}
        {error ? <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ['Total paid this month', payroll.totals.amount],
          ['Employees paid', payroll.records.length],
          ['Payment entries', payroll.paymentCount]
        ].map(([label, value]) => <div key={label} className="rounded-xl bg-white p-5 shadow"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-2xl font-bold text-slate-900">{label === 'Total paid this month' ? amount(value) : value}</p></div>)}
      </div>

      <form onSubmit={addPayment} className="rounded-xl bg-white p-5 shadow">
        <h2 className="text-lg font-bold text-slate-900">Add employee payment</h2>
        <p className="mt-1 text-sm text-slate-600">Record only the amount paid. The same employee can receive multiple payments in one month.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_180px_1fr_auto] md:items-end">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Employee<select required value={paymentForm.employeeId} onChange={(event) => setPaymentForm({ ...paymentForm, employeeId: event.target.value })} className="rounded-lg border px-3 py-2"><option value="">Select employee</option>{employees.filter((employee) => employee.active).map((employee) => <option key={employee.id} value={employee.id}>{employee.name} ({employee.empCode})</option>)}</select></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Amount<input required min="0.01" step="0.01" type="number" value={paymentForm.amount} onChange={(event) => setPaymentForm({ ...paymentForm, amount: event.target.value })} className="rounded-lg border px-3 py-2" /></label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Note (optional)<input value={paymentForm.notes} onChange={(event) => setPaymentForm({ ...paymentForm, notes: event.target.value })} className="rounded-lg border px-3 py-2" /></label>
          <button className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">Add payment</button>
        </div>
      </form>

      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <form onSubmit={saveEmployee} className="rounded-xl bg-white p-5 shadow">
          <h2 className="text-lg font-bold text-slate-900">{editingId ? 'Edit employee' : 'Add employee'}</h2>
          <div className="mt-4 grid gap-3">
            {[
              ['empCode', 'Employee ID'], ['name', 'Name'], ['department', 'Department'],
              ['dailyRate', 'Daily rate'], ['pieceRate', 'Rate per piece'], ['hourlyRate', 'Hourly rate']
            ].map(([name, label]) => <label key={name} className="grid gap-1 text-sm font-semibold text-slate-700">{label}<input name={name} value={employeeForm[name]} onChange={updateEmployeeField} type={name.endsWith('Rate') ? 'number' : 'text'} min={name.endsWith('Rate') ? '0' : undefined} step="0.01" className="rounded-lg border px-3 py-2" required={['empCode', 'name'].includes(name)} /></label>)}
            <label className="grid gap-1 text-sm font-semibold text-slate-700">Pay type<select name="payType" value={employeeForm.payType} onChange={updateEmployeeField} className="rounded-lg border px-3 py-2"><option value="daily">Daily wage</option><option value="piece">Piece rate</option></select></label>
            <button disabled={isSaving} className="rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">{isSaving ? 'Saving...' : 'Save employee'}</button>
            {editingId ? <button type="button" onClick={() => { setEditingId(null); setEmployeeForm(emptyEmployee); }} className="text-sm text-slate-600">Cancel edit</button> : null}
          </div>
        </form>

        <div className="rounded-xl bg-white p-5 shadow">
          <h2 className="text-lg font-bold text-slate-900">Monthly payments by employee</h2>
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead><tr className="border-b text-xs uppercase text-slate-500"><th className="p-3">Employee</th><th className="p-3">Payments this month</th><th className="p-3">Total paid</th></tr></thead><tbody>{payroll.records.map((record) => <tr key={record.employee.id} className="border-b"><td className="p-3"><strong>{record.employee.name}</strong><br /><span className="text-xs text-slate-500">{record.employee.empCode} · {record.employee.department || 'General'}</span></td><td className="p-3">{record.payments.map((payment) => <div key={payment.id}>{amount(payment.amount)} <span className="text-xs text-slate-500">({new Date(payment.paidAt).toLocaleDateString()})</span></div>)}</td><td className="p-3 font-bold">{amount(record.total)}</td></tr>)}</tbody></table>{payroll.records.length === 0 ? <p className="p-6 text-center text-sm text-slate-500">Add a payment to see the monthly employee totals.</p> : null}</div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow"><h2 className="text-lg font-bold text-slate-900">Employees</h2><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{employees.map((employee) => <button key={employee.id} type="button" onClick={() => { setEditingId(employee.id); setEmployeeForm({ ...employee, dailyRate: employee.dailyRate || '', pieceRate: employee.pieceRate || '', hourlyRate: employee.hourlyRate || '' }); }} className="rounded-lg border p-3 text-left hover:border-blue-500"><strong>{employee.name}</strong><span className="block text-xs text-slate-500">{employee.empCode} · {employee.payType} · {employee.active ? 'Active' : 'Inactive'}</span></button>)}</div></div>
    </div>
  );
}