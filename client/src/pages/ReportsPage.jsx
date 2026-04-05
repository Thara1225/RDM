import { useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend
} from 'recharts';

import api from '../services/api';
import { getApiError } from '../utils/apiError';

const today = new Date().toISOString().slice(0, 10);

function asNumber(value) {
  return Number(value || 0);
}

function asDate(value) {
  if (!value) return '-';
  return new Date(value).toISOString().slice(0, 10);
}

function toChartDate(value) {
  return asDate(value).slice(5);
}

function compactName(value, max = 16) {
  if (!value) return '-';
  return value.length > max ? `${value.slice(0, max)}...` : value;
}

function monthRange(offsetMonths = 0) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() + offsetMonths, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + offsetMonths + 1, 0);
  return {
    fromDate: start.toISOString().slice(0, 10),
    toDate: end.toISOString().slice(0, 10)
  };
}

function trendMeta(current, previous, inverse = false) {
  const diff = current - previous;
  const up = diff >= 0;
  const color = inverse
    ? (up ? 'text-red-600' : 'text-green-600')
    : (up ? 'text-green-600' : 'text-red-600');
  return {
    diff,
    arrow: up ? '▲' : '▼',
    color
  };
}

function aggregateByDay(rows, dateField, amountField, label) {
  const map = new Map();

  for (const row of rows || []) {
    const key = asDate(row[dateField]);
    const current = map.get(key) || 0;
    map.set(key, current + asNumber(row[amountField]));
  }

  return [...map.entries()]
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([date, value]) => ({ date: toChartDate(date), [label]: value }));
}

function aggregateByName(rows, nameGetter, valueGetter, valueKey) {
  const map = new Map();

  for (const row of rows || []) {
    const key = nameGetter(row) || '-';
    const current = map.get(key) || 0;
    map.set(key, current + valueGetter(row));
  }

  return [...map.entries()]
    .map(([name, value]) => ({ name: compactName(name), [valueKey]: value }))
    .sort((a, b) => b[valueKey] - a[valueKey])
    .slice(0, 10);
}

function downloadExcel(reportData) {
  const wb = XLSX.utils.book_new();

  const sheetConfigs = [
    {
      name: 'Purchases',
      rows: (reportData.purchasesByDate || []).map((row) => ({
        Date: asDate(row.purchaseDate),
        Item: row.itemName || row.material?.name || '-',
        Amount: asNumber(row.totalPrice)
      }))
    },
    {
      name: 'Cuttings',
      rows: (reportData.cuttingsByDate || []).map((row) => ({
        Date: asDate(row.cutDate),
        Product: row.product?.name || '-',
        QtyCut: asNumber(row.quantityCut),
        ClothUsed: asNumber(row.clothUsed)
      }))
    },
    {
      name: 'Stock',
      rows: (reportData.stockSummary || []).map((row) => ({
        Material: row.material?.name || '-',
        Available: asNumber(row.availableQuantity),
        MinLevel: asNumber(row.minStockLevel)
      }))
    },
    {
      name: 'Shop Bills',
      rows: (reportData.shopWiseBills || []).map((row) => ({
        Shop: row.shopName || '-',
        BillNo: row.billNo || '-',
        Total: asNumber(row.totalAmount)
      }))
    },
    {
      name: 'Payments',
      rows: (reportData.paymentsReceived || []).map((row) => ({
        Date: asDate(row.paymentDate),
        Shop: row.shop?.name || '-',
        Amount: asNumber(row.amount)
      }))
    },
    {
      name: 'Balance Due',
      rows: (reportData.balanceDueByShop || []).map((row) => ({
        Shop: row.shopName || '-',
        BalanceDue: asNumber(row.balanceDue)
      }))
    },
    {
      name: 'Most Used Materials',
      rows: (reportData.mostUsedMaterials || []).map((row) => ({
        Material: row.materialName || '-',
        ClothUsed: asNumber(row.totalClothUsed)
      }))
    },
    {
      name: 'Most Produced Garments',
      rows: (reportData.mostProducedGarments || []).map((row) => ({
        Product: row.productName || '-',
        ProducedQty: asNumber(row.totalProducedQty)
      }))
    }
  ];

  for (const config of sheetConfigs) {
    const rows = config.rows.length ? config.rows : [{ Message: 'No data' }];
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, config.name.slice(0, 31));
  }

  XLSX.writeFile(wb, `rdm-reports-${today}.xlsx`);
}

function sectionTableToPdf(doc, title, head, body) {
  doc.setFontSize(12);
  doc.text(title, 14, doc.lastAutoTable ? doc.lastAutoTable.finalY + 12 : 18);
  autoTable(doc, {
    head: [head],
    body: body.length ? body : [['No data']],
    startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 14 : 22,
    styles: { fontSize: 8 }
  });
}

function downloadPdf(reportData, filters) {
  const doc = new jsPDF({ orientation: 'landscape' });

  doc.setFontSize(16);
  doc.text('RDM Reports Snapshot', 14, 12);
  doc.setFontSize(10);
  doc.text(
    `Date Range: ${filters.fromDate || '-'} to ${filters.toDate || '-'} | Generated: ${new Date().toLocaleString()}`,
    14,
    18
  );

  sectionTableToPdf(
    doc,
    'Purchases By Date',
    ['Date', 'Item', 'Amount'],
    (reportData.purchasesByDate || []).map((row) => [
      asDate(row.purchaseDate),
      row.itemName || row.material?.name || '-',
      asNumber(row.totalPrice).toFixed(2)
    ])
  );

  sectionTableToPdf(
    doc,
    'Balance Due By Shop',
    ['Shop', 'Bills', 'Payments', 'Balance Due'],
    (reportData.balanceDueByShop || []).map((row) => [
      row.shopName || '-',
      asNumber(row.totalBills).toFixed(2),
      asNumber(row.totalPayments).toFixed(2),
      asNumber(row.balanceDue).toFixed(2)
    ])
  );

  sectionTableToPdf(
    doc,
    'Top Materials / Garments',
    ['Type', 'Name', 'Value'],
    [
      ...(reportData.mostUsedMaterials || []).slice(0, 5).map((row) => [
        'Material',
        row.materialName || '-',
        asNumber(row.totalClothUsed).toFixed(3)
      ]),
      ...(reportData.mostProducedGarments || []).slice(0, 5).map((row) => [
        'Garment',
        row.productName || '-',
        asNumber(row.totalProducedQty)
      ])
    ]
  );

  doc.save(`rdm-reports-${today}.pdf`);
}

function ChartCard({ title, children }) {
  return (
    <section className="rounded-xl bg-white p-5 shadow">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <div className="mt-3 h-72">{children}</div>
    </section>
  );
}

function EmptyChart() {
  return <p className="text-sm text-slate-500">No data for selected range.</p>;
}

export default function ReportsPage({ token }) {
  const [filters, setFilters] = useState({ fromDate: '', toDate: '' });
  const [reportData, setReportData] = useState({
    purchasesByDate: [],
    cuttingsByDate: [],
    stockSummary: [],
    shopWiseBills: [],
    paymentsReceived: [],
    balanceDueByShop: [],
    mostUsedMaterials: [],
    mostProducedGarments: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState('');
  const [compareMode, setCompareMode] = useState({
    current: { sales: 0, payments: 0, due: 0 },
    previous: { sales: 0, payments: 0, due: 0 }
  });

  const purchasesByDay = useMemo(
    () => aggregateByDay(reportData.purchasesByDate, 'purchaseDate', 'totalPrice', 'amount'),
    [reportData.purchasesByDate]
  );

  const cuttingsByDay = useMemo(
    () => aggregateByDay(reportData.cuttingsByDate, 'cutDate', 'quantityCut', 'qtyCut'),
    [reportData.cuttingsByDate]
  );

  const stockChart = useMemo(
    () => (reportData.stockSummary || [])
      .map((row) => ({
        name: compactName(row.material?.name),
        available: asNumber(row.availableQuantity),
        minLevel: asNumber(row.minStockLevel)
      }))
      .slice(0, 10),
    [reportData.stockSummary]
  );

  const billsByShop = useMemo(
    () => aggregateByName(
      reportData.shopWiseBills,
      (row) => row.shopName,
      (row) => asNumber(row.totalAmount),
      'billTotal'
    ),
    [reportData.shopWiseBills]
  );

  const paymentsByShop = useMemo(
    () => aggregateByName(
      reportData.paymentsReceived,
      (row) => row.shop?.name,
      (row) => asNumber(row.amount),
      'paymentTotal'
    ),
    [reportData.paymentsReceived]
  );

  const balanceDue = useMemo(
    () => (reportData.balanceDueByShop || [])
      .map((row) => ({
        name: compactName(row.shopName),
        balanceDue: asNumber(row.balanceDue)
      }))
      .sort((a, b) => b.balanceDue - a.balanceDue)
      .slice(0, 10),
    [reportData.balanceDueByShop]
  );

  const topMaterials = useMemo(
    () => (reportData.mostUsedMaterials || []).map((row) => ({
      name: compactName(row.materialName),
      clothUsed: asNumber(row.totalClothUsed)
    })).slice(0, 10),
    [reportData.mostUsedMaterials]
  );

  const topGarments = useMemo(
    () => (reportData.mostProducedGarments || []).map((row) => ({
      name: compactName(row.productName),
      producedQty: asNumber(row.totalProducedQty)
    })).slice(0, 10),
    [reportData.mostProducedGarments]
  );

  const totalPurchases = useMemo(
    () => (reportData.purchasesByDate || []).reduce((sum, row) => sum + asNumber(row.totalPrice), 0),
    [reportData.purchasesByDate]
  );

  const totalPayments = useMemo(
    () => (reportData.paymentsReceived || []).reduce((sum, row) => sum + asNumber(row.amount), 0),
    [reportData.paymentsReceived]
  );

  const totalBalance = useMemo(
    () => (reportData.balanceDueByShop || []).reduce((sum, row) => sum + asNumber(row.balanceDue), 0),
    [reportData.balanceDueByShop]
  );

  const salesTrend = trendMeta(compareMode.current.sales, compareMode.previous.sales);
  const paymentsTrend = trendMeta(compareMode.current.payments, compareMode.previous.payments);
  const dueTrend = trendMeta(compareMode.current.due, compareMode.previous.due, true);

  async function loadReports(activeFilters = filters) {
    setApiError('');
    setIsLoading(true);

    try {
      const params = {
        ...(activeFilters.fromDate ? { fromDate: activeFilters.fromDate } : {}),
        ...(activeFilters.toDate ? { toDate: activeFilters.toDate } : {})
      };

      const currentMonth = monthRange(0);
      const previousMonth = monthRange(-1);

      const [mainResponse, currentResponse, previousResponse] = await Promise.all([
        api.get('/reports', { params }),
        api.get('/reports', { params: currentMonth }),
        api.get('/reports', { params: previousMonth })
      ]);

      setReportData(mainResponse.data || {});

      const currentSales = (currentResponse.data?.shopWiseBills || []).reduce((sum, row) => sum + asNumber(row.totalAmount), 0);
      const currentPayments = (currentResponse.data?.paymentsReceived || []).reduce((sum, row) => sum + asNumber(row.amount), 0);
      const currentDue = (currentResponse.data?.balanceDueByShop || []).reduce((sum, row) => sum + asNumber(row.balanceDue), 0);

      const previousSales = (previousResponse.data?.shopWiseBills || []).reduce((sum, row) => sum + asNumber(row.totalAmount), 0);
      const previousPayments = (previousResponse.data?.paymentsReceived || []).reduce((sum, row) => sum + asNumber(row.amount), 0);
      const previousDue = (previousResponse.data?.balanceDueByShop || []).reduce((sum, row) => sum + asNumber(row.balanceDue), 0);

      setCompareMode({
        current: { sales: currentSales, payments: currentPayments, due: currentDue },
        previous: { sales: previousSales, payments: previousPayments, due: previousDue }
      });
    } catch (error) {
      setApiError(getApiError(error, 'Failed to load reports'));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [token]);

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Reports Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">Visual analytics for daily operations with bar-chart insights.</p>
      </header>

      {apiError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{apiError}</div>
      ) : null}

      <section className="rounded-xl bg-white p-6 shadow">
        <div className="flex flex-wrap items-end gap-3">
          <label className="text-sm font-medium text-slate-700">
            From Date
            <input
              className="mt-1 w-44 rounded border border-slate-300 px-3 py-2"
              type="date"
              value={filters.fromDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, fromDate: event.target.value }))}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            To Date
            <input
              className="mt-1 w-44 rounded border border-slate-300 px-3 py-2"
              type="date"
              value={filters.toDate}
              onChange={(event) => setFilters((prev) => ({ ...prev, toDate: event.target.value }))}
            />
          </label>

          <button className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white" type="button" onClick={() => loadReports(filters)}>
            Apply
          </button>

          <button
            className="rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            type="button"
            onClick={() => {
              const reset = { fromDate: '', toDate: '' };
              setFilters(reset);
              loadReports(reset);
            }}
          >
            Reset
          </button>

          <button className="rounded border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700" type="button" onClick={() => downloadPdf(reportData, filters)}>
            Export PDF
          </button>

          <button className="rounded border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700" type="button" onClick={() => downloadExcel(reportData)}>
            Export Excel
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-xs text-slate-500">Purchases Amount</p>
          <p className="text-xl font-semibold text-slate-900">{totalPurchases.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-xs text-slate-500">Payments Received</p>
          <p className="text-xl font-semibold text-slate-900">{totalPayments.toFixed(2)}</p>
        </div>
        <div className="rounded-xl bg-white p-4 shadow">
          <p className="text-xs text-slate-500">Balance Due</p>
          <p className="text-xl font-semibold text-slate-900">{totalBalance.toFixed(2)}</p>
        </div>
      </section>

      <section className="rounded-xl bg-white p-6 shadow">
        <h2 className="text-lg font-semibold text-slate-900">Comparison Mode: This Month vs Last Month</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Sales</p>
            <p className="text-sm text-slate-700">This: {compareMode.current.sales.toFixed(2)} | Last: {compareMode.previous.sales.toFixed(2)}</p>
            <p className={`mt-1 text-sm font-semibold ${salesTrend.color}`}>{salesTrend.arrow} {Math.abs(salesTrend.diff).toFixed(2)}</p>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Payments</p>
            <p className="text-sm text-slate-700">This: {compareMode.current.payments.toFixed(2)} | Last: {compareMode.previous.payments.toFixed(2)}</p>
            <p className={`mt-1 text-sm font-semibold ${paymentsTrend.color}`}>{paymentsTrend.arrow} {Math.abs(paymentsTrend.diff).toFixed(2)}</p>
          </div>
          <div className="rounded border border-slate-200 p-3">
            <p className="text-xs text-slate-500">Balance Due</p>
            <p className="text-sm text-slate-700">This: {compareMode.current.due.toFixed(2)} | Last: {compareMode.previous.due.toFixed(2)}</p>
            <p className={`mt-1 text-sm font-semibold ${dueTrend.color}`}>{dueTrend.arrow} {Math.abs(dueTrend.diff).toFixed(2)}</p>
          </div>
        </div>
      </section>

      {isLoading ? <p className="text-sm text-slate-600">Loading report charts...</p> : null}

      <section className="grid gap-6 xl:grid-cols-2">
        <ChartCard title="Purchases By Date (Bar)">
          {purchasesByDay.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={purchasesByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="amount" fill="#1d4ed8" name="Amount" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Cuttings By Date (Bar)">
          {cuttingsByDay.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cuttingsByDay}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="qtyCut" fill="#ea580c" name="Qty Cut" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Stock Summary (Top Materials)">
          {stockChart.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockChart}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="available" fill="#0f766e" name="Available" />
                <Bar dataKey="minLevel" fill="#ef4444" name="Min Level" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Shop-Wise Bills (Top)">
          {billsByShop.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={billsByShop}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="billTotal" fill="#7c3aed" name="Bill Total" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Payments Received (By Shop)">
          {paymentsByShop.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paymentsByShop}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="paymentTotal" fill="#16a34a" name="Payments" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Balance Due By Shop">
          {balanceDue.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balanceDue}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="balanceDue" fill="#dc2626" name="Balance Due" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Most-Used Materials">
          {topMaterials.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMaterials}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="clothUsed" fill="#0891b2" name="Cloth Used" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Most-Produced Garments">
          {topGarments.length === 0 ? <EmptyChart /> : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topGarments}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="producedQty" fill="#2563eb" name="Produced Qty" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </section>
    </div>
  );
}
