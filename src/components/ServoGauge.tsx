import { cn } from "@/lib/utils";

interface ServoGaugeProps {
  angle: number;
  maxAngle?: number;
  className?: string;
}

export const ServoGauge = ({ angle, maxAngle = 270, className }: ServoGaugeProps) => {
  const normalizedAngle = (angle / maxAngle) * 270 - 135;
  
  return (
    <div className={cn("card-industrial p-6", className)}>
      <h3 className="font-semibold mb-4 text-center">Servo Position</h3>
      
      <div className="relative w-48 h-48 mx-auto">
        {/* Gauge background */}
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="188.5"
            strokeDashoffset="62.8"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray="188.5"
            strokeDashoffset={188.5 - (angle / maxAngle) * 188.5 + 62.8}
            className="transition-all duration-500"
          />
          <defs>
            <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--success))" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Needle */}
        <div 
          className="absolute inset-0 flex items-center justify-center transition-transform duration-500"
          style={{ transform: `rotate(${normalizedAngle}deg)` }}
        >
          <div className="w-1 h-16 bg-gradient-to-t from-primary to-transparent rounded-full origin-bottom" />
        </div>
        
        {/* Center dot */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-4 h-4 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary))]" />
        </div>
        
        {/* Value display */}
        <div className="absolute inset-0 flex items-center justify-center mt-16">
          <span className="text-3xl font-mono font-bold text-foreground">{angle}°</span>
        </div>
      </div>
      
      {/* Scale labels */}
      <div className="flex justify-between text-xs text-muted-foreground mt-2 px-4">
        <span>0°</span>
        <span>120°</span>
        <span>240°</span>
      </div>
    </div>
  );
};
