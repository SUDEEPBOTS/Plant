// components/Billing.js
import { useState } from 'react';

export default function Billing({ products, cart, addToCart, decreaseQty, handleBillSubmit, loading }) {
  const [search, setSearch] = useState('');
  const [shopName, setShopName] = useState('');
  const [shopNumber, setShopNumber] = useState('');
  const [paymentMode, setPaymentMode] = useState('Cash');

  // Filter Logic
  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()));
  const total = cart.reduce((acc, item) => acc + (item.price * item.qty), 0);

  const submit = () => {
    handleBillSubmit(shopName, shopNumber, paymentMode);
    setShopName(''); setShopNumber(''); setPaymentMode('Cash');
  };

  if (loading) return <div style={{padding:'20px', textAlign:'center'}}><h3>🦴 Loading Items...</h3></div>;

  return (
    <div style={{paddingBottom:'200px'}}>
      <div style={{padding:'15px', background:'#fff', borderBottom:'1px solid #eee'}}>
        <input style={styles.input} placeholder="🏪 Dukan Name" value={shopName} onChange={e => setShopName(e.target.value)} />
        <input style={styles.input} type="number" placeholder="📞 Phone (Optional)" value={shopNumber} onChange={e => setShopNumber(e.target.value)} />
        <input style={{...styles.input, border:'1px solid #2e7d32', marginBottom:0}} placeholder="🔍 Search Items..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div style={styles.grid}>
        {filtered.map(p => {
           const inCart = cart.find(i => i._id === p._id)?.qty || 0;
           const avail = p.stock - inCart;
           return (
            <div key={p._id} style={{...styles.card, border: avail <= 0 ? '2px solid red' : '1px solid #eee'}}>
              <div style={{height:'100px', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9f9f9'}}>
                {p.image ? <img src={p.image} style={{height:'100%', maxWidth:'100%'}} /> : <span>No Pic</span>}
              </div>
              <div style={{marginTop:'5px'}}>
                <div style={{fontWeight:'bold'}}>{p.name}</div>
                <div style={{fontSize:'12px'}}>Petti: ₹{p.price}</div>
                <div style={{fontSize:'12px', color: avail<5?'red':'green'}}>Stock: {avail}</div>
              </div>
              <button onClick={() => addToCart(p)} disabled={avail<=0} style={styles.addBtn(avail<=0)}>
                {avail<=0 ? 'NO STOCK' : 'ADD +'}
              </button>
            </div>
           )
        })}
      </div>

      {cart.length > 0 && (
        <div style={styles.footer}>
          <div style={{maxHeight:'120px', overflowY:'auto', marginBottom:'10px'}}>
            {cart.map(i => (
              <div key={i._id} style={{display:'flex', justifyContent:'space-between', borderBottom:'1px solid #eee', padding:'5px'}}>
                <span>{i.name} (x{i.qty})</span>
                <div>
                  <span style={{marginRight:'10px'}}>₹{i.price * i.qty}</span>
                  <button onClick={() => decreaseQty(i._id)} style={{background:'red', color:'white', border:'none', borderRadius:'50%', width:'25px'}}>-</button>
                </div>
              </div>
            ))}
          </div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
            <div style={{fontWeight:'bold', fontSize:'18px'}}>Total: ₹{total}</div>
            <div style={{display:'flex', gap:'5px'}}>
               <button onClick={() => setPaymentMode('Cash')} style={styles.pill(paymentMode==='Cash')}>💵</button>
               <button onClick={() => setPaymentMode('Online')} style={styles.pill(paymentMode==='Online')}>📱</button>
            </div>
          </div>
          <button onClick={submit} style={styles.mainBtn}>✅ SUBMIT & WHATSAPP</button>
        </div>
      )}
    </div>
  );
}

const styles = {
  input: { width:'100%', padding:'10px', marginBottom:'10px', borderRadius:'5px', border:'1px solid #ccc', boxSizing:'border-box' },
  grid: { display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', padding:'10px' },
  card: { background:'#fff', padding:'10px', borderRadius:'10px', textAlign:'center', boxShadow:'0 2px 5px rgba(0,0,0,0.1)' },
  addBtn: (dis) => ({ width:'100%', padding:'8px', background: dis ? '#ccc' : '#2e7d32', color:'white', border:'none', borderRadius:'5px', marginTop:'5px' }),
  footer: { position:'fixed', bottom:'60px', left:0, width:'100%', background:'#fff', borderTop:'2px solid #2e7d32', padding:'15px', boxSizing:'border-box', boxShadow:'0 -5px 15px rgba(0,0,0,0.1)' },
  mainBtn: { width:'100%', padding:'12px', background:'#2e7d32', color:'white', border:'none', borderRadius:'5px', fontWeight:'bold', marginTop:'10px' },
  pill: (act) => ({ padding:'5px 15px', border:'1px solid green', background: act ? 'green' : '#fff', color: act ? '#fff' : 'green', borderRadius:'20px' })
};
    
