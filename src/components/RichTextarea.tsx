import React, { useState, useRef } from "react";
import { Bold, Italic, Underline, Maximize2, Minimize2 } from "lucide-react";

interface RichTextareaProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
  label?: string;
  id?: string;
  disabled?: boolean;
}

export const RichTextarea: React.FC<RichTextareaProps> = ({
  value,
  onChange,
  placeholder = "Digite aqui...",
  rows = 3,
  className = "",
  label,
  id,
  disabled = false
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const applyFormat = (tag: "b" | "i" | "u") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = value.substring(start, end);

    let openTag = `<b>`;
    let closeTag = `</b>`;
    if (tag === "i") {
      openTag = `<i>`;
      closeTag = `</i>`;
    } else if (tag === "u") {
      openTag = `<u>`;
      closeTag = `</u>`;
    }

    let newValue: string;
    let newCursorPos: number;

    if (selectedText) {
      const before = value.substring(0, start);
      const after = value.substring(end);
      newValue = `${before}${openTag}${selectedText}${closeTag}${after}`;
      newCursorPos = start + openTag.length + selectedText.length + closeTag.length;
    } else {
      const before = value.substring(0, start);
      const after = value.substring(start);
      newValue = `${before}${openTag}${closeTag}${after}`;
      newCursorPos = start + openTag.length;
    }

    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  return (
    <div className={`space-y-1.5 transition-all ${className}`}>
      {label && (
        <label htmlFor={id} className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight">
          {label}
        </label>
      )}

      <div className="relative group rounded-xl border border-slate-300 bg-white transition-all focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-500/20 shadow-xs">
        {/* Barra de formatação - Aparece SOMENTE ao clicar/focar no campo de texto */}
        {isFocused && !disabled && (
          <div 
            className="flex items-center justify-between px-2.5 py-1.5 bg-slate-50 border-b border-slate-200 rounded-t-xl text-xs animate-fade-in select-none"
            onMouseDown={(e) => e.preventDefault()} // Impede que o textarea perca o foco ao clicar nos botões
          >
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => applyFormat("b")}
                className="p-1 px-2 hover:bg-slate-200/80 active:bg-amber-100 rounded text-slate-800 hover:text-amber-900 font-extrabold text-xs flex items-center gap-1 transition-colors cursor-pointer border border-transparent hover:border-slate-300"
                title="Negrito (<b>...</b>)"
              >
                <Bold className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Negrito</span>
              </button>

              <button
                type="button"
                onClick={() => applyFormat("i")}
                className="p-1 px-2 hover:bg-slate-200/80 active:bg-amber-100 rounded text-slate-800 hover:text-amber-900 italic text-xs flex items-center gap-1 transition-colors cursor-pointer border border-transparent hover:border-slate-300"
                title="Itálico (<i>...</i>)"
              >
                <Italic className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Itálico</span>
              </button>

              <button
                type="button"
                onClick={() => applyFormat("u")}
                className="p-1 px-2 hover:bg-slate-200/80 active:bg-amber-100 rounded text-slate-800 hover:text-amber-900 underline text-xs flex items-center gap-1 transition-colors cursor-pointer border border-transparent hover:border-slate-300"
                title="Sublinhado (<u>...</u>)"
              >
                <Underline className="w-3.5 h-3.5" />
                <span className="text-[10px] hidden sm:inline">Sublinhado</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-400 hidden md:inline">
                Selecione o texto para formatar
              </span>
              
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 hover:bg-slate-200 text-slate-500 rounded transition-colors cursor-pointer"
                title={isExpanded ? "Reduzir altura" : "Aumentar área de texto"}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        <textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={isExpanded ? Math.max(rows + 4, 7) : rows}
          disabled={disabled}
          placeholder={placeholder}
          className={`w-full p-2.5 bg-transparent text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none resize-y transition-all ${
            isFocused && !disabled ? "rounded-b-xl" : "rounded-xl"
          }`}
          style={{ minHeight: isExpanded ? "160px" : "80px" }}
        />
      </div>
    </div>
  );
};

export const FormattedText: React.FC<{ text: string; className?: string }> = ({ text, className = "" }) => {
  if (!text) return null;

  const html = text
    .replace(/\n/g, '<br/>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/\*([^*]+)\*/g, '<i>$1</i>');

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
