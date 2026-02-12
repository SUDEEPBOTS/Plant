import { useState, useEffect } from 'react';
import Head from 'next/head';
import Billing from '../components/Billing';
import History from '../components/History';
import Admin from '../components/Admin';

export default function PlantPos() {
  const [activeTab, setActiveTab] = useState('billing');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => { loadAllData(); }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
        const [pRes, oRes] = await Promise.all([
            fetch('/api/products').then(r => r.json()),
            fetch('/api/orders').then(r => r.json())
        ]);
        if(pRes.success) setProducts(pRes.data);
        if(oRes.success) setOrders(oRes.data.reverse());
    } catch(e) { console.error("Load Error"); }
    finally { setLoading(false); }
  };

  return (
    <div style={{background:'#f0f2f5', minHeight:'100vh', fontFamily:'sans-serif'}}>
      <Head>
        <title>PLANT MANAGER</title>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
      </Head>

      <div style={styles.header}>
        <span style={{fontSize:'18px', fontWeight:'700', color:'#2e7d32'}}>🌱 PLANT MANAGER</span>
        <button onClick={loadAllData} style={styles.refreshBtn}>{loading ? '⏳' : '🔄'}</button>
      </div>

      <div style={{paddingTop:'5px'}}>
        {activeTab === 'billing' && <Billing products={products} refreshData={loadAllData} loading={loading} />}
        {activeTab === 'history' && <History orders={orders} loading={loading} />}
        {activeTab === 'admin' && <Admin products={products} orders={orders} refreshData={loadAllData} />}
      </div>

      {/* FIXED BOTTOM NAVIGATION */}
      <div style={styles.nav}>
        <button onClick={() => setActiveTab('billing')} style={styles.navBtn(activeTab === 'billing')}>
            <span style={{fontSize:'22px'}}>🛒</span>
            <span style={{fontSize:'10px'}}>Bill</span>
        </button>
        <button onClick={() => setActiveTab('history')} style={styles.navBtn(activeTab === 'history')}>
            <span style={{fontSize:'22px'}}>📜</span>
            <span style={{fontSize:'10px'}}>History</span>
        </button>
        <button onClick={() => setActiveTab('admin')} style={styles.navBtn(activeTab === 'admin')}>
            <span style={{fontSize:'22px'}}>⚙️</span>
            <span style={{fontSize:'10px'}}>Admin</span>
        </button>
      </div>
    </div>
  );
}

const styles = {
    header: { background:'#fff', padding:'15px', display:'flex', justifyContent:'space-between', alignItems:'center', boxShadow:'0 2px 10px rgba(0,0,0,0.05)', position:'sticky', top:0, zIndex:100 },
    refreshBtn: { background:'#e8f5e9', border:'none', borderRadius:'50%', width:'35px', height:'35px', cursor:'pointer', fontSize:'16px' },
    
    // Nav bar sabse upar rahega (z-index: 1000)
    nav: { position:'fixed', bottom:0, width:'100%', background:'#fff', display:'flex', borderTop:'1px solid #eee', height:'65px', zIndex:1000, paddingBottom:'5px', boxShadow:'0 -2px 10px rgba(0,0,0,0.05)' },
    
    navBtn: (active) => ({ flex:1, border:'none', background:'transparent', color: active ? '#2e7d32' : '#9ea7ad', fontWeight: active ? 'bold' : 'normal', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' })
};
          
