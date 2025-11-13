interface AnimatedTextProps {
  text: string;
  className?: string;
  delay?: number;
}

export function AnimatedText({ text, className = '', delay = 50 }: AnimatedTextProps) {
  const chars = text.split('');

  return (
    <div style={{ display: 'inline-block' }}>
      <p className={className}>
        {chars.map((char, index) => (
          <span
            key={index}
            className="inline-block animate-fade-in-up"
            style={{
              animationDelay: `${index * delay}ms`,
              animationFillMode: 'both'
            }}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        ))}
      </p>
    </div>
  );
}
