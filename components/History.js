// components/History.js
export default function History({ orders, loading }) {
  if (loading) return <div style={{padding:'20px', textAlign:'center'}}><h3>🔄 Loading History...</h3></div>;
  if (!orders || orders.length === 0) return <div style={{padding:'20px', textAlign:'center'}}>No Orders Found</div>;

  return (
    <div style={{padding:'15px', paddingBottom:'100px'}}>
      {orders.map(o => (
        <div key={o._id} style={{background:'#fff', padding:'15px', marginBottom:'10px', borderRadius:'10px', borderLeft:'5px solid green', boxShadow:'0 2px 5px rgba(0,0,0,0.1)'}}>
          <div style={{display:'flex', justifyContent:'space-between', fontWeight:'bold'}}>
            <span>{o.shopName}</span>
            <span style={{color:'green'}}>₹{o.totalAmount}</span>
          </div>
          <div style={{fontSize:'12px', color:'#666'}}>{new Date(o.date).toLocaleString()} • {o.paymentMode}</div>
          <div style={{fontSize:'12px', marginTop:'5px'}}>
             {o.items.map(i => <span key={i.name} style={{marginRight:'5px'}}>{i.qty} x {i.name},</span>)}
          </div>
        </div>
      ))}
    </div>
  );
}
