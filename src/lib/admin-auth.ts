import {createHmac,timingSafeEqual} from 'node:crypto';
import type {NextRequest} from 'next/server';

const COOKIE='yj_admin';
function secret(){const s=process.env.ADMIN_SESSION_SECRET;if(!s||s.length<32)throw new Error('ADMIN_SESSION_SECRET must be at least 32 characters');return s}
function sign(value:string){return createHmac('sha256',secret()).update(value).digest('base64url')}
export function makeAdminToken(email:string){const payload=Buffer.from(JSON.stringify({email,exp:Date.now()+7*24*60*60*1000})).toString('base64url');return `${payload}.${sign(payload)}`}
export function isAdminRequest(request:NextRequest){try{const token=request.cookies.get(COOKIE)?.value;if(!token)return false;const [payload,signature]=token.split('.');const expected=sign(payload);const a=Buffer.from(signature),b=Buffer.from(expected);if(a.length!==b.length||!timingSafeEqual(a,b))return false;const data=JSON.parse(Buffer.from(payload,'base64url').toString());return !!data.email&&data.exp>Date.now()}catch{return false}}
export const adminCookieName=COOKIE;
