import React from "react";
import Image from "next/image";

const TermsCard = ({ onClose }: { onClose?: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="relative bg-gradient-to-br from-[#1a1a2e] via-[#23243a] to-[#2563eb] rounded-3xl shadow-2xl p-0 max-w-xl w-full border-2 border-blue-700/40 flex flex-col items-center animate-fade-in">
      {/* Header with icon */}
      <div className="w-full flex flex-col items-center justify-center pt-10 pb-4 bg-gradient-to-r from-blue-800/80 via-indigo-900/80 to-blue-700/80 rounded-t-3xl">
        <Image src="/twinance-logo.png" alt="Twinance Logo" width={112} height={112} className="w-28 h-28 object-contain mb-3 animate-glow" />
        <h2 className="text-3xl font-extrabold text-blue-200 mb-2 drop-shadow-lg tracking-wide">Terms & Conditions</h2>
        <p className="text-blue-100 mb-2 text-lg text-center font-medium max-w-md">Welcome to Twinance! By using our platform, you agree to the following terms and conditions. Please read them carefully before proceeding.</p>
      </div>
      {/* Content */}
      <div className="w-full px-10 py-8 flex flex-col items-center">
        <ul className="list-disc pl-6 text-blue-300 mb-6 text-base text-left w-full max-w-md mx-auto">
          <li className="mb-2">Your data is securely stored and never shared without your consent.</li>
          <li className="mb-2">Use Twinance responsibly and do not attempt to misuse or disrupt the service.</li>
          <li className="mb-2">All financial insights are for informational purposes only and do not constitute financial advice.</li>
          <li className="mb-2">We reserve the right to update these terms at any time. Continued use of Twinance means you accept any changes.</li>
        </ul>
      </div>
      {/* Close button */}
      <button
        className="absolute top-4 right-4 text-white bg-gradient-to-r from-blue-600 to-blue-400 rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform text-2xl font-bold border-2 border-blue-700/40"
        aria-label="Close Terms"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  </div>
);

export default TermsCard;
