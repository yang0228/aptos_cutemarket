import { useMemo } from 'react';
import { Link } from 'react-router-dom';

export function Header() {
  const marqueeRows = useMemo(
    () =>
      [0, 1].map(() => {
        const direction = Math.random() > 0.5 ? 'reverse' : 'normal';
        return {
          delay: Math.random(),
          duration: 6 + Math.random() * 4,
          gap: 5 + Math.random() * 3,
          direction,
        };
      }),
    []
  );

  return (
    <header className="bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="container mx-auto px-4 py-4">
        <Link to="/" className="flex items-center gap-4 hover:opacity-90 transition-opacity">
          <img 
            src="/website-logo.png" 
            alt="cuteMarket Logo" 
            className="h-20 w-20 object-contain drop-shadow-lg"
          />
          <div className="flex flex-col">
            <h1 className="text-3xl font-bold text-white flex items-center gap-4 flex-wrap w-full">
              <span>CuteMarket</span>
              <div className="relative overflow-hidden flex-1 min-w-[220px] space-y-1 py-1">
                {marqueeRows.map((rowConfig, row) => (
                  <div
                    key={row}
                    className={`marquee whitespace-nowrap flex items-center ${
                      rowConfig.direction === 'reverse' ? 'reverse' : ''
                    }`}
                    style={{
                      animationDelay: `${rowConfig.delay}s`,
                      animationDuration: `${rowConfig.duration}s`,
                      gap: `${rowConfig.gap}rem`,
                    }}
                  >
                    {Array.from({ length: 2 }).map((_, idx) => (
                      <span
                        key={idx}
                        className="text-sm font-semibold tracking-[0.4em] uppercase text-white/90"
                      >
                        靠你最内行的事情获利！！！！
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </h1>
            <span className="text-white/80 text-sm">预测市场平台</span>
          </div>
        </Link>
      </div>
    </header>
  );
}

