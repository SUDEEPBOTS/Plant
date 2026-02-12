import { useState } from 'react';

export default function Billing({ products, refreshData, loading }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopNumber, setShopNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [submitting, setSubmitting] = useState(false);

  // --- LOGIC ---
  const addToCart = (p) => {
    if(p.stock <= 0) return alert("Out of Stock");
    const exist = cart.find(i => i._id === p._id);
    if(exist) setCart(cart.map(i => i._id === p._id ? { ...i, qty: i.qty + 1 } : i));
    else setCart([...cart, { ...p, qty: 1 }]);
    if(navigator.vibrate) navigator.vibrate(50);
  };

  const decreaseQty = (id) => {
    const exist = cart.find(i => i._id === id);
    if(exist.qty === 1) setCart(cart.filter(i => i._id !== id));
    else setCart(cart.map(i => i._id === id ? { ...i, qty: i.qty - 1 } : i));
  };

  const calculateTotal = () => cart.reduce((acc, i) => acc + (i.price * i.qty), 0);

  const handleSubmit = async () => {
    if(!shopName || cart.length === 0) return alert("Shop Name & Items Required");
    setSubmitting(true);
    
    const total = calculateTotal();
    const bill = { shopName, shopNumber, items: cart, totalAmount: total, paymentMode, date: new Date() };

    // WhatsApp Direct
    let msg = `*🧾 INVOICE*\n🏪 *${shopName}* (${shopNumber})\n\n`;
    cart.forEach(i => msg += `${i.qty} x ${i.name} = ₹${i.price * i.qty}\n`);
    msg += `\n*💰 TOTAL: ₹${total}*\nMode: ${paymentMode}`;
    window.open(`https://wa.me/917303847666?text=${encodeURIComponent(msg)}`, '_blank');

    try {
        await fetch('/api/orders', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(bill) });
        await fetch('/api/products', { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ items: cart }) });
        setCart([]); setShopName(''); setShopNumber(''); 
        refreshData();
    } catch(e) { alert("Saved Offline"); }
    setSubmitting(false);
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));

  if(loading) return <div style={{padding:'40px', textAlign:'center', color:'#666'}}>🔄 Loading Products...</div>;

  return (
    <div style={{paddingBottom:'250px'}}> {/* Extra padding for scroll */}
      
      {/* INPUTS */}
      <div style={{background:'#fff', padding:'20px', borderRadius:'0 0 20px 20px', boxShadow:'0 4px 15px rgba(0,0,0,0.05)'}}>
        <input style={s.input} placeholder="🏪 Dukan Name" value={shopName} onChange={e => setShopName(e.target.value)} />
        <input style={s.input} type="number" placeholder="📞 Phone Number" value={shopNumber} onChange={e => setShopNumber(e.target.value)} />
        <input style={{...s.input, border:'1px solid #2e7d32', marginBottom:0}} placeholder="🔍 Search Item..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* GRID */}
      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'15px', padding:'15px'}}>
        {filtered.map(p => {
           const inCart = cart.find(i => i._id === p._id)?.qty || 0;
           const avail = p.stock - inCart;
           return (
            <div key={p._id} style={{...s.card, opacity: avail<=0 ? 0.6 : 1}}>
              <div style={s.imgBox}>
                {p.image ? <img src={p.image} style={s.img} /> : <span style={{fontSize:'30px'}}>🥤</span>}
              </div>
              <div style={{padding:'10px'}}>
                <div style={{fontWeight:'bold', fontSize:'15px', marginBottom:'5px'}}>{p.name}</div>
                <div style={{fontSize:'13px', color:'#555'}}>Petti: <b>₹{p.price}</b></div>
                <div style={{fontSize:'12px', color: avail<5?'#e53935':'#43a047', fontWeight:'bold', marginTop:'5px'}}>
                    {avail<=0 ? 'OUT OF STOCK' : `Stock: ${avail}`}
                </div>
              </div>
              <button onClick={() => addToCart(p)} disabled={avail<=0} style={s.addBtn}>ADD +</button>
            </div>
           )
        })}
      </div>

      {/* CART FOOTER (FIXED POSITION) */}
      {cart.length > 0 && (
        <div style={s.footer}>
          {/* Cart Items Scrollable Area */}
          <div style={{maxHeight:'120px', overflowY:'auto', marginBottom:'10px', paddingRight:'5px'}}>
            {cart.map(i => (
                <div key={i._id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #eee', padding:'8px 0'}}>
                    <div style={{fontSize:'14px'}}>{i.name} <span style={{fontWeight:'bold'}}>x{i.qty}</span></div>
                    <div style={{display:'flex', alignItems:'center', gap:'10px'}}>
                        <span style={{fontWeight:'bold'}}>₹{i.price*i.qty}</span>
                        <button onClick={() => decreaseQty(i._id)} style={s.minusBtn}>-</button>
                    </div>
                </div>
            ))}
          </div>
          
          {/* Total & Payment */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px', paddingTop:'10px', borderTop:'1px solid #eee'}}>
            <div style={{fontSize:'20px', fontWeight:'800'}}>₹{calculateTotal()}</div>
            <div style={{display:'flex', gap:'8px'}}>
                <button onClick={() => setPaymentMode('Cash')} style={{...s.pill, background: paymentMode==='Cash'?'#2e7d32':'#f0f0f0', color: paymentMode==='Cash'?'#fff':'#333'}}>💵</button>
                <button onClick={() => setPaymentMode('Online')} style={{...s.pill, background: paymentMode==='Online'?'#2e7d32':'#f0f0f0', color: paymentMode==='Online'?'#fff':'#333'}}>📱</button>
            </div>
          </div>

          <button onClick={handleSubmit} disabled={submitting} style={s.submitBtn}>
            {submitting ? 'Sending...' : '✅ SUBMIT & WHATSAPP'}
          </button>
        </div>
      )}
    </div>
  );
}

const s = {
  input: { width:'100%', padding:'12px', marginBottom:'10px', borderRadius:'10px', border:'1px solid #e0e0e0', fontSize:'16px', boxSizing:'border-box' },
  card: { background:'#fff', borderRadius:'15px', overflow:'hidden', boxShadow:'0 4px 10px rgba(0,0,0,0.05)', display:'flex', flexDirection:'column', justifyContent:'space-between' },
  imgBox: { height:'100px', background:'#f5f5f5', display:'flex', alignItems:'center', justifyContent:'center' },
  img: { width:'100%', height:'100%', objectFit:'contain' },
  addBtn: { width:'100%', padding:'12px', background:'#2e7d32', color:'white', border:'none', fontWeight:'bold', fontSize:'14px' },
  
  // Footer ab bottom se 70px upar hai taaki navigation bar ke piche na jaye
  footer: { position:'fixed', bottom:'70px', left:'10px', right:'10px', width:'auto', background:'#fff', borderRadius:'20px', padding:'15px', boxShadow:'0 -5px 25px rgba(0,0,0,0.15)', zIndex:90, border:'1px solid #eee' },
  
  minusBtn: { width:'28px', height:'28px', borderRadius:'50%', border:'none', background:'#ff5252', color:'white', fontWeight:'bold', fontSize:'16px' },
  pill: { padding:'8px 15px', borderRadius:'20px', border:'none', fontWeight:'bold', cursor:'pointer' },
  submitBtn: { width:'100%', padding:'14px', borderRadius:'12px', background:'#1e88e5', color:'white', border:'none', fontSize:'16px', fontWeight:'bold' }
};
    
