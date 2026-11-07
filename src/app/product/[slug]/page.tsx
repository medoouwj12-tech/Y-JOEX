import type {Metadata} from 'next';import {notFound} from 'next/navigation';import {products} from '@/lib/products';import {ProductDetail} from '@/components/product-detail';
export function generateStaticParams(){return products.map(p=>({slug:p.slug}))}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{const{slug}=await params;const p=products.find(x=>x.slug===slug);return{title:p?.name||'Product',description:p?.description}}
export default async function ProductPage({params}:{params:Promise<{slug:string}>}){const{slug}=await params;const p=products.find(x=>x.slug===slug);if(!p)notFound();return <ProductDetail product={p} related={products.filter(x=>x.id!==p.id&&x.gender===p.gender).slice(0,4)}/>}
