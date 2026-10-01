// Double-chevron mark + wordmark brand component
// mark: black left chevron, gold right chevron
// size: controls overall scale; variant: 'dark' (white text) | 'light' (dark text)

export default function VantgeLogo({ size = 'md', variant = 'dark', showWordmark = true }) {
      const scales = { sm: 0.7, md: 1, lg: 1.4, xl: 2 }
      const s = scales[size] ?? 1
      const markW = Math.round(32 * s)
      const markH = Math.round(24 * s)
      const wordSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : size === 'xl' ? 'text-4xl' : 'text-2xl'
      const wordColor = variant === 'dark' ? 'text-white' : 'text-[#1A1A18]'

      return (
            <div className="flex items-center gap-0.5">
                  {/* Double-chevron mark */}
                  <svg width={markW} height={markH} viewBox="0 0 32 24" fill="none">
                        {/* Left chevron — solid dark/black */}
                        <path
                              d="M0 12 L8 0 L13 0 L5 12 L13 24 L8 24 Z"
                              fill={variant === 'dark' ? '#FFFFFF' : '#1A1A18'}
                        />
                        {/* Right chevron — gold */}
                        <path
                              d="M10 12 L18 0 L23 0 L15 12 L23 24 L18 24 Z"
                              fill="#B8973A"
                        />
                  </svg>

                  {showWordmark && (
                        <span className={`font-black tracking-tight leading-none ${wordSize} ${wordColor}`}>
                              Vantge
                        </span>
                  )}
            </div>
      )
}
