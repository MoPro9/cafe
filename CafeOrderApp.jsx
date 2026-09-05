import { useState, useEffect, useMemo, useCallback } from "react";

const FONT_IMPORT = "@import url('https://fonts.googleapis.com/css2?family=Reem+Kufi:wght@400..700&family=Tajawal:wght@400;500;700&display=swap');";

const DEFAULT_MENU = [
  { id: "esp", category: "قهوة ساخنة", name: "اسبريسو", price: 150, desc: "جرعة قهوة مركزة", available: true },
  { id: "amr", category: "قهوة ساخنة", name: "قهوة أمريكية", price: 180, desc: "اسبريسو مخفف بالماء الساخن", available: true },
  { id: "cap", category: "قهوة ساخنة", name: "كابتشينو", price: 220, desc: "اسبريسو مع حليب مبخر ورغوة", available: true },
  { id: "lat", category: "قهوة ساخنة", name: "لاتيه", price: 240, desc: "اسبريسو مع حليب حريري", available: true },
  { id: "moc", category: "قهوة ساخنة", name: "موكا", price: 260, desc: "اسبريسو مع شوكولاطة وحليب", available: true },

  { id: "ice-lat", category: "قهوة باردة", name: "آيس لاتيه", price: 260, desc: "قهوة باردة مع حليب وثلج", available: true },
  { id: "ice-amr", category: "قهوة باردة", name: "آيس أمريكانو", price: 200, desc: "اسبريسو مثلج", available: true },
  { id: "frap", category: "قهوة باردة", name: "فرابتشينو", price: 320, desc: "قهوة مخفوقة بالثلج والكريمة", available: true },

  { id: "tea", category: "مشروبات أخرى", name: "شاي أحمر", price: 100, desc: "شاي تقليدي بالنعناع", available: true },
  { id: "hib", category: "مشروبات أخرى", name: "عصير طبيعي", price: 220, desc: "حسب الموسم", available: true },
  { id: "hot-choc", category: "مشروبات أخرى", name: "شوكولاطة ساخنة", price: 240, desc: "شوكولاطة غنية ومخملية", available: true },

  { id: "crois", category: "معجنات", name: "كرواسون زبدة", price: 150, desc: "طازج يوميا", available: true },
  { id: "muff", category: "معجنات", name: "مافن شوكولاطة", price: 170, desc: "مع قطع شوكولاطة داكنة", available: true },
  { id: "cheesecake", category: "معجنات", name: "تشيز كيك", price: 280, desc: "قطعة كلاسيكية", available: true },
];

const STATUS_FLOW = ["جديد", "قيد التحضير", "جاهز", "تم التسليم"];
const STATUS_COLOR = {
  "جديد": { bg: "#F5DCC7", fg: "#7A3A12" },
  "قيد التحضير": { bg: "#E4E0C4", fg: "#5B5A1E" },
  "جاهز": { bg: "#D9E3CB", fg: "#3F5A22" },
  "تم التسليم": { bg: "#E2DCD2", fg: "#6B5F50" },
};

function genId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function currency(n) {
  return `${Math.round(n).toLocaleString("ar-DZ")} د.ج`;
}

export default function CafeOrderApp() {
  const [menu, setMenu] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState("customer"); // customer | staff
  const [staffTab, setStaffTab] = useState("orders"); // orders | menu
  const [activeCategory, setActiveCategory] = useState(null);
  const [cart, setCart] = useState({}); // id -> qty
  const [cartOpen, setCartOpen] = useState(false);
  const [tableNumber, setTableNumber] = useState("");
  const [confirmedOrder, setConfirmedOrder] = useState(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [newItem, setNewItem] = useState({ name: "", price: "", category: "", desc: "" });
  const [storageError, setStorageError] = useState(false);

  const loadMenu = useCallback(async () => {
    try {
      const res = await window.storage.get("menu", true);
      if (res && res.value) {
        const parsed = JSON.parse(res.value);
        setMenu(parsed);
        setActiveCategory((prev) => prev || parsed[0]?.category || null);
      } else {
        await window.storage.set("menu", JSON.stringify(DEFAULT_MENU), true);
        setMenu(DEFAULT_MENU);
        setActiveCategory(DEFAULT_MENU[0].category);
      }
    } catch (e) {
      setMenu(DEFAULT_MENU);
      setActiveCategory(DEFAULT_MENU[0].category);
      setStorageError(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    try {
      const list = await window.storage.list("order:", true);
      if (list && list.keys && list.keys.length) {
        const items = await Promise.all(
          list.keys.map(async (k) => {
            try {
              const r = await window.storage.get(k, true);
              return r ? JSON.parse(r.value) : null;
            } catch {
              return null;
            }
          })
        );
        setOrders(items.filter(Boolean).sort((a, b) => b.createdAt - a.createdAt));
      } else {
        setOrders([]);
      }
    } catch (e) {
      // ignore
    }
    setOrdersLoading(false);
  }, []);

  useEffect(() => {
    if (mode === "staff" && staffTab === "orders") loadOrders();
  }, [mode, staffTab, loadOrders]);

  const categories = useMemo(() => {
    if (!menu) return [];
    return [...new Set(menu.map((m) => m.category))];
  }, [menu]);

  const cartItems = useMemo(() => {
    if (!menu) return [];
    return Object.entries(cart)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = menu.find((m) => m.id === id);
        return item ? { ...item, qty } : null;
      })
      .filter(Boolean);
  }, [cart, menu]);

  const cartTotal = cartItems.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = cartItems.reduce((sum, i) => sum + i.qty, 0);

  function changeQty(id, delta) {
    setCart((prev) => {
      const next = { ...prev };
      const cur = next[id] || 0;
      const updated = Math.max(0, cur + delta);
      if (updated === 0) delete next[id];
      else next[id] = updated;
      return next;
    });
  }

  async function submitOrder() {
    if (cartItems.length === 0) return;
    const order = {
      id: genId("order:"),
      table: tableNumber.trim() || "بدون رقم",
      items: cartItems.map((i) => ({ id: i.id, name: i.name, price: i.price, qty: i.qty })),
      total: cartTotal,
      status: "جديد",
      createdAt: Date.now(),
    };
    try {
      await window.storage.set(order.id, JSON.stringify(order), true);
      setConfirmedOrder(order);
      setCart({});
      setCartOpen(false);
    } catch (e) {
      setStorageError(true);
    }
  }

  async function advanceStatus(order) {
    const idx = STATUS_FLOW.indexOf(order.status);
    const nextStatus = STATUS_FLOW[Math.min(idx + 1, STATUS_FLOW.length - 1)];
    const updated = { ...order, status: nextStatus };
    setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
    try {
      await window.storage.set(order.id, JSON.stringify(updated), true);
    } catch (e) {
      loadOrders();
    }
  }

  async function saveMenu(nextMenu) {
    setMenu(nextMenu);
    try {
      await window.storage.set("menu", JSON.stringify(nextMenu), true);
    } catch (e) {
      setStorageError(true);
    }
  }

  function toggleAvailable(id) {
    if (!menu) return;
    saveMenu(menu.map((m) => (m.id === id ? { ...m, available: !m.available } : m)));
  }

  function deleteItem(id) {
    if (!menu) return;
    saveMenu(menu.filter((m) => m.id !== id));
  }

  function addItem(e) {
    e.preventDefault();
    if (!newItem.name.trim() || !newItem.price || !newItem.category.trim()) return;
    const item = {
      id: genId("item"),
      name: newItem.name.trim(),
      price: Number(newItem.price),
      category: newItem.category.trim(),
      desc: newItem.desc.trim(),
      available: true,
    };
    saveMenu([...(menu || []), item]);
    setNewItem({ name: "", price: "", category: "", desc: "" });
  }

  if (loading) {
    return (
      <div dir="rtl" style={{ ...pageStyle, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300 }}>
        <style>{FONT_IMPORT}</style>
        <p style={{ fontFamily: "Tajawal, sans-serif", color: "#8A7B68" }}>...جارٍ التحميل</p>
      </div>
    );
  }

  return (
    <div dir="rtl" style={pageStyle}>
      <style>{`
        ${FONT_IMPORT}
        .cafe-btn { font-family: 'Tajawal', sans-serif; cursor: pointer; border: none; }
        .cafe-btn:active { transform: scale(0.98); }
        .qty-btn { width: 30px; height: 30px; border-radius: 50%; border: 1.5px solid #2C1A10; background: #fff; font-size: 18px; line-height: 1; cursor: pointer; color:#2C1A10; }
        .cat-pill { font-family: 'Tajawal', sans-serif; padding: 8px 18px; border-radius: 20px; border: 1.5px solid #2C1A10; background: transparent; font-size: 14px; white-space: nowrap; cursor: pointer; color: #2C1A10; }
        .cat-pill.active { background: #2C1A10; color: #EDE4D3; }
        input, textarea { font-family: 'Tajawal', sans-serif; }
      `}</style>

      <header style={{ padding: "22px 20px 14px", borderBottom: "1.5px solid #DED2B8" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1 style={{ fontFamily: "'Reem Kufi', sans-serif", fontSize: 26, margin: 0, color: "#2C1A10" }}>محل القهوة</h1>
          <button
            className="cafe-btn"
            onClick={() => setMode(mode === "customer" ? "staff" : "customer")}
            style={{ fontSize: 13, background: "transparent", color: "#8A7B68", textDecoration: "underline", padding: 4 }}
          >
            {mode === "customer" ? "لوحة تحكم الموظفين" : "عرض العميل"}
          </button>
        </div>
        {mode === "customer" && <p style={{ fontFamily: "Tajawal, sans-serif", color: "#8A7B68", margin: "4px 0 0", fontSize: 14 }}>اختر ما يعجبك وأضفه إلى الطلب</p>}
      </header>

      {storageError && (
        <div style={{ margin: "12px 20px 0", padding: "10px 14px", background: "#F5DCC7", color: "#7A3A12", borderRadius: 10, fontFamily: "Tajawal, sans-serif", fontSize: 13 }}>
          تعذّر حفظ البيانات مؤقتا، جرّب مرة أخرى.
        </div>
      )}

      {mode === "customer" ? (
        <CustomerView
          menu={menu}
          categories={categories}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          cart={cart}
          changeQty={changeQty}
          cartCount={cartCount}
          cartTotal={cartTotal}
          setCartOpen={setCartOpen}
        />
      ) : (
        <StaffView
          staffTab={staffTab}
          setStaffTab={setStaffTab}
          orders={orders}
          ordersLoading={ordersLoading}
          loadOrders={loadOrders}
          advanceStatus={advanceStatus}
          menu={menu}
          toggleAvailable={toggleAvailable}
          deleteItem={deleteItem}
          newItem={newItem}
          setNewItem={setNewItem}
          addItem={addItem}
        />
      )}

      {mode === "customer" && cartOpen && (
        <CartModal
          cartItems={cartItems}
          cartTotal={cartTotal}
          changeQty={changeQty}
          tableNumber={tableNumber}
          setTableNumber={setTableNumber}
          onClose={() => setCartOpen(false)}
          onSubmit={submitOrder}
        />
      )}

      {mode === "customer" && confirmedOrder && (
        <ConfirmModal order={confirmedOrder} onClose={() => setConfirmedOrder(null)} />
      )}
    </div>
  );
}

const pageStyle = {
  fontFamily: "'Tajawal', sans-serif",
  background: "#EDE4D3",
  color: "#241811",
  minHeight: 300,
  paddingBottom: mode_pad(),
};
function mode_pad() { return 90; }

function CustomerView({ menu, categories, activeCategory, setActiveCategory, cart, changeQty, cartCount, cartTotal, setCartOpen }) {
  const shown = menu.filter((m) => m.category === activeCategory && m.available);
  return (
    <div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "16px 20px", WebkitOverflowScrolling: "touch" }}>
        {categories.map((c) => (
          <button key={c} className={`cat-pill${c === activeCategory ? " active" : ""}`} onClick={() => setActiveCategory(c)}>
            {c}
          </button>
        ))}
      </div>

      <div style={{ padding: "0 20px", display: "flex", flexDirection: "column", gap: 12 }}>
        {shown.length === 0 && (
          <p style={{ color: "#8A7B68", fontSize: 14 }}>لا توجد أصناف متاحة حاليا في هذا القسم.</p>
        )}
        {shown.map((item) => {
          const qty = cart[item.id] || 0;
          return (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F7F2E7", borderRadius: 14, padding: "14px 16px", border: "1px solid #E2D6BC" }}>
              <div style={{ flex: 1, paddingLeft: 10 }}>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{item.name}</p>
                {item.desc && <p style={{ margin: "3px 0 0", fontSize: 12.5, color: "#8A7B68" }}>{item.desc}</p>}
                <p style={{ margin: "6px 0 0", fontSize: 14, color: "#A8552E", fontWeight: 700 }}>{currency(item.price)}</p>
              </div>
              {qty === 0 ? (
                <button className="cafe-btn" onClick={() => changeQty(item.id, 1)} style={{ background: "#2C1A10", color: "#EDE4D3", borderRadius: 20, padding: "8px 18px", fontSize: 13, fontWeight: 700 }}>
                  إضافة
                </button>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                  <span style={{ minWidth: 16, textAlign: "center", fontWeight: 700 }}>{qty}</span>
                  <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {cartCount > 0 && (
        <div style={{ position: "sticky", bottom: 0, padding: "12px 20px", background: "linear-gradient(transparent, #EDE4D3 30%)" }}>
          <button
            className="cafe-btn"
            onClick={() => setCartOpen(true)}
            style={{ width: "100%", background: "#A8552E", color: "#FBF0E5", borderRadius: 14, padding: "14px 18px", fontSize: 15, fontWeight: 700, display: "flex", justifyContent: "space-between", alignItems: "center" }}
          >
            <span>عرض الطلب ({cartCount})</span>
            <span>{currency(cartTotal)}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function CartModal({ cartItems, cartTotal, changeQty, tableNumber, setTableNumber, onClose, onSubmit }) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={sheetStyle} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ fontFamily: "'Reem Kufi', sans-serif", fontSize: 20, margin: "0 0 14px" }}>طلبك</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 260, overflowY: "auto" }}>
          {cartItems.map((item) => (
            <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>{item.name}</p>
                <p style={{ margin: 0, fontSize: 12.5, color: "#8A7B68" }}>{currency(item.price)} × {item.qty}</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                <span style={{ minWidth: 14, textAlign: "center" }}>{item.qty}</span>
                <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
              </div>
            </div>
          ))}
        </div>

        <div style={{ borderTop: "1px solid #E2D6BC", marginTop: 14, paddingTop: 12, display: "flex", justifyContent: "space-between", fontWeight: 700 }}>
          <span>المجموع</span>
          <span style={{ color: "#A8552E" }}>{currency(cartTotal)}</span>
        </div>

        <label style={{ display: "block", fontSize: 13, color: "#8A7B68", margin: "16px 0 6px" }}>رقم الطاولة (اختياري)</label>
        <input
          value={tableNumber}
          onChange={(e) => setTableNumber(e.target.value)}
          placeholder="مثال: 4"
          style={inputStyle}
        />

        <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
          <button className="cafe-btn" onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, background: "transparent", border: "1.5px solid #2C1A10", color: "#2C1A10", fontWeight: 700 }}>
            رجوع
          </button>
          <button className="cafe-btn" onClick={onSubmit} style={{ flex: 2, padding: "12px", borderRadius: 12, background: "#2C1A10", color: "#EDE4D3", fontWeight: 700 }}>
            تأكيد الطلب
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({ order, onClose }) {
  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={{ ...sheetStyle, textAlign: "center" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 40, marginBottom: 8 }}>☕</div>
        <h2 style={{ fontFamily: "'Reem Kufi', sans-serif", fontSize: 20, margin: "0 0 6px" }}>تم إرسال طلبك</h2>
        <p style={{ color: "#8A7B68", fontSize: 14, margin: "0 0 16px" }}>
          الطاولة {order.table} — سيتم تحضير طلبك قريبا
        </p>
        <div style={{ background: "#F7F2E7", borderRadius: 12, padding: 14, textAlign: "right", marginBottom: 16 }}>
          {order.items.map((i) => (
            <div key={i.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 4 }}>
              <span>{i.name} × {i.qty}</span>
              <span>{currency(i.price * i.qty)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, marginTop: 8, paddingTop: 8, borderTop: "1px solid #E2D6BC" }}>
            <span>المجموع</span>
            <span>{currency(order.total)}</span>
          </div>
        </div>
        <button className="cafe-btn" onClick={onClose} style={{ width: "100%", padding: 12, borderRadius: 12, background: "#2C1A10", color: "#EDE4D3", fontWeight: 700 }}>
          حسنا
        </button>
      </div>
    </div>
  );
}

function StaffView({ staffTab, setStaffTab, orders, ordersLoading, loadOrders, advanceStatus, menu, toggleAvailable, deleteItem, newItem, setNewItem, addItem }) {
  return (
    <div style={{ padding: "16px 20px" }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button className={`cat-pill${staffTab === "orders" ? " active" : ""}`} onClick={() => setStaffTab("orders")}>الطلبات</button>
        <button className={`cat-pill${staffTab === "menu" ? " active" : ""}`} onClick={() => setStaffTab("menu")}>إدارة القائمة</button>
        {staffTab === "orders" && (
          <button className="cat-pill" onClick={loadOrders} style={{ marginRight: "auto" }}>تحديث</button>
        )}
      </div>

      {staffTab === "orders" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ordersLoading && <p style={{ color: "#8A7B68", fontSize: 14 }}>...جارٍ التحميل</p>}
          {!ordersLoading && orders.length === 0 && <p style={{ color: "#8A7B68", fontSize: 14 }}>لا توجد طلبات بعد.</p>}
          {orders.map((order) => {
            const color = STATUS_COLOR[order.status] || STATUS_COLOR["جديد"];
            const isFinal = order.status === "تم التسليم";
            return (
              <div key={order.id} style={{ background: "#F7F2E7", border: "1px solid #E2D6BC", borderRadius: 14, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>الطاولة {order.table}</p>
                    <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8A7B68" }}>{new Date(order.createdAt).toLocaleTimeString("ar-DZ", { hour: "2-digit", minute: "2-digit" })}</p>
                  </div>
                  <span style={{ background: color.bg, color: color.fg, borderRadius: 20, padding: "5px 12px", fontSize: 12.5, fontWeight: 700 }}>{order.status}</span>
                </div>
                <div style={{ margin: "10px 0", fontSize: 13.5 }}>
                  {order.items.map((i) => (
                    <div key={i.id} style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span>{i.name} × {i.qty}</span>
                      <span style={{ color: "#8A7B68" }}>{currency(i.price * i.qty)}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{currency(order.total)}</span>
                  {!isFinal && (
                    <button className="cafe-btn" onClick={() => advanceStatus(order)} style={{ background: "#2C1A10", color: "#EDE4D3", borderRadius: 10, padding: "8px 16px", fontSize: 13, fontWeight: 700 }}>
                      نقل إلى: {STATUS_FLOW[STATUS_FLOW.indexOf(order.status) + 1]}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
            {menu.map((item) => (
              <div key={item.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F7F2E7", border: "1px solid #E2D6BC", borderRadius: 12, padding: "10px 14px", opacity: item.available ? 1 : 0.55 }}>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 14 }}>{item.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "#8A7B68" }}>{item.category} · {currency(item.price)}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="cafe-btn" onClick={() => toggleAvailable(item.id)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #2C1A10", background: "transparent" }}>
                    {item.available ? "إخفاء" : "إظهار"}
                  </button>
                  <button className="cafe-btn" onClick={() => deleteItem(item.id)} style={{ fontSize: 12, padding: "6px 10px", borderRadius: 8, border: "1px solid #A8552E", color: "#A8552E", background: "transparent" }}>
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: "#F7F2E7", border: "1px solid #E2D6BC", borderRadius: 14, padding: 16 }}>
            <h3 style={{ fontFamily: "'Reem Kufi', sans-serif", fontSize: 16, margin: "0 0 12px" }}>إضافة صنف جديد</h3>
            <form onSubmit={addItem} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input placeholder="اسم الصنف" value={newItem.name} onChange={(e) => setNewItem({ ...newItem, name: e.target.value })} style={inputStyle} />
              <input placeholder="القسم (مثال: قهوة ساخنة)" value={newItem.category} onChange={(e) => setNewItem({ ...newItem, category: e.target.value })} style={inputStyle} />
              <input placeholder="السعر (د.ج)" type="number" value={newItem.price} onChange={(e) => setNewItem({ ...newItem, price: e.target.value })} style={inputStyle} />
              <input placeholder="وصف مختصر (اختياري)" value={newItem.desc} onChange={(e) => setNewItem({ ...newItem, desc: e.target.value })} style={inputStyle} />
              <button className="cafe-btn" type="submit" style={{ background: "#2C1A10", color: "#EDE4D3", borderRadius: 10, padding: "10px", fontWeight: 700 }}>
                إضافة إلى القائمة
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const overlayStyle = {
  position: "fixed",
  inset: 0,
  background: "rgba(36,24,17,0.5)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  zIndex: 50,
};

const sheetStyle = {
  background: "#EDE4D3",
  width: "100%",
  maxWidth: 480,
  borderRadius: "20px 20px 0 0",
  padding: "22px 20px 26px",
  fontFamily: "'Tajawal', sans-serif",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 10,
  border: "1.5px solid #DED2B8",
  background: "#FBF7EE",
  fontSize: 14,
  boxSizing: "border-box",
  color: "#241811",
};
