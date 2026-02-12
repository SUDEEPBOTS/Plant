import { useState, useEffect } from 'react';
import Head from 'next/head';

export default function PlantPos() {
  const [activeTab, setActiveTab] = useState('billing');
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  
  // Admin Form State
  const [newItem, setNewItem] = useState({ name: '', price: '', stock: '', image: '' });

  // Load Data
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    const res = await fetch('/api/products');
    const data = await res.json();
    if(data.success) setProducts(data.data);
    setLoading(false);
  };

  // --- ACTIONS ---

  const addToCart = (product, qty = 1) => {
    if (product.stock < qty) {
      alert(`Stock kam hai! Sirf ${product.stock} bache hain.`);
      return;
    }
    const existing = cart.find((item) => item._id === product._id);
    if (existing) {
      setCart(cart.map((item) => item._id === product._id ? { ...item, qty: item.qty + qty } : item));
    } else {
      setCart([...cart, { ...product, qty: qty }]);
    }
  };

  const removeFromCart = (id) => {
    setCart(cart.filter((item) => item._id !== id));
  };

  const calculateTotal = () => {
    return cart.reduce((acc, item) => acc + (item.price * item.qty), 0);
  };

  const handleBillSubmit = async () => {
    if(cart.length === 0) return;
    if(!confirm("Bill print karein? Stock update ho jayega.")) return;

    // 1. Generate PDF (Dynamic Import)
    const html2pdf = (await import('html2pdf.js')).default;
    const element = document.getElementById('invoice-area');
    const opt = {
      margin: 5,
      filename: `Bill_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();

    // 2. Update Stock in DB
    await fetch('/api/products', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart }),
    });

    // 3. Reset
    setCart([]);
    fetchProducts(); // Refresh stock display
  };

  // --- AI HANDLER ---
  const handleAiOrder = async () => {
    if(!aiPrompt) return;
    setLoading(true);
    try {
        const res = await fetch('/api/ai', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ prompt: aiPrompt })
        });
        const orderItems = await res.json();
        
        // Add items to cart based on ID
        orderItems.forEach(order => {
            const product = products.find(p => p._id === order._id);
            if(product) addToCart(product, order.qty);
        });
        setAiPrompt('');
    } catch(e) {
        alert("AI Error. Try again.");
    }
    setLoading(false);
  }

  // --- ADMIN HANDLER ---
  const addProduct = async () => {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newItem),
    });
    setNewItem({ name: '', price: '', stock: '', image: '' });
    fetchProducts();
    alert("Item Added!");
  };

  const deleteProduct = async (id) => {
    if(confirm("Delete karna hai?")) {
        await fetch(`/api/products?id=${id}`, { method: 'DELETE' });
        fetchProducts();
    }
  }

  // --- STYLES ---
  const styles = {
    container: { background: '#0a0a0a', color: '#fff', minHeight: '100vh', fontFamily: 'sans-serif', paddingBottom: '60px' },
    header: { padding: '15px', borderBottom: '1px solid #333', textAlign: 'center', color: '#4caf50', fontSize: '24px', fontWeight: 'bold', textTransform: 'uppercase' },
    nav: { position: 'fixed', bottom: 0, width: '100%', background: '#111', display: 'flex', borderTop: '1px solid #333' },
    navBtn: (isActive) => ({ flex: 1, padding: '15px', background: 'none', border: 'none', color: isActive ? '#4caf50' : '#666', fontWeight: 'bold' }),
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', padding: '10px' },
    card: { background: '#1a1a1a', padding: '10px', borderRadius: '8px', border: '1px solid #333', textAlign: 'center' },
    input: { width: '100%', padding: '10px', background: '#000', border: '1px solid #333', color: '#fff', borderRadius: '4px', marginBottom: '10px', boxSizing: 'border-box' },
    btn: { width: '100%', padding: '10px', background: '#4caf50', border: 'none', borderRadius: '4px', color: '#000', fontWeight: 'bold', marginTop: '5px' },
    aiBox: { padding: '10px', display: 'flex', gap: '10px', background: '#111', borderBottom: '1px solid #333' }
  };

  return (
    <div style={styles.container}>
      <Head><title>PLANT POS</title></Head>

      <div style={styles.header}>PLANT MANAGER {loading && '...'}</div>

      {/* BILLING TAB */}
      {activeTab === 'billing' && (
        <>
            {/* AI INPUT */}
            <div style={styles.aiBox}>
                <input 
                    style={{...styles.input, marginBottom: 0}} 
                    placeholder="AI: '2 coke 1 water'" 
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                />
                <button onClick={handleAiOrder} style={{...styles.btn, width: '80px', marginTop:0}}>GO</button>
            </div>

            {/* PRODUCT GRID */}
            <div style={styles.grid}>
                {products.map(p => (
                <div key={p._id} style={styles.card} onClick={() => addToCart(p)}>
                    <div style={{fontSize: '10px', color: '#888'}}>Stock: {p.stock}</div>
                    <div style={{fontWeight:'bold', margin: '5px 0'}}>{p.name}</div>
                    <div style={{color: '#4caf50'}}>₹{p.price}</div>
                </div>
                ))}
            </div>

            {/* CART / BILL */}
            {cart.length > 0 && (
                <div style={{background: '#fff', color: '#000', margin: '10px', padding: '15px', borderRadius: '8px'}} id="invoice-area">
                    <h3 style={{borderBottom:'1px solid #000', paddingBottom:'5px', margin:'0 0 10px 0'}}>INVOICE</h3>
                    <table style={{width: '100%', fontSize: '14px', borderCollapse:'collapse'}}>
                        <thead>
                            <tr style={{borderBottom:'1px solid #ccc'}}>
                                <th style={{textAlign:'left'}}>Item</th>
                                <th>Qty</th>
                                <th style={{textAlign:'right'}}>Price</th>
                            </tr>
                        </thead>
                        <tbody>
                            {cart.map((item, i) => (
                                <tr key={i} style={{borderBottom:'1px solid #eee'}}>
                                    <td>{item.name} <span onClick={(e) => {e.stopPropagation(); removeFromCart(item._id)}} style={{color:'red', cursor:'pointer'}}>x</span></td>
                                    <td style={{textAlign:'center'}}>{item.qty}</td>
                                    <td style={{textAlign:'right'}}>₹{item.price * item.qty}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    <div style={{textAlign:'right', marginTop:'15px', fontSize:'18px', fontWeight:'bold'}}>
                        Total: ₹{calculateTotal()}
                    </div>
                </div>
            )}
            
            {cart.length > 0 && (
                <div style={{padding: '10px'}}>
                    <button onClick={handleBillSubmit} style={styles.btn}>DOWNLOAD BILL & UPDATE STOCK</button>
                </div>
            )}
        </>
      )}

      {/* ADMIN TAB */}
      {activeTab === 'admin' && (
        <div style={{padding: '20px'}}>
            <h3>Add New Item</h3>
            <input placeholder="Name" style={styles.input} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
            <input placeholder="Price" type="number" style={styles.input} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            <input placeholder="Stock" type="number" style={styles.input} value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} />
            <button onClick={addProduct} style={styles.btn}>SAVE ITEM</button>

            <h3 style={{marginTop: '30px'}}>Inventory</h3>
            <table style={{width: '100%', fontSize: '12px', color: '#ccc'}}>
                <tbody>
                {products.map(p => (
                    <tr key={p._id} style={{borderBottom:'1px solid #333'}}>
                        <td style={{padding: '10px'}}>{p.name}</td>
                        <td>{p.stock}</td>
                        <td style={{textAlign: 'right'}}>
                            <button onClick={() => deleteProduct(p._id)} style={{background:'red', color:'white', border:'none', borderRadius:'4px', padding:'2px 5px'}}>Del</button>
                        </td>
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
      )}

      {/* NAVIGATION */}
      <div style={styles.nav}>
        <button style={styles.navBtn(activeTab === 'billing')} onClick={() => setActiveTab('billing')}>BILLING</button>
        <button style={styles.navBtn(activeTab === 'admin')} onClick={() => setActiveTab('admin')}>ADMIN</button>
      </div>
    </div>
  );
    }
                              
