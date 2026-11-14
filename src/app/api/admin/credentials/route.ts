import {NextRequest,NextResponse} from 'next/server';
import {adminCookieName,changeAdminCredentials,isAdminRequest,makeAdminToken,authenticateAdmin,getAdminCredentials} from '@/lib/admin-auth';

export const dynamic='force-dynamic';

export async function GET(request:NextRequest){
  if(!await isAdminRequest(request))return NextResponse.json({error:'غير مصرح.'},{status:401});
  try{
    const credentials=await getAdminCredentials();
    if(!credentials)return NextResponse.json({error:'بيانات الحساب غير متاحة.'},{status:404});
    return NextResponse.json({username:credentials.username},{headers:{'Cache-Control':'no-store'}});
  }catch{return NextResponse.json({error:'تعذر تحميل بيانات الحساب.'},{status:503})}
}

export async function POST(request:NextRequest){
  if(!await isAdminRequest(request))return NextResponse.json({error:'انتهت الجلسة. سجّل الدخول مرة أخرى.'},{status:401});
  try{
    const body=await request.json();
    const username=String(body?.username||'').trim();
    const currentPassword=String(body?.currentPassword||'');
    const newUsername=String(body?.newUsername||'').trim();
    const newPassword=String(body?.newPassword||'');
    if(!username||!currentPassword)return NextResponse.json({error:'اكتب اسم المستخدم الحالي وكلمة السر الحالية.'},{status:400});
    if(!/^[a-zA-Z0-9][a-zA-Z0-9._@+-]{2,99}$/.test(newUsername))return NextResponse.json({error:'اسم المستخدم الجديد يجب أن يكون من 3 إلى 100 حرف، ويمكن أن يحتوي على . _ @ + -.'},{status:400});
    if(newPassword.length>0&&(newPassword.length<12||newPassword.length>256))return NextResponse.json({error:'كلمة السر الجديدة يجب أن تكون 12 حرفًا على الأقل.'},{status:400});
    if(!newPassword&&newUsername===username)return NextResponse.json({error:'غيّر اسم المستخدم أو أدخل كلمة سر جديدة.'},{status:400});
    const current=await authenticateAdmin(username,currentPassword);
    if(!current)return NextResponse.json({error:'اسم المستخدم الحالي أو كلمة السر الحالية غير صحيحة.'},{status:401});
    const credentials=await changeAdminCredentials(username,currentPassword,newUsername,newPassword);
    if(!credentials)return NextResponse.json({error:'بيانات الحساب اتغيرت في جلسة أخرى. سجّل الدخول من جديد.'},{status:409});
    const response=NextResponse.json({success:true,username:credentials.username});
    response.cookies.set(adminCookieName,makeAdminToken(credentials.username,credentials.version),{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:7*24*60*60});
    return response;
  }catch(error){
    console.error('Unable to update admin credentials',error);
    return NextResponse.json({error:'تعذر تغيير بيانات الدخول.'},{status:503});
  }
}
