import {NextResponse} from 'next/server';
import {getDb} from '@/lib/db';

export async function POST(request:Request){
 try{
  const body=await request.json();
  if(!body?.id||!Array.isArray(body.items)||body.items.length<1||body.items.length>50||!/^01[0125]\d{8}$/.test(String(body.phone).replace(/\s/g,''))||!body.name||!body.governorate||!body.address)return NextResponse.json({error:'Invalid order details.'},{status:400});
  const sql=getDb();
  const normalized=[];
  for(const line of body.items){
   const rows=await sql`select id,name_en,name_ar,price,colors,sizes,active from products where id=${line?.product?.id} limit 1`;
   const product=rows[0] as any;
   if(!product||!product.active||!product.colors.includes(line.color)||!product.sizes.includes(line.size)||!Number.isInteger(line.qty)||line.qty<1||line.qty>20)return NextResponse.json({error:'A selected product option is no longer available.'},{status:400});
   normalized.push({product_id:product.id,name:body.language==='ar'?product.name_ar:product.name_en,color:line.color,size:line.size,quantity:line.qty,unit_price:Number(product.price)});
  }
  const subtotal=normalized.reduce((sum,line)=>sum+line.unit_price*line.quantity,0);
  const feeRows=await sql`select fee from shipping_fees where governorate=${body.governorate} limit 1`;
  const shipping=Number(feeRows[0]?.fee??100),total=subtotal+shipping;
  await sql`insert into orders(order_number,customer_name,phone,governorate,city,address,notes,items,subtotal,shipping,total,status) values(${body.id},${String(body.name).slice(0,150)},${String(body.phone).replace(/\s/g,'')},${String(body.governorate).slice(0,80)},${String(body.city||'').slice(0,120)},${String(body.address).slice(0,500)},${String(body.notes||'').slice(0,1000)},${JSON.stringify(normalized)}::jsonb,${subtotal},${shipping},${total},'new')`;
  return NextResponse.json({ok:true,orderNumber:body.id,items:normalized,subtotal,shipping,total});
 }catch(error){console.error('Unable to persist order in Neon',error);return NextResponse.json({error:'Order could not be saved. Check the Neon database connection.'},{status:503})}
}
