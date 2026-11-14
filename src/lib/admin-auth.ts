import {createHash,createHmac,randomBytes,scrypt,timingSafeEqual} from 'node:crypto';
import type {NextRequest} from 'next/server';
import {getDb} from '@/lib/db';

const COOKIE='yj_admin';
const PASSWORD_BYTES=64;
export type AdminCredentials={username:string;salt:string;passwordHash:string;version:number};

function secret(){const value=process.env.ADMIN_SESSION_SECRET;if(!value||value.length<32)throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters');return value}
function sign(value:string){return createHmac('sha256',secret()).update(value).digest('base64url')}
function constantTimeText(a:string,b:string){const left=createHash('sha256').update(a).digest(),right=createHash('sha256').update(b).digest();return timingSafeEqual(left,right)}
function derive(password:string,salt:string){return new Promise<Buffer>((resolve,reject)=>scrypt(password,salt,PASSWORD_BYTES,(error,key)=>error?reject(error):resolve(key as Buffer)))}
function validRecord(value:unknown):AdminCredentials|null{
  if(!value||typeof value!=='object')return null;
  const row=value as Partial<AdminCredentials>;
  if(typeof row.username!=='string'||typeof row.salt!=='string'||typeof row.passwordHash!=='string'||!Number.isInteger(row.version))return null;
  return row as AdminCredentials;
}
async function storedCredentials(){
  const sql=getDb();
  const rows=await sql`select value from site_settings where key='admin_credentials' limit 1`;
  return rows.length?validRecord(rows[0].value):null;
}
export async function getAdminCredentials(){return storedCredentials()}
async function matches(record:AdminCredentials,username:string,password:string){
  if(!constantTimeText(record.username,username))return false;
  const candidate=await derive(password,record.salt);
  let expected:Buffer;
  try{expected=Buffer.from(record.passwordHash,'base64url')}catch{return false}
  return candidate.length===expected.length&&timingSafeEqual(candidate,expected);
}
async function newRecord(username:string,password:string,version:number):Promise<AdminCredentials>{
  const salt=randomBytes(16).toString('base64url');
  return {username,salt,passwordHash:(await derive(password,salt)).toString('base64url'),version};
}

export async function authenticateAdmin(username:string,password:string):Promise<AdminCredentials|null>{
  if(username.length>100||password.length>256)return null;
  const stored=await storedCredentials();
  if(stored)return await matches(stored,username,password)?stored:null;
  const initialUsername=process.env.ADMIN_USERNAME||process.env.ADMIN_EMAIL||'';
  const initialPassword=process.env.ADMIN_PASSWORD||'';
  if(!initialUsername||!initialPassword||!constantTimeText(username,initialUsername)||!constantTimeText(password,initialPassword))return null;
  const initial=await newRecord(initialUsername,initialPassword,1);
  const sql=getDb();
  const inserted=await sql`insert into site_settings(key,value) values('admin_credentials',${JSON.stringify(initial)}::jsonb) on conflict(key) do nothing returning value`;
  if(inserted.length)return validRecord(inserted[0].value);
  const raced=await storedCredentials();
  return raced&&await matches(raced,username,password)?raced:null;
}

export async function changeAdminCredentials(username:string,currentPassword:string,newUsername:string,newPassword:string):Promise<AdminCredentials|null>{
  const current=await authenticateAdmin(username,currentPassword);
  if(!current)return null;
  const replacement=newPassword?await newRecord(newUsername,newPassword,current.version+1):{...current,username:newUsername,version:current.version+1};
  const sql=getDb();
  const updated=await sql`update site_settings set value=${JSON.stringify(replacement)}::jsonb where key='admin_credentials' and value->>'version'=${String(current.version)} returning value`;
  return updated.length?validRecord(updated[0].value):null;
}

export function makeAdminToken(username:string,version:number){
  const payload=Buffer.from(JSON.stringify({username,version,exp:Date.now()+7*24*60*60*1000})).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export async function isAdminRequest(request:NextRequest){
  try{
    const token=request.cookies.get(COOKIE)?.value;
    if(!token)return false;
    const [payload,signature,...extra]=token.split('.');
    if(!payload||!signature||extra.length)return false;
    const a=Buffer.from(signature,'base64url'),b=Buffer.from(sign(payload),'base64url');
    if(a.length!==b.length||!timingSafeEqual(a,b))return false;
    const data=JSON.parse(Buffer.from(payload,'base64url').toString());
    if(typeof data.username!=='string'||!Number.isInteger(data.version)||data.exp<=Date.now())return false;
    const current=await storedCredentials();
    return !!current&&data.username===current.username&&data.version===current.version;
  }catch{return false}
}

export const adminCookieName=COOKIE;
