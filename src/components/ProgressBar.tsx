export default function ProgressBar(): React.ReactElement {
  return (
    <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
      <div
        className="h-full bg-purple-500 rounded-full"
        style={{
          animation: "progress-indeterminate 1.5s ease-in-out infinite",
        }}
      />
      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: translateX(-100%); width: 60%; }
          50% { transform: translateX(80%); width: 50%; }
          100% { transform: translateX(200%); width: 40%; }
        }
      `}</style>
    </div>
  );
}
