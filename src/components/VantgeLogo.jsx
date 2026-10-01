export default function VantgeLogo({ size = 'md', variant = 'dark', showWordmark = true, monoWhite = false }) {
      const scales = { sm: 0.7, md: 1, lg: 1.4, xl: 2 }
      const s = scales[size] ?? 1
      const markSize = Math.round(32 * s)
      const wordSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : size === 'xl' ? 'text-4xl' : 'text-2xl'
      const wordColor = variant === 'dark' ? 'text-white' : 'text-[#1A1A18]'
      const markFill = monoWhite ? '#FFFFFF' : '#b29746'

      return (
            <div className="flex items-center gap-2">
                  <svg width={markSize} height={markSize} viewBox="0 0 165.01 165.14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                        <path fill={markFill} d="M98.35,70.37c.31.85.49,1.76.49,2.72,0,4.35-3.53,7.88-7.88,7.88s-7.88-3.53-7.88-7.88,3.53-7.88,7.88-7.88c.78,0,1.54.12,2.25.33-3.29-2.17-7.23-3.44-11.47-3.44-11.52,0-20.85,9.34-20.85,20.86s9.34,20.85,20.85,20.85,20.85-9.34,20.85-20.85c0-4.73-1.6-9.08-4.25-12.58Z"/>
                        <path fill={markFill} d="M109.94,103.65s-32.57,34.1-69.03,50.4c0,0,22.21,15.2,55.7,10,0,0,9.6-14.37,13.34-60.41Z"/>
                        <path fill={markFill} d="M54.82,62.01S86.73,27.3,122.88,10.31c0,0-22.49-14.78-55.88-8.95,0,0-9.32,14.54-12.19,60.65Z"/>
                        <path fill={markFill} d="M77.9,48.53s47.14-1.36,84.53,12.68c0,0-5.11-26.42-32.58-46.27,0,0-16.92,3.47-51.95,33.59Z"/>
                        <path fill={markFill} d="M103.02,55.72s34.69,31.94,51.66,68.09c0,0,14.79-22.48,8.98-55.87,0,0-14.54-9.33-60.64-12.22Z"/>
                        <path fill={markFill} d="M116.7,77.79s1.41,47.13-12.6,84.54c0,0,26.42-5.14,46.24-32.63,0,0-3.49-16.92-33.64-51.91Z"/>
                        <path fill={markFill} d="M48.42,87.85s-2.03-47.11,11.48-84.7c0,0-26.35,5.48-45.8,33.23,0,0,3.71,16.87,34.32,51.47Z"/>
                        <path fill={markFill} d="M87.58,116.29s-47.11,1.97-84.68-11.59c0,0,5.45,26.35,33.18,45.84,0,0,16.88-3.69,51.51-34.26Z"/>
                        <path fill={markFill} d="M62.16,110.85S27.27,79.12,10.09,43.07c0,0-14.65,22.57-8.64,55.92,0,0,14.6,9.24,60.71,11.85Z"/>
                  </svg>
                  {showWordmark && (
                        <span className={`font-black tracking-tight leading-none ${wordSize} ${monoWhite ? 'text-white' : wordColor}`}>
                              Vantge
                        </span>
                  )}
            </div>
      )
}
