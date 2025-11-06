"use client";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import Link from "next/link";

export default function DashboardButton() {
  const { isSignedIn } = useAuth();
  const [showPopup, setShowPopup] = useState(false);

  const handleClick = () => {
    if (isSignedIn) {
      window.location.href = "/dashboard";
    } else {
      setShowPopup(true);
    }
  };

  return (
    <>
      <button
        className="inline-block bg-gradient-to-r from-blue-600 to-blue-400 text-white font-bold px-8 py-4 rounded-xl shadow-lg hover:scale-105 transition-transform text-lg mb-8 border border-blue-700/40"
        onClick={handleClick}
      >
        Dashboard &rarr;
      </button>
      {showPopup && (
        <div style={{position:'fixed',inset:0,zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(30,41,59,0.7)',backdropFilter:'blur(2px)'}}>
          <div style={{background:'linear-gradient(135deg,#23243a 60%,#2563eb 100%)',borderRadius:'2rem',boxShadow:'0 8px 32px rgba(0,0,0,0.25)',padding:'2.5rem 2rem',maxWidth:'400px',width:'90vw',textAlign:'center',position:'relative'}}>
            <img src="/twinance-logo.png" alt="Twinance Logo" style={{width:'72px',height:'72px',objectFit:'contain',marginBottom:'1.5rem'}} />
            <h2 style={{color:'#fff',fontSize:'2rem',fontWeight:800,marginBottom:'1rem'}}>Access Restricted</h2>
            <p style={{color:'#cbd5e1',fontSize:'1.1rem',marginBottom:'2rem'}}>You must <span style={{color:'#60a5fa',fontWeight:600}}>Sign In</span> or <span style={{color:'#60a5fa',fontWeight:600}}>Sign Up</span> to access the dashboard.</p>
            <Link href="/sign-up" style={{display:'inline-block',background:'linear-gradient(90deg,#2563eb,#60a5fa)',color:'#fff',fontWeight:700,padding:'0.75rem 2rem',borderRadius:'1rem',textDecoration:'none',fontSize:'1rem',boxShadow:'0 2px 8px rgba(59,130,246,0.2)',marginBottom:'0.5rem'}}>Sign Up</Link><br/>
            <Link href="/sign-in" style={{display:'inline-block',background:'linear-gradient(90deg,#23243a,#2563eb)',color:'#fff',fontWeight:700,padding:'0.75rem 2rem',borderRadius:'1rem',textDecoration:'none',fontSize:'1rem',boxShadow:'0 2px 8px rgba(59,130,246,0.2)'}}>Sign In</Link>
            <button style={{position:'absolute',top:'1rem',right:'1rem',background:'#2563eb',color:'#fff',border:'none',borderRadius:'50%',width:'2.5rem',height:'2.5rem',fontSize:'1.5rem',fontWeight:700,boxShadow:'0 2px 8px rgba(59,130,246,0.2)',cursor:'pointer'}} onClick={()=>setShowPopup(false)}>×</button>
          </div>
        </div>
      )}
    </>
  );
}
