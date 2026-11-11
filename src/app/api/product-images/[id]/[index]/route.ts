import {NextRequest,NextResponse} from 'next/server';
import {getDb} from '@/lib/db';

export const dynamic='force-dynamic';

export async function GET(request:NextRequest,{params}:{params:Promise<{id:string;index:string}>}){
  const{id,index}=await params;
  const position=Number(index);
  if(!/^[a-zA-Z0-9-]{1,80}$/.test(id)||!Number.isInteger(position)||position<0||position>7)
    return NextResponse.json({error:'Invalid image reference.'},{status:400});
  try{
    const sql=getDb();
    const rows=await sql`select images from products where id=${id} and active=true limit 1`;
    const source=(rows[0]?.images as string[]|undefined)?.[position];
    if(!source)return new NextResponse(null,{status:404});
    const data=source.match(/^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/=]+)$/);
    if(data){
      const bytes=Buffer.from(data[2],'base64');
      return new NextResponse(bytes,{headers:{
        'Content-Type':`image/${data[1]}`,
        'Cache-Control':'public, max-age=3600, stale-while-revalidate=86400',
        'X-Content-Type-Options':'nosniff',
      }});
    }
    if(source.startsWith('/images/'))return NextResponse.redirect(new URL(source,request.url));
    return new NextResponse(null,{status:404});
  }catch(error){
    console.error('Unable to load product image',error);
    return new NextResponse(null,{status:503});
  }
}
