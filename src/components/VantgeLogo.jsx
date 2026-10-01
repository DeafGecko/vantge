export default function VantgeLogo({ size = 'md', variant = 'dark', showWordmark = true }) {
      const scales = { sm: 0.7, md: 1, lg: 1.4, xl: 2 }
      const s = scales[size] ?? 1
      const markSize = Math.round(32 * s)
      const wordSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : size === 'xl' ? 'text-4xl' : 'text-2xl'
      const wordColor = variant === 'dark' ? 'text-white' : 'text-[#1A1A18]'

      return (
            <div className="flex items-center gap-2">
                  <img src="/vantge-logo.svg" width={markSize} height={markSize} alt="" aria-hidden="true" />
                  {showWordmark && (
                        <span className={`font-black tracking-tight leading-none ${wordSize} ${wordColor}`}>
                              Vantge
                        </span>
                  )}
            </div>
      )
}
