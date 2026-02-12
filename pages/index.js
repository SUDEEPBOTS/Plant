import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function PlantPos() {
  const [activeTab, setActiveTab] = useState('billing');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [shopName, setShopName] = useState('');
  
  // Theme State (Dark default)
  const [theme, setTheme] = useState('dark'); 

  // Payment & QR States
  const [paymentMode, setPaymentMode] = useState('Cash'); 
  const [showQr, setShowQr] = useState(false);

  // App Install States (PWA)
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);

  // Admin Form
  const [newItem, setNewItem] = useState({ name: '', price: '', stock: '', image: '' });

  useEffect(() => { 
    fetchProducts();
    fetchOrders();

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    });
  }, []);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const fetchProducts = async () => {
    setLoading(true);
    const res = await fetch('/api/products');
    const data = await res.json();
    if(data.success) setProducts(data.data);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const res = await fetch('/api/orders');
    const data = await res.json();
    if(data.success) setOrders(data.data);
  };

  // --- FACTORY RESET (ALL CLEAR) ---
  const handleFactoryReset = async () => {
    const confirm1 = confirm("⚠️ DANGER: Sab kuch delete ho jayega (Products, History, Stock).");
    if(!confirm1) return;
    
    const confirm2 = confirm("Pakka? Wapas nahi aayega data!");
    if(!confirm2) return;

    const userInput = prompt("Type 'DELETE' to confirm:");
    if(userInput !== 'DELETE') { alert("Reset Cancelled"); return; }

    setLoading(true);
    await fetch('/api/reset', { method: 'DELETE' });
    
    // Clear Local State
    setProducts([]);
    setOrders([]);
    setCart([]);
    alert("System Format Complete! 🧹");
    setLoading(false);
  };

  // --- IMAGE UPLOAD LOGIC ---
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if(file) {
        if(file.size > 1000000) { // Limit 1MB
            alert("Bhai photo 1MB se choti rakhna!");
            return;
        }
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewItem({ ...newItem, image: reader.result });
        };
        reader.readAsDataURL(file);
    }
  };

  // --- APP INSTALL LOGIC ---
  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBtn(false);
      }
      setDeferredPrompt(null);
    }
  };

  // --- CALCULATIONS ---
  const calculateTotal = () => cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const getCollectionReport = () => {
    let totalCash = 0;
    let totalOnline = 0;
    orders.forEach(o => {
        if(o.paymentMode === 'Online') totalOnline += o.totalAmount;
        else totalCash += o.totalAmount;
    });
    return { cash: totalCash, online: totalOnline, total: totalCash + totalOnline };
  };

  const getDayReport = () => {
    return products.map(p => {
        const totalSold = orders.reduce((acc, order) => {
            const item = order.items.find(i => i.name === p.name);
            return acc + (item ? item.qty : 0);
        }, 0);
        return { name: p.name, current: p.stock, sold: totalSold, loaded: p.stock + totalSold };
    });
  };

  // --- ACTIONS ---
  const addToCart = (product, qty = 1) => {
    if (product.stock < qty) { alert("Stock kam hai!"); return; }
    const existing = cart.find((item) => item._id === product._id);
    if (existing) {
      setCart(cart.map((item) => item._id === product._id ? { ...item, qty: item.qty + qty } : item));
    } else {
      setCart([...cart, { ...product, qty: qty }]);
    }
  };

  const removeFromCart = (id) => setCart(cart.filter((item) => item._id !== id));

  const shareOnWhatsApp = () => {
    if(cart.length === 0) return;
    let message = `*🧾 NEW BILL - ${shopName}*\n\n`;
    cart.forEach(item => {
        message += `${item.qty} x ${item.name} = ₹${item.price * item.qty}\n`;
    });
    message += `\n*TOTAL: ₹${calculateTotal()}*\nPaid via: ${paymentMode}\nDate: ${new Date().toLocaleDateString()}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleBillSubmit = async () => {
    if(cart.length === 0) return;
    if(!shopName) { alert("Dukan ka naam likh bhai!"); return; }
    if(paymentMode === 'Online' && !confirm("Kya QR Payment receive ho gayi?")) return;
    if(!confirm("Save Bill & Update Stock?")) return;

    await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopName, items: cart, totalAmount: calculateTotal(), paymentMode }),
    });

    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('invoice-area');
    const opt = { margin: 5, filename: `${shopName}_${Date.now()}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' } };
    html2pdf().set(opt).from(element).save();

    await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart }),
    });

    if(confirm("Bill PDF download ho gayi. WhatsApp pe bhejun?")) {
        shareOnWhatsApp();
    }

    setCart([]); setShopName(''); setPaymentMode('Cash'); setShowQr(false);
    fetchProducts(); fetchOrders();
  };

  const handleAiOrder = async () => {
    if(!aiPrompt) return;
    setLoading(true);
    try {
        const res = await fetch('/api/ai', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ prompt: aiPrompt }) });
        const orderItems = await res.json();
        orderItems.forEach(order => {
            const product = products.find(p => p._id === order._id);
            if(product) addToCart(product, order.qty);
        });
        setAiPrompt('');
    } catch(e) { alert("AI Error."); }
    setLoading(false);
  }

  const addProduct = async () => {
    if(!newItem.name) { alert("Naam to likh bhai"); return; }
    await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newItem) });
    setNewItem({ name: '', price: '', stock: '', image: '' });
    fetchProducts();
  };

  const deleteProduct = async (id) => {
    if(confirm("Delete?")) { await fetch(`/api/products?id=${id}`, { method: 'DELETE' }); fetchProducts(); }
  }

  // --- DYNAMIC STYLES (THEME) ---
  const isDark = theme === 'dark';
  const styles = {
    container: { background: isDark ? '#0a0a0a' : '#f0f2f5', color: isDark ? '#fff' : '#000', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '80px', transition: '0.3s' },
    header: { padding: '15px', borderBottom: `1px solid ${isDark ? '#333' : '#ddd'}`, textAlign: 'center', color: '#4caf50', fontSize: '24px', fontWeight: 'bold', display:'flex', justifyContent:'space-between', alignItems:'center', background: isDark ? '#0a0a0a' : '#fff' },
    nav: { position: 'fixed', bottom: 0, width: '100%', background: isDark ? '#111' : '#fff', display: 'flex', borderTop: `1px solid ${isDark ? '#333' : '#ddd'}`, zIndex: 100, boxShadow: '0 -2px 10px rgba(0,0,0,0.1)' },
    navBtn: (active) => ({ flex: 1, padding: '10px', background: 'none', border: 'none', color: active ? '#4caf50' : (isDark ? '#666' : '#999'), fontWeight: 'bold', fontSize:'12px', display: 'flex', flexDirection: 'column', alignItems: 'center' }),
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px' },
    card: { background: isDark ? '#1a1a1a' : '#fff', padding: '10px', borderRadius: '8px', border: `1px solid ${isDark ? '#333' : '#e0e0e0'}`, textAlign: 'center', position: 'relative', boxShadow: isDark ? 'none' : '0 2px 5px rgba(0,0,0,0.05)' },
    btn: { width: '100%', padding: '12px', background: '#4caf50', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 'bold', marginTop: '5px', cursor: 'pointer' },
    input: { width: '100%', padding: '12px', background: isDark ? '#000' : '#fff', border: `1px solid ${isDark ? '#333' : '#ccc'}`, color: isDark ? '#fff' : '#000', borderRadius: '4px', marginBottom: '10px', boxSizing: 'border-box' },
    pill: (active) => ({ padding: '8px 15px', borderRadius: '20px', border: '1px solid #4caf50', background: active ? '#4caf50' : 'transparent', color: active ? '#fff' : (isDark ? '#fff' : '#000'), cursor:'pointer', fontSize:'14px' }),
    installBtn: { position: 'fixed', top: '60px', right: '15px', background: '#4caf50', color: '#fff', border: 'none', padding: '5px 12px', borderRadius: '20px', fontWeight: 'bold', zIndex: 90, cursor: 'pointer', fontSize: '12px', boxShadow: '0 2px 5px rgba(0,0,0,0.2)' },
    dangerBtn: { width: '100%', padding: '15px', background: '#ff3d00', border: 'none', borderRadius: '4px', color: '#fff', fontWeight: 'bold', marginTop: '30px', cursor: 'pointer' }
  };

  const collection = getCollectionReport();

  return (
    <div style={styles.container}>
      <Head>
        <title>PLANT POS</title>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content={isDark ? "#0a0a0a" : "#f0f2f5"} />
        {/* ZOOM FIX META TAG */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      {/* Install Button */}
      {showInstallBtn && (
        <button style={styles.installBtn} onClick={installApp}>⬇ Install App</button>
      )}

      {/* HEADER WITH THEME TOGGLE */}
      <div style={styles.header}>
        <span>PLANT MANAGER {loading && '...'}</span>
        <button onClick={toggleTheme} style={{background:'none', border:'none', fontSize:'20px', cursor:'pointer'}}>
            {isDark ? '☀️' : '🌙'}
        </button>
      </div>

      {/* BILLING TAB */}
      {activeTab === 'billing' && (
        <>
            <div style={{padding:'10px', background: isDark ? '#111' : '#fff', borderBottom: styles.header.borderBottom}}>
                <input style={{...styles.input, border:'1px solid #4caf50'}} placeholder="Dukan Name (e.g. Raju Bhai)" value={shopName} onChange={e => setShopName(e.target.value)} />
                <div style={{display:'flex', gap:'10px'}}>
                    <input style={{...styles.input, marginBottom:0}} placeholder="AI: '2 coke'" value={aiPrompt} onChange={e => setAiPrompt(e.target.value)} />
                    <button onClick={handleAiOrder} style={{...styles.btn, width:'60px', marginTop:0}}>GO</button>
                </div>
            </div>

            <div style={styles.grid}>
                {products.map(p => (
                <div key={p._id} style={styles.card} onClick={() => addToCart(p)}>
                    <div style={{fontSize:'10px', color:'#888', position: 'absolute', top: 5, right: 5}}>Qty: {p.stock}</div>
                    
                    {/* PHOTO DISPLAY */}
                    {p.image ? (
                        <img src={p.image} alt={p.name} style={{width:'100%', height:'100px', objectFit:'cover', borderRadius:'4px', marginBottom:'5px'}} />
                    ) : (
                        <div style={{width:'100%', height:'80px', background: isDark ? '#222' : '#eee', borderRadius:'4px', marginBottom:'5px', display:'flex', alignItems:'center', justifyContent:'center', color:'#555'}}>No Photo</div>
                    )}

                    <div style={{fontWeight:'bold', margin:'5px 0', fontSize:'14px'}}>{p.name}</div>
                    <div style={{color:'#4caf50'}}>₹{p.price}</div>
                </div>
                ))}
            </div>

            {/* LIVE BILL */}
            {cart.length > 0 && (
                <div style={{padding:'15px', background: isDark ? '#1a1a1a' : '#fff', borderTop: styles.header.borderBottom}}>
                    
                    <div id="invoice-area" style={{background:'#fff', padding:'10px', color:'black', borderRadius:'5px', marginBottom:'15px', border:'1px solid #ccc'}}>
                        <h3 style={{borderBottom:'1px solid #000', margin:'0 0 10px 0', display:'flex', justifyContent:'space-between'}}>
                            <span>INVOICE</span> <span>{new Date().toLocaleDateString()}</span>
                        </h3>
                        <div style={{marginBottom:'10px', fontWeight:'bold'}}>Shop: {shopName}</div>
                        <table style={{width:'100%', fontSize:'14px', borderCollapse:'collapse'}}>
                            <tbody>
                                {cart.map((item, i) => (
                                    <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                                        <td>{item.name}</td><td style={{textAlign:'center'}}>{item.qty}</td><td style={{textAlign:'right'}}>₹{item.price * item.qty}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div style={{textAlign:'right', marginTop:'15px', fontSize:'18px', fontWeight:'bold'}}>Total: ₹{calculateTotal()}</div>
                        <div style={{marginTop: '10px', fontSize: '12px', borderTop: '1px solid #ccc', paddingTop: '5px'}}>Payment Mode: <b>{paymentMode.toUpperCase()}</b></div>
                    </div>

                    <h4 style={{margin:'0 0 10px 0', color: isDark ? '#ccc' : '#666'}}>Payment Method:</h4>
                    <div style={{display:'flex', gap:'15px', marginBottom:'15px'}}>
                        <button onClick={() => { setPaymentMode('Cash'); setShowQr(false); }} style={styles.pill(paymentMode === 'Cash')}>💵 CASH</button>
                        <button onClick={() => { setPaymentMode('Online'); setShowQr(true); }} style={styles.pill(paymentMode === 'Online')}>📱 ONLINE (QR)</button>
                    </div>

                    {showQr && (
                        <div style={{textAlign:'center', marginBottom:'15px', background:'#fff', padding:'10px', borderRadius:'8px', border:'1px solid #ccc'}}>
                            {/* Updated QR Code */}
                            <img src="https://files.catbox.moe/jedcoz.png" alt="Pay QR" style={{width:'200px', height:'200px'}} />
                            <div style={{color:'black', fontWeight:'bold', marginTop:'5px'}}>Scan to Pay</div>
                        </div>
                    )}

                    <button onClick={handleBillSubmit} style={styles.btn}>✅ SAVE & DOWNLOAD</button>
                    <button onClick={shareOnWhatsApp} style={{...styles.btn, background:'#25D366', marginTop:'10px'}}>💬 SEND (WhatsApp)</button>
                </div>
            )}
        </>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div style={{padding:'20px'}}>
            <h2>Sales History</h2>
            {orders.map(order => (
                <div key={order._id} style={{background: isDark ? '#1a1a1a' : '#fff', padding:'15px', marginBottom:'10px', borderRadius:'8px', borderLeft:`4px solid ${order.paymentMode === 'Online' ? '#00e676' : '#ffea00'}`, boxShadow: styles.card.boxShadow}}>
                    <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold', fontSize:'18px'}}>
                        <span>{order.shopName}</span>
                        <span style={{color:'#4caf50'}}>₹{order.totalAmount}</span>
                    </div>
                    <div style={{fontSize:'12px', color:'#888', marginTop:'5px', display:'flex', justifyContent:'space-between'}}>
                        <span>{new Date(order.date).toLocaleString()}</span>
                        <span style={{fontWeight:'bold', color: order.paymentMode === 'Online' ? '#00e676' : '#e6b800'}}>{order.paymentMode}</span>
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* ADMIN TAB */}
      {activeTab === 'admin' && (
        <div style={{padding:'20px'}}>
            
            {/* COLLECTION REPORT */}
            <div style={{background: isDark ? '#111' : '#fff', padding:'15px', borderRadius:'8px', border: styles.header.borderBottom, marginBottom:'20px'}}>
                <h3 style={{marginTop:0, color:'#4caf50'}}>💰 COLLECTION REPORT</h3>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                    <span>💵 MERE PAAS (Cash):</span>
                    <span style={{color: isDark ? '#ffea00' : '#d4a000', fontWeight:'bold', fontSize:'18px'}}>₹{collection.cash}</span>
                </div>
                <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                    <span>📱 ONLINE (Bank):</span>
                    <span style={{color:'#00e676', fontWeight:'bold', fontSize:'18px'}}>₹{collection.online}</span>
                </div>
                <div style={{borderTop:`1px solid ${isDark ? '#444' : '#ddd'}`, paddingTop:'10px', display:'flex', justifyContent:'space-between'}}>
                    <span>TOTAL SELL:</span>
                    <span style={{fontWeight:'bold', fontSize:'18px'}}>₹{collection.total}</span>
                </div>
            </div>

            {/* STOCK REPORT */}
            <div style={{background: isDark ? '#111' : '#fff', padding:'15px', borderRadius:'8px', border: styles.header.borderBottom, marginBottom:'30px'}}>
                <h3 style={{marginTop:0, color:'#4caf50'}}>🚚 STOCK REPORT</h3>
                <table style={{width:'100%', fontSize:'12px', textAlign:'left'}}>
                    <thead>
                        <tr style={{color:'#888', borderBottom: styles.header.borderBottom}}>
                            <th style={{paddingBottom:'10px'}}>ITEM</th>
                            <th>SOLD</th>
                            <th>BAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {getDayReport().map((r, i) => (
                            <tr key={i} style={{borderBottom: `1px solid ${isDark ? '#222' : '#eee'}`}}>
                                <td style={{padding:'8px 0'}}>{r.name}</td>
                                <td style={{color:'#ff3d00', fontWeight:'bold'}}>{r.sold}</td>
                                <td style={{color:'#4caf50', fontWeight:'bold'}}>{r.current}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <h3>Add New Item</h3>
            <input placeholder="Name" style={styles.input} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <input placeholder="Price" type="number" style={styles.input} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            <input placeholder="Stock" type="number" style={styles.input} value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} />
            
            {/* PHOTO UPLOAD */}
            <div style={{marginBottom:'10px'}}>
                <label style={{display:'block', marginBottom:'5px', color:'#888', fontSize:'12px'}}>Item Photo (Optional)</label>
                <input type="file" accept="image/*" onChange={handleImageUpload} style={{color: isDark ? '#fff' : '#000'}} />
            </div>

            <button o
