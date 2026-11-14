import {NextRequest,NextResponse} from 'next/server';
import {isAdminRequest} from '@/lib/admin-auth';
import {getDb} from '@/lib/db';
import {mapDbProduct,mapPublicProduct} from '@/lib/catalog';

export const dynamic='force-dynamic';
const categories=['T-shirts','Hoodies','Shirts','Pants'];
const genders=['men','women','unisex'];

function cleanList(value:unknown){
  if(Array.isArray(value))return value.map(x=>String(x).trim()).filter(Boolean);
  return typeof value==='string'?value.split(',').map(x=>x.trim()).filter(Boolean):[];
}

function normalize(body:any){
  const name=String(body?.name||'').trim().slice(0,160);
  const nameAr=String(body?.nameAr||'').trim().slice(0,160);
  const slug=String(body?.slug||'').trim().toLowerCase();
  const category=String(body?.category||'');
  const gender=String(body?.gender||'unisex');
  const collection=String(body?.collection||'Y JOEX').trim().slice(0,80);
  const price=Number(body?.price);
  const compareAtPrice=body?.compareAtPrice===''||body?.compareAtPrice==null?null:Number(body.compareAtPrice);
  const colors=cleanList(body?.colors);
  const sizes=cleanList(body?.sizes);
  const images=cleanList(body?.images);
  const stockInput=body?.stock&&typeof body.stock==='object'?body.stock:{};
  if(!name||!slug||!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))throw new Error('اكتب اسم المنتج ورابطًا مختصرًا صالحًا باللغة الإنجليزية.');
  if(!categories.includes(category)||!genders.includes(gender))throw new Error('اختر القسم والفئة المستهدفة من القوائم.');
  if(!Number.isInteger(price)||price<0||price>10000000)throw new Error('السعر يجب أن يكون رقمًا صحيحًا موجبًا.');
  if(compareAtPrice!==null&&(!Number.isInteger(compareAtPrice)||compareAtPrice<price))throw new Error('السعر قبل الخصم يجب أن يكون مساويًا للسعر أو أعلى منه.');
  if(colors.length>20||sizes.length>20||colors.some(x=>x.length>40)||sizes.some(x=>x.length>20))throw new Error('عدد الألوان أو المقاسات غير صالح.');
  if(!colors.length||!sizes.length)throw new Error('أضف لونًا ومقاسًا واحدًا على الأقل.');
  if(!images.length)throw new Error('أضف صورة واحدة على الأقل للمنتج.');
  if(images.length>8)throw new Error('يمكن إضافة 8 صور كحد أقصى للمنتج.');
  for(const image of images){
    const local=/^\/images\/[a-zA-Z0-9/_-]+\.(?:jpg|jpeg|png|webp)$/i.test(image);
    const remote=/^https:\/\//i.test(image);
    const uploaded=/^data:image\/(?:webp|jpeg|png);base64,[A-Za-z0-9+/=]+$/.test(image)&&image.length<=480000;
    if(!local&&!remote&&!uploaded)throw new Error('استخدم رابط صورة HTTPS أو ارفع صورة من جهازك.');
  }
  const stock:Record<string,Record<string,number>>={};
  for(const color of colors){
    const row=stockInput[color]&&typeof stockInput[color]==='object'?stockInput[color]:{};
    stock[color]={};
    for(const size of sizes){
      const quantity=Number(row[size]??0);
      if(!Number.isInteger(quantity)||quantity<0||quantity>100000)throw new Error('المخزون يجب أن يكون عددًا صحيحًا من صفر أو أكثر.');
      stock[color][size]=quantity;
    }
  }
  return {
    name,nameAr,slug,category,gender,collection,price,compareAtPrice,
    description:String(body?.description||'').trim().slice(0,3000),
    descriptionAr:String(body?.descriptionAr||'').trim().slice(0,3000),
    colors,sizes,images,stock,featured:Boolean(body?.featured),active:Boolean(body?.active),
  };
}

export async function GET(request:NextRequest){
  if(!await isAdminRequest(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    const sql=getDb();
    const id=request.nextUrl.searchParams.get('id');
    if(id){
      const rows=await sql`select * from products where id=${id} limit 1`;
      if(!rows.length)return NextResponse.json({error:'المنتج غير موجود.'},{status:404});
      return NextResponse.json({product:mapDbProduct(rows[0] as any)},{headers:{'Cache-Control':'no-store'}});
    }
    const rows=await sql`select * from products order by created_at desc`;
    return NextResponse.json({products:rows.map(row=>mapPublicProduct(row as any))},{headers:{'Cache-Control':'no-store'}});
  }catch(error){
    console.error('Unable to load admin catalog',error);
    return NextResponse.json({error:'تعذر تحميل المنتجات من Neon.'},{status:503});
  }
}

export async function POST(request:NextRequest){
  if(!await isAdminRequest(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    const p=normalize(await request.json());
    const sql=getDb();
    const rows=await sql`insert into products(id,slug,name_en,name_ar,description_en,description_ar,price,compare_at_price,category,collection,gender,colors,sizes,stock,images,featured,active) values(${'p-'+crypto.randomUUID()},${p.slug},${p.name},${p.nameAr},${p.description},${p.descriptionAr},${p.price},${p.compareAtPrice},${p.category},${p.collection},${p.gender},${p.colors},${p.sizes},${JSON.stringify(p.stock)}::jsonb,${p.images},${p.featured},${p.active}) returning *`;
    return NextResponse.json({product:mapDbProduct(rows[0] as any)},{status:201});
  }catch(error){
    if(error instanceof Error&&'status'in error)return NextResponse.json({error:error.message},{status:400});
    if(error instanceof Error&&['اكتب','اختر','السعر','عدد','يمكن','أضف','استخدم','المخزون'].some(x=>error.message.includes(x)))return NextResponse.json({error:error.message},{status:400});
    console.error('Unable to create product',error);
    return NextResponse.json({error:'تعذر حفظ المنتج. تأكد من عدم تكرار الرابط المختصر.'},{status:503});
  }
}

export async function PATCH(request:NextRequest){
  if(!await isAdminRequest(request))return NextResponse.json({error:'Unauthorized'},{status:401});
  try{
    const body=await request.json();
    const id=String(body?.id||'').trim();
    if(!id)return NextResponse.json({error:'معرّف المنتج غير صالح.'},{status:400});
    const p=normalize(body);
    const sql=getDb();
    const rows=await sql`update products set slug=${p.slug},name_en=${p.name},name_ar=${p.nameAr},description_en=${p.description},description_ar=${p.descriptionAr},price=${p.price},compare_at_price=${p.compareAtPrice},category=${p.category},collection=${p.collection},gender=${p.gender},colors=${p.colors},sizes=${p.sizes},stock=${JSON.stringify(p.stock)}::jsonb,images=${p.images},featured=${p.featured},active=${p.active},updated_at=now() where id=${id} returning *`;
    if(!rows.length)return NextResponse.json({error:'المنتج غير موجود.'},{status:404});
    return NextResponse.json({product:mapDbProduct(rows[0] as any)});
  }catch(error){
    if(error instanceof Error&&['اكتب','اختر','السعر','عدد','يمكن','أضف','استخدم','المخزون'].some(x=>error.message.includes(x)))return NextResponse.json({error:error.message},{status:400});
    console.error('Unable to update product',error);
    return NextResponse.json({error:'تعذر حفظ التغييرات. تأكد من عدم تكرار الرابط المختصر.'},{status:503});
  }
}
