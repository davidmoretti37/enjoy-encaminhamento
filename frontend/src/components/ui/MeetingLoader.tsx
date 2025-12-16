import { useEffect } from "react";

interface MeetingLoaderProps {
  message?: string;
  platform?: "zoom" | "google_meet";
}

export function MeetingLoader({ message = "Criando reunião...", platform }: MeetingLoaderProps) {
  // Prevent scrolling when loader is visible
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, []);

  const platformColor = platform === "zoom" ? "#2563eb" : "#22c55e";
  const platformName = platform === "zoom" ? "Zoom" : "Google Meet";

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <style>{`
        .meeting-loader-gegga {
          width: 0;
        }
        .meeting-loader-snurra {
          filter: url(#meeting-loader-gegga);
        }
        .meeting-loader-stopp1 {
          stop-color: ${platform === "zoom" ? "#2563eb" : "#22c55e"};
        }
        .meeting-loader-stopp2 {
          stop-color: ${platform === "zoom" ? "#60a5fa" : "#86efac"};
        }
        .meeting-loader-halvan {
          animation: meeting-loader-snurra1 10s infinite linear;
          stroke-dasharray: 180 800;
          fill: none;
          stroke: url(#meeting-loader-gradient);
          stroke-width: 23;
          stroke-linecap: round;
        }
        .meeting-loader-strecken {
          animation: meeting-loader-snurra1 3s infinite linear;
          stroke-dasharray: 26 54;
          fill: none;
          stroke: url(#meeting-loader-gradient);
          stroke-width: 23;
          stroke-linecap: round;
        }
        @keyframes meeting-loader-snurra1 {
          0% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -403px;
          }
        }
      `}</style>

      <div className="relative">
        <svg className="meeting-loader-gegga">
          <defs>
            <filter id="meeting-loader-gegga">
              <feGaussianBlur in="SourceGraphic" stdDeviation={7} result="blur" />
              <feColorMatrix
                in="blur"
                mode="matrix"
                values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 20 -10"
                result="inreGegga"
              />
              <feComposite in="SourceGraphic" in2="inreGegga" operator="atop" />
            </filter>
          </defs>
        </svg>

        <svg
          className="meeting-loader-snurra"
          width={200}
          height={200}
          viewBox="0 0 200 200"
        >
          <defs>
            <linearGradient id="meeting-loader-linjarGradient">
              <stop className="meeting-loader-stopp1" offset={0} />
              <stop className="meeting-loader-stopp2" offset={1} />
            </linearGradient>
            <linearGradient
              y2={160}
              x2={160}
              y1={40}
              x1={40}
              gradientUnits="userSpaceOnUse"
              id="meeting-loader-gradient"
              xlinkHref="#meeting-loader-linjarGradient"
            />
          </defs>
          <path
            className="meeting-loader-halvan"
            d="m 164,100 c 0,-35.346224 -28.65378,-64 -64,-64 -35.346224,0 -64,28.653776 -64,64 0,35.34622 28.653776,64 64,64 35.34622,0 64,-26.21502 64,-64 0,-37.784981 -26.92058,-64 -64,-64 -37.079421,0 -65.267479,26.922736 -64,64 1.267479,37.07726 26.703171,65.05317 64,64 37.29683,-1.05317 64,-64 64,-64"
          />
          <circle className="meeting-loader-strecken" cx={100} cy={100} r={64} />
        </svg>

      </div>

      <div className="mt-8 text-center">
        <p className="text-white text-xl font-medium">{message}</p>
        {platform && (
          <p className="text-white/60 text-sm mt-2">
            Conectando ao {platformName}...
          </p>
        )}
      </div>
    </div>
  );
}

export default MeetingLoader;
