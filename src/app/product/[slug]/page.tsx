import type {Metadata} from 'next';
import {notFound} from 'next/navigation';
import {getDb} from '@/lib/db';
import {mapPublicProduct} from '@/lib/catalog';
import {products as previewProducts} from '@/lib/products';
import {ProductDetail} from '@/components/product-detail';

export const dynamic='force-dynamic';

async function findProduct(slug:string){
  try{
    const sql=getDb();
    const rows=await sql`select * from products where slug=${slug} and active=true limit 1`;
    return {product:rows[0]?mapPublicProduct(rows[0] as any):null,dbAvailable:true};
  }catch(error){
    console.error('Unable to load product from Neon',error);
    return {product:previewProducts.find(p=>p.slug===slug)||null,dbAvailable:false};
  }
}

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const{slug}=await params;
  const{product}=await findProduct(slug);
  return {title:product?.name||'Product',description:product?.description};
}

export default async function ProductPage({params}:{params:Promise<{slug:string}>}){
  const{slug}=await params;
  const{product,dbAvailable}=await findProduct(slug);
  if(!product||(!dbAvailable&&product.active===false))notFound();
  let related=previewProducts.filter(p=>p.id!==product.id&&p.gender===product.gender).slice(0,4);
  if(dbAvailable){
    try{
      const sql=getDb();
      const rows=await sql`select * from products where active=true and gender=${product.gender} and id<>${product.id} order by featured desc,created_at desc limit 4`;
      related=rows.map(row=>mapPublicProduct(row as any));
    }catch(error){console.error('Unable to load related products',error)}
  }
  return <ProductDetail product={product} related={related}/>;
}




