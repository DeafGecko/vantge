// Our own confirm box, shown over a dark background (replaces the browser's pop-up)
export default function ConfirmDialog({ open, title, message, confirmLabel = 'Remove', onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[80] bg-[#1A1A18]/60 flex items-center justify-center p-5" onClick={onCancel}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-msg"
        className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <p id="confirm-title" className="text-lg font-black text-[#1A1A18]">{title}</p>
        <p id="confirm-msg" className="text-base text-[#3D3D38]">{message}</p>
        <div className="flex gap-3 pt-2 justify-end">
          <button onClick={onCancel} autoFocus
            className="px-5 py-3 rounded-full border-2 border-[#1A1A18] text-base font-bold text-[#1A1A18] hover:bg-[#F4F3F0] transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm}
            className="px-5 py-3 rounded-full bg-[#8A1C16] text-base font-bold text-white hover:bg-[#6E150F] transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
