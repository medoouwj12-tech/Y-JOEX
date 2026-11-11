import {NextResponse} from 'next/server';
import {getDb} from '@/lib/db';
import {mapPublicProduct} from '@/lib/catalog';
import {products as previewProducts} from '@/lib/products';

export const dynamic='force-dynamic';

export async function GET(){
  try{
    const sql=getDb();
    const rows=await sql`select * from products where active=true order by featured desc,created_at desc`;
    return NextResponse.json({products:rows.map(row=>mapPublicProduct(row as any))},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    console.error('Unable to load catalog from Neon',error);
    return NextResponse.json({products:previewProducts},{headers:{'Cache-Control':'no-store'}});
  }
}
