'use client';
import {createContext,useContext,useEffect,useMemo,useState} from 'react';
import {products as previewProducts,type Product} from '@/lib/products';
export type CartItem={product:Product;size:string;color:string;qty:number};
type Store={cart:CartItem[];products:Product[];language:'en'|'ar';add:(p:Product,size:string,color:string)=>void;change:(id:string,size:string,color:string,delta:number)=>void;remove:(id:string,size:string,color:string)=>void;clear:()=>void;setLanguage:(x:'en'|'ar')=>void;openCart:()=>void;cartOpen:boolean;setCartOpen:(x:boolean)=>void};
const C=createContext<Store|null>(null);
export function StoreProvider({children}:{children:React.ReactNode}){const[cart,setCart]=useState<CartItem[]>([]),[products,setProducts]=useState<Product[]>(previewProducts),[language,setLanguageState]=useState<'en'|'ar'>('en'),[cartOpen,setCartOpen]=useState(false);
 useEffect(()=>{try{setCart(JSON.parse(localStorage.getItem('yj-cart')||'[]'));const lang=localStorage.getItem('yj-language')==='ar'?'ar':'en';setLanguageState(lang);document.documentElement.lang=lang;document.documentElement.dir=lang==='ar'?'rtl':'ltr'}catch{};fetch('/api/products').then(r=>r.ok?r.json():null).then(d=>{if(Array.isArray(d?.products)){setProducts(d.products);const byId=new Map<string,Product>(d.products.map((p:Product)=>[p.id,p]));setCart(old=>old.map(item=>byId.has(item.product.id)?{...item,product:byId.get(item.product.id)!}:item))}}).catch(()=>{})} ,[]);
 useEffect(()=>{localStorage.setItem('yj-cart',JSON.stringify(cart))},[cart]);
 const setLanguage=(x:'en'|'ar')=>{setLanguageState(x);localStorage.setItem('yj-language',x);document.documentElement.lang=x;document.documentElement.dir=x==='ar'?'rtl':'ltr'};
 const add=(product:Product,size:string,color:string)=>{setCart(old=>{const found=old.find(x=>x.product.id===product.id&&x.size===size&&x.color===color);return found?old.map(x=>x===found?{...x,qty:x.qty+1}:x):[...old,{product,size,color,qty:1}]});setCartOpen(true)};
 const change=(id:string,size:string,color:string,delta:number)=>setCart(old=>old.flatMap(x=>x.product.id===id&&x.size===size&&x.color===color?(x.qty+delta<=0?[]:[{...x,qty:x.qty+delta}]):[x]));
 const remove=(id:string,size:string,color:string)=>setCart(old=>old.filter(x=>!(x.product.id===id&&x.size===size&&x.color===color)));
 const value=useMemo(()=>({cart,products,language,add,change,remove,clear:()=>setCart([]),setLanguage,openCart:()=>setCartOpen(true),cartOpen,setCartOpen}),[cart,products,language,cartOpen]);return <C.Provider value={value}>{children}</C.Provider>}
export function useStore(){const x=useContext(C);if(!x)throw new Error('StoreProvider missing');return x}
