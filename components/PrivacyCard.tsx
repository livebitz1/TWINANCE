import React from "react";


const PrivacyCard = ({ onClose }: { onClose?: () => void }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    <div className="relative bg-gradient-to-br from-[#1a1a2e] via-[#23243a] to-[#2563eb] rounded-3xl shadow-2xl p-0 max-w-xl w-full border-2 border-blue-700/40 flex flex-col items-center animate-fade-in">
      {/* Header with icon */}
      <div className="w-full flex flex-col items-center justify-center pt-10 pb-4 bg-gradient-to-r from-blue-800/80 via-indigo-900/80 to-blue-700/80 rounded-t-3xl">
        <img src="/twinance-logo.png" alt="Twinance Logo" className="w-28 h-28 object-contain mb-3 animate-glow" />
        <h2 className="text-3xl font-extrabold text-blue-200 mb-2 drop-shadow-lg tracking-wide">Privacy Policy</h2>
        <p className="text-blue-100 mb-2 text-lg text-center font-medium max-w-md">Your privacy is important to us. This Privacy Policy explains how Twinance collects, uses, and protects your information.</p>
      </div>
      {/* Content */}
      <div className="w-full px-10 py-8 flex flex-col items-center">
        <ul className="list-disc pl-6 text-blue-300 mb-6 text-base text-left w-full max-w-md mx-auto">
          <li className="mb-2">We do not sell or share your personal data with third parties.</li>
          <li className="mb-2">All data is encrypted and stored securely.</li>
          <li className="mb-2">You can request deletion of your data at any time.</li>
          <li className="mb-2">We use cookies only to improve your experience and never for tracking.</li>
          <li className="mb-2">Updates to this policy will be communicated clearly within the app.</li>
        </ul>
      </div>
      {/* Close button */}
      <button
        className="absolute top-4 right-4 text-white bg-gradient-to-r from-blue-600 to-blue-400 rounded-full w-10 h-10 flex items-center justify-center shadow-lg hover:scale-110 transition-transform text-2xl font-bold border-2 border-blue-700/40"
        aria-label="Close Privacy"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  </div>
);

export default PrivacyCard;
