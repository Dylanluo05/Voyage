interface CircularProgressProps {
    value: number;
    max: number;
    label: string;
    size: number;
    color: string;
}

export default function CircularProgress({ value, max, label, size, color }: CircularProgressProps) {
    const strokeWidth = 12;
    const radius = (size / 2) - strokeWidth;
    const circumference = 2 * Math.PI * radius;
    const percentage = value / max;
    const offset = circumference * (1 - percentage);
    const textSpans = label.split('\n');

    return (
        <svg width={size} height={size}>
            <circle r={radius} cx={size / 2} cy={size / 2} stroke="rgba(255,255,255,0.12)" strokeWidth={strokeWidth} fill="none" strokeLinecap="round" />
            <circle r={radius} cx={size / 2} cy={size / 2} stroke={color} strokeWidth={strokeWidth} fill="none" transform={`rotate(-90, ${size / 2}, ${size / 2})`} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
            <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="middle" fill="currentColor">
                {textSpans.map((text, idx) => (
                    <tspan key={text} x={size / 2} dy={idx === 0 ? `${-(textSpans.length - 1) * 0.7}em` : "1.4em"}>{text}</tspan>
                ))}
            </text>
        </svg>
    );
}