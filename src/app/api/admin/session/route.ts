import {NextRequest,NextResponse} from 'next/server';
import {adminCookieName,authenticateAdmin,isAdminRequest,makeAdminToken} from '@/lib/admin-auth';

function sessionCookie(response:NextResponse,username:string,version:number){
  response.cookies.set(adminCookieName,makeAdminToken(username,version),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:7*24*60*60});
}

export async function GET(request:NextRequest){return NextResponse.json({authenticated:await isAdminRequest(request)})}

export async function POST(request:NextRequest){
  try{
    if(!process.env.ADMIN_SESSION_SECRET)return NextResponse.json({error:'إعداد جلسة الإدارة غير مكتمل.'},{status:503});
    const body=await request.json(),username=String(body?.username??body?.email??'').trim(),password=String(body?.password??'');
    if(!username||!password)return NextResponse.json({error:'اكتب اسم المستخدم وكلمة السر.'},{status:400});
    const credentials=await authenticateAdmin(username,password);
    if(!credentials)return NextResponse.json({error:'اسم المستخدم أو كلمة السر غير صحيحة.'},{status:401});
    const response=NextResponse.json({authenticated:true});
    sessionCookie(response,credentials.username,credentials.version);
    return response;
  }catch(error){
    console.error('Unable to sign in to admin',error);
    return NextResponse.json({error:'تعذر تسجيل الدخول. تأكد من إعداد قاعدة البيانات.'},{status:503});
  }
}

export async function DELETE(){
  const response=NextResponse.json({authenticated:false});
  response.cookies.set(adminCookieName,'',{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:0});
  return response;
}
