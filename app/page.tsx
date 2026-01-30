import Navbar from "@/components/Navbar";
import DashboardButton from "@/components/DashboardButton";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-[#1a1a2e] to-[#23243a] flex flex-col relative overflow-hidden">
      <Navbar />
      {/* Decorative blue corners */}
      <div className="absolute top-0 left-0 w-1/2 h-1/2 pointer-events-none z-0">
        <div className="w-full h-full bg-gradient-to-br from-blue-700/60 to-transparent rounded-br-[6rem] blur-2xl" />
      </div>
      <div className="absolute bottom-0 right-0 w-1/2 h-1/2 pointer-events-none z-0">
        <div className="w-full h-full bg-gradient-to-tl from-blue-700/60 to-transparent rounded-tl-[6rem] blur-2xl" />
      </div>
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12 z-10">
        <div className="max-w-2xl w-full text-center">
          <div className="flex justify-center mb-4">
            <span className="bg-black/60 text-white px-4 py-1 rounded-full text-xs font-semibold shadow-lg border border-blue-700/40 flex items-center gap-2">
              Gemini AI
            </span>
          </div>
          <h2 className="text-2xl md:text-3xl font-semibold text-gray-300 mb-2 tracking-wide">STAY IN CONTROL</h2>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">YOUR PERFORMANCE AT A GLANCE</h1>
          <p className="text-lg text-gray-400 mb-8">
            Unlock next-level performance with AI-powered analytics. Track every view, analyze every download, and gain the competitive edge with real-time insights that turn data into domination.
          </p>
          <DashboardButton />
        </div>
        {/* Demo dashboard preview image - moved outside the max-w-2xl container */}
      </main>
      <div className="mt-8 mx-auto w-full flex items-center justify-center">
        <div style={{
          position: 'relative',
          width: 'calc(80vw)',
          maxHeight: 'calc(70vh)',
          margin: '0 auto',
          marginTop: '-40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            borderTop: '2px solid rgba(59,130,246,0.4)',
            borderRadius: '16px 16px 0 0',
            boxShadow: '0 -4px 32px 8px rgba(59,130,246,0.7), 0 -2px 15px 4px rgba(59,130,246,0.5)',
            pointerEvents: 'none',
            zIndex: 2,
          }} />
          <Image 
            src="/dashboard-showcase.png" 
            alt="Dashboard Showcase" 
            className="rounded-2xl shadow-2xl" 
            width={1920}
            height={1080}
            style={{
              objectFit: 'cover',
              display: 'block',
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)'
            }} 
          />
        </div>
      </div>
    </div>
  );
}
