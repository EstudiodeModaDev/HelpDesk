import React, {useEffect, useMemo, useRef} from "react";

type Props = {
  value: string;                          // HTML
  onChange: (html: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;
};

export default function RichTextBase64({
  value,
  onChange,
  placeholder = "Escribe aquí…",
  readOnly,
  className = "",
}: Props) {
  const editorRef = useRef<HTMLDivElement>(null);

  // Sincroniza HTML externo → editor
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if (el.innerHTML !== value) el.innerHTML = value || "";
  }, [value]);

  // onInput: emite HTML
  const handleInput = () => {
    if (!editorRef.current) return;
    onChange(editorRef.current.innerHTML);
  };

  // Inserta HTML en el caret actual
  const insertHTMLAtCursor = (html: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    range.deleteContents();
    const frag = range.createContextualFragment(html);
    range.insertNode(frag);
    // Mueve el caret al final del nodo insertado
    sel.collapseToEnd();
    handleInput();
  };

  // Convierte File → dataURL
  const fileToDataURL = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result as string);
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });

  // Pegar imágenes (Ctrl+V desde portapapeles)
  const handlePaste: React.ClipboardEventHandler<HTMLDivElement> = async (e) => {
    if (!e.clipboardData) return;
    const files: File[] = [];
    for (const item of e.clipboardData.items) {
      if (item.kind === "file") {
        const f = item.getAsFile();
        if (f && f.type.startsWith("image/")) files.push(f);
      }
    }
    if (files.length === 0) return;

    e.preventDefault(); // evitamos que el navegador pegue otra cosa

    for (const file of files) {
      const dataUrl = await fileToDataURL(file);
      insertHTMLAtCursor(`<img src="${dataUrl}" style="max-width:100%;height:auto;" />`);
    }
  };

  // Arrastrar & soltar imágenes
  const handleDrop: React.DragEventHandler<HTMLDivElement> = async (e) => {
    e.preventDefault();
    if (!e.dataTransfer?.files?.length) return;
    const imgs = Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("image/"));
    for (const f of imgs) {
      const dataUrl = await fileToDataURL(f);
      insertHTMLAtCursor(`<img src="${dataUrl}" style="max-width:100%;height:auto;" />`);
    }
  };

  const preventDefault: React.DragEventHandler<HTMLDivElement> = (e) => e.preventDefault();

  // Comandos simples (usa execCommand: sigue funcionando en la práctica)
  const cmd = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    handleInput();
  };

  const Toolbar = useMemo(
    () => (
      <div className="rte-toolbar">
        <button type="button" onClick={() => cmd("bold")} title="Negrita">B</button>
        <button type="button" onClick={() => cmd("italic")} title="Cursiva"><i>I</i></button>
        <button type="button" onClick={() => cmd("underline")} title="Subrayado"><u>U</u></button>
        <span className="rte-sep" />
        <button type="button" onClick={() => cmd("insertUnorderedList")} title="Viñetas">• List</button>
        <button type="button" onClick={() => cmd("insertOrderedList")} title="Numerada">1. List</button>
        <span className="rte-sep" />
        <button
          type="button"
          onClick={() => {
            const url = prompt("URL del enlace:");
            if (url) cmd("createLink", url);
          }}
          title="Enlace"
        >
          🔗
        </button>
        <button
          type="button"
          onClick={async () => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = "image/*";
            input.onchange = async () => {
              const f = input.files?.[0];
              if (!f) return;
              const dataUrl = await fileToDataURL(f);
              insertHTMLAtCursor(`<img src="${dataUrl}" style="max-width:100%;height:auto;" />`);
            };
            input.click();
          }}
          title="Insertar imagen"
        >
          🖼️
        </button>
        <button type="button" onClick={() => cmd("removeFormat")} title="Limpiar">⨂</button>
      </div>
    ),
    []
  );

  return (
    <div className={`rte ${className}`}>
      {!readOnly && Toolbar}
      <div
        ref={editorRef}
        className="rte-editor"
        contentEditable={!readOnly}
        onInput={handleInput}
        onPaste={handlePaste}
        onDrop={handleDrop}
        onDragOver={preventDefault}
        onDragEnter={preventDefault}
        onDragLeave={preventDefault}
        data-placeholder={placeholder}
        suppressContentEditableWarning
      />
    </div>
  );
}
