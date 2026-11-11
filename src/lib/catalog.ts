import type {Product} from '@/lib/products';

type DbProduct = {
  id:string; slug:string; name_en:string; name_ar:string; description_en:string;
  description_ar?:string; price:number; compare_at_price:number|null; category:string;
  collection:string; gender:string; colors:string[]; sizes:string[]; stock:unknown;
  images:string[]; featured:boolean; active:boolean;
};

function asRecord(value:unknown):Record<string,Record<string,number>>{
  try{
    const parsed=typeof value==='string'?JSON.parse(value):value;
    if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))return {};
    return parsed as Record<string,Record<string,number>>;
  }catch{return {}}
}

export function mapDbProduct(row:DbProduct):Product{
  const images=Array.isArray(row.images)?row.images.filter(x=>typeof x==='string'&&x.length>0):[];
  const variants=asRecord(row.stock);
  const stock=Object.values(variants).reduce((total,sizes)=>total+Object.values(sizes||{}).reduce((sum,qty)=>sum+(Number(qty)||0),0),0);
  return {
    id:row.id,slug:row.slug,name:row.name_en,nameAr:row.name_ar||'',
    description:row.description_en||'',descriptionAr:row.description_ar||'',
    category:row.category as Product['category'],gender:row.gender as Product['gender'],
    collection:row.collection,price:Number(row.price),compareAtPrice:row.compare_at_price==null?null:Number(row.compare_at_price),
    images,image:images[0]||'/images/products/4981d326-6bf3-4d5a-9e88-9049a748b9da.jpg',
    secondImage:images[1]||images[0]||'/images/products/4981d326-6bf3-4d5a-9e88-9049a748b9da.jpg',
    colors:Array.isArray(row.colors)?row.colors:[],sizes:Array.isArray(row.sizes)?row.sizes:[],
    stock,stockByVariant:variants,featured:Boolean(row.featured),active:Boolean(row.active),
  };
}

export function mapPublicProduct(row:DbProduct):Product{
  const product=mapDbProduct(row);
  const images=(product.images||[]).map((image,index)=>image.startsWith('data:image/')
    ? `/api/product-images/${encodeURIComponent(product.id)}/${index}`
    : image);
  return {...product,images,image:images[0]||product.image,secondImage:images[1]||images[0]||product.secondImage};
}
