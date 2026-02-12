// components/Admin.js
import { useState } from 'react';

export default function Admin({ products, orders, addProduct, deleteProduct, handleReset, refreshData }) {
  const [pass, setPass] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', price: '', pricePerBottle: '', stock: '', image: '' });

  // --- DETAILED REPORT GENERATOR ---
  const generateReport = () => {
    // 1. Calculate Sold Qty for each product
    const salesMap = {};
    orders.forEach(o => {
        o.items.forEach(i => {
            salesMap[i.name] = (salesMap[i.name] || 0) + i.qty;
        });
    });

    // 2. Create CSV Data
    let csv = "Item Name,Total Loaded (Stock+Sold),Sold Qty,Balance Stock,Petti Price,Revenue (Kamai)\n";
    
    products.forEach(p => {
        const sold = salesMap[p.name] || 0;
        const current = p.stock;
        const loaded = current + sold; // Total maal jo gadi mein tha
        const revenue = sold * p.price;

        csv += `${p.name},${loaded},${sold},${current},${p.price},${revenue}\n`;
    });

    // 3. Download
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Full_Report_${new Date().toLocaleDateString()}.csv`;
    a.click();
  };

  // --- IMAGE HANDLER ---
  const handleImage = (e) => {
    const file = e.target.files[0];
    if(file) {
      const reader = new FileReader();
      reader.onloadend = () => setNewItem({...newItem, image: reader.result});
      reader.readAsDataURL(file);
    }
  };

  const save = () => {
    if(!newItem.name || !newItem.price) return alert("Name/Price Missing");
    addProduct(newItem);
    setNewItem({ name: '', price: '', pricePerBottle: '', stock: '', image: '' });
  };

  if (!unlocked) {
    return (
      <div style={{height:'100vh', display:'flex', justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
        <h3>🔒 Admin Panel</h3>
        <input type="password" placeholder="Password" style={{padding:'10px', marginBottom:'10px'}} value={pass} onChange={e => setPass(e.target.value)} />
        <button onClick={() => pass === 'rwf123' ? setUnlocked(true) : alert('Wrong!')} style={{padding:'10px 20px', background:'black', color:'white', border:'none'}}>Unlock</button>
      </div>
    );
  }

  return (
    <div style={{padding:'20px', paddingBottom:'100px'}}>
      
      {/* REPORT SECTION */}
      <div style={{background:'#fff', padding:'15px', borderRadius:'10px', marginBottom:'20px', border:'1px solid #eee'}}>
        <h3 style={{marginTop:0}}>📊 Full Report</h3>
        <p style={{fontSize:'12px', color:'#666'}}>Download details: Loaded, Sold, Balance & Revenue</p>
        <button onClick={generateReport} style={{background:'#2196f3', color:'white', border:'none', padding:'10px', width:'100%', borderRadius:'5px'}}>📥 Download Excel (CSV)</button>
      </div>

      {/* ADD ITEM */}
      <div style={{background:'#fff', padding:'15px', borderRadius:'10px', marginBottom:'20px', border:'1px solid #eee'}}>
        <h3>📝 Add / Update Item</h3>
        <input placeholder="Name" style={style.input} value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
        <div style={{display:'flex', gap:'10px'}}>
            <input placeholder="Petti Rate" type="number" style={style.input} value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
            <input placeholder="Bottle MRP" type="number" style={style.input} value={newItem.pricePerBottle} onChange={e => setNewItem({...newItem, pricePerBottle: e.target.value})} />
        </div>
        <input placeholder="Stock" type="number" style={style.input} value={newItem.stock} onChange={e => setNewItem({...newItem, stock: e.target.value})} />
        <input type="file" onChange={handleImage} style={{marginBottom:'10px'}} />
        <button onClick={save} style={{width:'100%', padding:'10px', background:'green', color:'white', border:'none'}}>SAVE ITEM</button>
      </div>

      {/* LIST */}
      {products.map(p => (
        <div key={p._id} style={{display:'flex', justifyContent:'space-between', background:'#fff', padding:'10px', marginBottom:'5px', borderBottom:'1px solid #eee'}}>
            <div><b>{p.name}</b> (Stk: {p.stock})</div>
            <button onClick={() => deleteProduct(p._id)} style={{color:'red', border:'none', background:'none'}}>Delete</button>
        </div>
      ))}

      <button onClick={handleReset} style={{marginTop:'30px', background:'red', color:'white', padding:'15px', width:'100%', border:'none'}}>⚠️ FACTORY RESET</button>
    </div>
  );
}

const style = {
    input: { width:'100%', padding:'10px', marginBottom:'10px', border:'1px solid #ccc', borderRadius:'5px', boxSizing:'border-box'}
};
  
