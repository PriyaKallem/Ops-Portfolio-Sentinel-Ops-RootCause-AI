export default function ModelPicker({ value, onChange, testid = "model-picker" }) {
  const models = [
    { key: "gpt-5.2", label: "GPT-5.2", provider: "OpenAI" },
    { key: "claude-sonnet-4.5", label: "Claude 4.5", provider: "Anthropic" },
    { key: "gemini-3-pro", label: "Gemini 3 Pro", provider: "Google" },
  ];
  return (
    <div className="flex items-center gap-1 surface-deep p-1" data-testid={testid}>
      {models.map((m) => {
        const active = value === m.key;
        return (
          <button
            key={m.key}
            onClick={() => onChange(m.key)}
            data-testid={`${testid}-${m.key}`}
            className={`font-mono text-[10px] uppercase tracking-[0.16em] px-2.5 py-1.5 rounded-sm transition-all duration-150 ${
              active
                ? "bg-[#00E5FF] text-black font-bold"
                : "text-[#A0A0A0] hover:text-white hover:bg-[#1A1A1A]"
            }`}
            title={`${m.provider} ${m.label}`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
