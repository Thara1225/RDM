import { useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import { getApiError } from '../utils/apiError';

const today = new Date().toISOString().slice(0, 10);

const emptyLine = {
  productId: '',
  quantity: '',
  unitPrice: ''
};

export default function ShopOrdersPage({ token }) {
  const [shops, setShops] = useState([]);
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState('');
  const [saveError, setSaveError] = useState('');

  const [selectedShopId, setSelectedShopId] = useState('');
  const [orderDate, setOrderDate] = useState(today);
  const [status, setStatus] = useState('pending');
  const [notes, setNotes] = useState('');

  const [line, setLine] = useState(emptyLine);
  const [lineError, setLineError] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [createdBillNo, setCreatedBillNo] = useState('');

  const selectedShop = useMemo(
    () => shops.find((shop) => shop.id === Number(selectedShopId)) || null,
    [shops, selectedShopId]
  );

  const orderGrandTotal = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.lineTotal, 0),
    [cartItems]
  );

  const groupedBills = useMemo(() => {
    const map = new Map();

    for (const row of orders) {
      const key = row.billNo || `ORDER-${row.id}`;
      if (!map.has(key)) {
        map.set(key, {
          billNo: key,
          orderDate: row.orderDate,
          status: row.status,
          notes: row.notes,
          items: [],
          total: 0
        });
      }

      const bucket = map.get(key);
      const lineTotal = Number(row.totalPrice || 0);
      bucket.items.push(row);
      bucket.total += lineTotal;
    }

    return [...map.values()].sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
  }, [orders]);

  const selectedShopOrdersTotal = useMemo(
    () => groupedBills.reduce((sum, bill) => sum + bill.total, 0),
    [groupedBills]
  );

  async function loadInitialData() {
    setApiError('');
    setIsLoading(true);

    try {
      const [shopsRes, productsRes] = await Promise.all([
        api.get('/shops'),
        api.get('/products')
      ]);

      setShops(shopsRes.data || []);
      setProducts(productsRes.data || []);
    } catch (error) {
      setApiError(getApiError(error, 'Failed to load shops/products'));
    } finally {
      setIsLoading(false);
    }
  }

  async function loadOrders(shopId) {
    if (!shopId) {
      setOrders([]);
      return;
    }

    try {
      const response = await api.get('/shop-orders', {
        params: { shopId }
      });
      setOrders(response.data || []);
    } catch (error) {
      setApiError(getApiError(error, 'Failed to load shop bills'));
    }
  }

  useEffect(() => {
    loadInitialData();
  }, [token]);

  useEffect(() => {
    loadOrders(selectedShopId);
  }, [selectedShopId]);

  function addLineItem() {
    setLineError('');

    if (!line.productId || !line.quantity || !line.unitPrice) {
      setLineError('Item, quantity, and unit price are required');
      return;
    }

    const product = products.find((p) => p.id === Number(line.productId));
    if (!product) {
      setLineError('Invalid product selected');
      return;
    }

    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice);

    if (!Number.isInteger(quantity) || quantity <= 0) {
      setLineError('Quantity must be a whole number greater than 0');
      return;
    }

    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setLineError('Unit price must be greater than 0');
      return;
    }

    const lineTotal = quantity * unitPrice;

    setCartItems((prev) => [
      ...prev,
      {
        key: `${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name,
        quantity,
        unitPrice,
        lineTotal
      }
    ]);

    setLine(emptyLine);
  }

  function removeLineItem(key) {
    setCartItems((prev) => prev.filter((item) => item.key !== key));
  }

  async function submitOrder(event) {
    event.preventDefault();
    setSaveError('');
    setCreatedBillNo('');

    if (!selectedShopId) {
      setSaveError('Please select a shop first');
      return;
    }

    if (!orderDate) {
      setSaveError('Order date is required');
      return;
    }

    if (cartItems.length === 0) {
      setSaveError('Add at least one item before saving');
      return;
    }

    setIsSaving(true);

    try {
      const response = await api.post('/shop-orders/bill', {
        shopId: Number(selectedShopId),
        orderDate,
        status,
        notes: notes.trim() || null,
        items: cartItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice
        }))
      });

      setCartItems([]);
      setLine(emptyLine);
      setNotes('');
      setCreatedBillNo(response.data?.billNo || '');
      await loadOrders(selectedShopId);
    } catch (error) {
      setSaveError(getApiError(error, 'Failed to save full bill'));
    } finally {
      setIsSaving(false);
    }
  }

  function printBill(bill) {
    const shopName = selectedShop?.name || 'Shop';
    const rowsHtml = bill.items.map((item, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${item.product?.name || '-'}</td>
        <td style="text-align:right;">${item.quantity}</td>
        <td style="text-align:right;">${Number(item.unitPrice).toFixed(2)}</td>
        <td style="text-align:right;">${Number(item.totalPrice).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
      <html>
        <head>
          <title>Invoice ${bill.billNo}</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: Arial, sans-serif; color: #0f172a; }
            .header { display:flex; justify-content:space-between; margin-bottom:16px; }
            h1 { margin:0; font-size:20px; }
            .meta { font-size:12px; line-height:1.6; }
            table { width:100%; border-collapse: collapse; font-size:12px; }
            th, td { border:1px solid #cbd5e1; padding:8px; }
            th { background:#f1f5f9; text-align:left; }
            .total { text-align:right; margin-top:12px; font-weight:700; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1>RDM Invoice</h1>
              <div class="meta">Bill No: ${bill.billNo}<br/>Date: ${new Date(bill.orderDate).toISOString().slice(0, 10)}<br/>Status: ${bill.status}</div>
            </div>
            <div class="meta" style="text-align:right;">Customer: ${shopName}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Description</th>
                <th>Qty</th>
                <th>Rate</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div class="total">Total: ${bill.total.toFixed(2)}</div>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <div className="space-y-6">
      <header className="rounded-xl bg-white p-6 shadow">
        <h1 className="text-2xl font-bold text-slate-900">Shop Orders</h1>
        <p className="mt-1 text-sm text-slate-600">Create one bill with multiple products, quantities, prices, and total.</p>
      </header>

      {apiError ? (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {apiError}
        </div>
      ) : null}

      <section className="grid gap-6 lg:grid-cols-2">
        <form className="rounded-xl bg-white p-6 shadow" onSubmit={submitOrder}>
          <h2 className="text-lg font-semibold text-slate-900">Create Full Bill</h2>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Shop *
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={selectedShopId}
                onChange={(event) => setSelectedShopId(event.target.value)}
              >
                <option value="">Select shop</option>
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {shop.name}{shop.shopCode ? ` (${shop.shopCode})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700">
              Bill Date *
              <input
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                type="date"
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
              />
            </label>

            <label className="text-sm font-medium text-slate-700">
              Status
              <select
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>

            <label className="text-sm font-medium text-slate-700 md:col-span-2">
              Notes
              <textarea
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                rows={2}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Optional notes for this bill"
              />
            </label>
          </div>

          <div className="mt-5 rounded border border-slate-200 p-4">
            <h3 className="text-sm font-semibold text-slate-900">Add Bill Item</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <label className="text-sm font-medium text-slate-700 md:col-span-2">
                Description / Product
                <select
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  value={line.productId}
                  onChange={(event) => setLine((prev) => ({ ...prev, productId: event.target.value }))}
                >
                  <option value="">Select product</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium text-slate-700">
                Qty
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  type="number"
                  min="1"
                  step="1"
                  value={line.quantity}
                  onChange={(event) => setLine((prev) => ({ ...prev, quantity: event.target.value }))}
                />
              </label>

              <label className="text-sm font-medium text-slate-700">
                Rate
                <input
                  className="mt-1 w-full rounded border border-slate-300 px-3 py-2"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={line.unitPrice}
                  onChange={(event) => setLine((prev) => ({ ...prev, unitPrice: event.target.value }))}
                />
              </label>
            </div>

            {lineError ? <p className="mt-2 text-sm text-red-600">{lineError}</p> : null}

            <button
              className="mt-3 rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700"
              type="button"
              onClick={addLineItem}
            >
              Add Item
            </button>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600">
                  <th className="px-3 py-2 font-medium">No.</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Qty</th>
                  <th className="px-3 py-2 font-medium">Rate</th>
                  <th className="px-3 py-2 font-medium">Amount</th>
                  <th className="px-3 py-2 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cartItems.map((item, index) => (
                  <tr key={item.key}>
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2">{item.quantity}</td>
                    <td className="px-3 py-2">{item.unitPrice.toFixed(2)}</td>
                    <td className="px-3 py-2">{item.lineTotal.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      <button
                        className="rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700"
                        type="button"
                        onClick={() => removeLineItem(item.key)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {cartItems.length === 0 ? <p className="mt-2 text-sm text-slate-600">No items added yet.</p> : null}
          </div>

          <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
            <p className="text-sm text-slate-700">
              Bill Total: <span className="font-semibold text-slate-900">{orderGrandTotal.toFixed(2)}</span>
            </p>
          </div>

          {saveError ? <p className="mt-3 text-sm text-red-600">{saveError}</p> : null}
          {createdBillNo ? <p className="mt-3 text-sm text-green-700">Bill saved successfully: {createdBillNo}</p> : null}

          <button
            className="mt-5 rounded bg-slate-900 px-4 py-2 font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={isSaving || isLoading}
          >
            {isSaving ? 'Saving...' : 'Save Full Bill'}
          </button>
        </form>

        <section className="rounded-xl bg-white p-6 shadow">
          <h2 className="text-lg font-semibold text-slate-900">{selectedShop ? `${selectedShop.name} Bills` : 'Select a shop to view bills'}</h2>

          <div className="mt-4 space-y-4">
            {groupedBills.map((bill) => (
              <div key={bill.billNo} className="rounded border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-slate-900">Bill No: {bill.billNo}</p>
                  <p className="text-xs text-slate-600">{new Date(bill.orderDate).toISOString().slice(0, 10)} | {bill.status}</p>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-slate-600">
                        <th className="px-3 py-2 font-medium">No.</th>
                        <th className="px-3 py-2 font-medium">Description</th>
                        <th className="px-3 py-2 font-medium">Qty</th>
                        <th className="px-3 py-2 font-medium">Rate</th>
                        <th className="px-3 py-2 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {bill.items.map((item, index) => (
                        <tr key={item.id}>
                          <td className="px-3 py-2">{index + 1}</td>
                          <td className="px-3 py-2">{item.product?.name || '-'}</td>
                          <td className="px-3 py-2">{item.quantity}</td>
                          <td className="px-3 py-2">{Number(item.unitPrice).toFixed(2)}</td>
                          <td className="px-3 py-2">{Number(item.totalPrice).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-2 text-right text-sm font-semibold text-slate-900">
                  Bill Total: {bill.total.toFixed(2)}
                </div>
                <div className="mt-2 text-right">
                  <button
                    className="rounded border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700"
                    type="button"
                    onClick={() => printBill(bill)}
                  >
                    Print Invoice
                  </button>
                </div>
              </div>
            ))}
            {selectedShop && groupedBills.length === 0 ? <p className="mt-2 text-sm text-slate-600">No bills found for this shop.</p> : null}
          </div>

          {selectedShop ? (
            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3">
              <p className="text-sm text-slate-700">
                All Bills Total: <span className="font-semibold text-slate-900">{selectedShopOrdersTotal.toFixed(2)}</span>
              </p>
            </div>
          ) : null}
        </section>
      </section>
    </div>
  );
}
