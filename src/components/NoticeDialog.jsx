// Our own notice box, shown over a dark background (replaces the browser's alert pop-up)
export default function NoticeDialog({ open, title, message, onClose }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[90] bg-[#1A1A18]/60 flex items-center justify-center p-5" onClick={onClose}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="notice-title" aria-describedby="notice-msg"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <p id="notice-title" className="text-lg font-black text-[#1A1A18]">{title}</p>
        <p id="notice-msg" className="text-base text-[#3D3D38]">{message}</p>
        <div className="flex pt-2 justify-end">
          <button onClick={onClose} autoFocus
            className="px-5 py-3 rounded-full bg-[#1A1A18] text-base font-bold text-white hover:bg-[#333330] transition-colors">
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
