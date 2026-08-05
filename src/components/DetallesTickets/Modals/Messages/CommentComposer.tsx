// src/features/requests/components/mentions/CommentComposer.tsx
import { useEffect, useMemo, useRef } from 'react';
import { Mention } from '@tiptap/extension-mention';
import type { SuggestionOptions } from '@tiptap/suggestion';
import { MentionList, type MentionListRef } from './MentionList';
import { EditorContent, ReactRenderer, useEditor, useEditorState } from '@tiptap/react';
import { extractMentionIds, filterMentionables, shortName } from '../../../../utils/mentions';
import StarterKit from '@tiptap/starter-kit';
import { Placeholder } from '@tiptap/extensions';
import { Send } from 'lucide-react';
import type { SolviUser } from '../../../../repositories/ParticipantsRepository/MessagesRepository';


// Altura máxima del panel (debe coincidir con maxHeight del panel en MentionList).
const PANEL_MAX_H = 240;
const GAP = 6;
const MARGIN = 8;

export function buildMentionSuggestion(getItems: (query: string) => SolviUser[],): Omit<SuggestionOptions, 'editor'> {
  return {
    char: '@',
    items: ({ query }) => getItems(query),
    render: () => {
      let component: ReactRenderer<MentionListRef> | null = null;
      let wrapper: HTMLDivElement | null = null;

      const place = (rect: DOMRect | null | undefined) => {
        if (!wrapper || !rect) return;

        const spaceBelow = window.innerHeight - rect.bottom;
        // Si abajo no cabe el panel (a su altura máxima), abrir hacia arriba.
        const openUp = spaceBelow < PANEL_MAX_H + GAP + MARGIN;

        wrapper.style.left = `${rect.left}px`;

        if (openUp) {
          // Anclar por la parte de ABAJO del wrapper al caret: crece hacia arriba
          // sin importar cuántos items tenga. bottom fijo, top libre.
          wrapper.style.top    = 'auto';
          wrapper.style.bottom = `${window.innerHeight - rect.top + GAP}px`;
        } else {
          wrapper.style.bottom = 'auto';
          wrapper.style.top    = `${rect.bottom + GAP}px`;
        }
      };

      return {
        onStart: (props) => {
          component = new ReactRenderer(MentionList, { props, editor: props.editor });
          wrapper = document.createElement('div');
          wrapper.style.position = 'fixed';
          wrapper.style.zIndex = '2000';
          wrapper.appendChild(component.element);
          document.body.appendChild(wrapper);
          place(props.clientRect?.());
        },
        onUpdate: (props) => { component?.updateProps(props); place(props.clientRect?.()); },
        onKeyDown: (props) => {
          if (props.event.key === 'Escape') return true;
          return component?.ref?.onKeyDown(props) ?? false;
        },
        onExit: () => { wrapper?.remove(); component?.destroy(); wrapper = null; component = null; },
      };
    },
  };
}

type Mentioner = { User_ID: number; User_Role: string; Department_ID: number | null };
type Props = {
  users: SolviUser[];
  mentioner: Mentioner;
  isConfidential: boolean;
  sending: boolean;
  onSubmit: (text: string, mentionedUserIds: number[]) => void;
};

export function CommentComposer({ users, mentioner, isConfidential, sending, onSubmit }: Props) {
  const dataRef = useRef({ users, mentioner, isConfidential });
  dataRef.current = { users, mentioner, isConfidential };

  const mentionExt = useMemo(
    () =>
      Mention.configure({
        HTMLAttributes: { class: 'prisma-mention' },
        renderText: ({ node }) => `@[${node.attrs.id}]`,
        renderHTML: ({ node }) => {
          const short = shortName(String(node.attrs.label ?? node.attrs.id));
          return ['span', { class: 'prisma-mention' }, `@${short}`];
        },
        suggestion: buildMentionSuggestion((query) => {
          const d = dataRef.current;
          const result = filterMentionables(query, d.users, d.mentioner, d.isConfidential, {
            excludeUserId: d.mentioner.User_ID,
          });
          return result;
        }),
      }),
    [],
  );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, bulletList: false, orderedList: false, listItem: false,
        blockquote: false, codeBlock: false, horizontalRule: false,
        bold: false, italic: false, strike: false, code: false,
      }),
      Placeholder.configure({ placeholder: 'Escribe un comentario… (@ menciona, Ctrl+Enter envía)' }),
      mentionExt,
    ],
    editorProps: { attributes: { class: 'prisma-comment-input', style: 'outline:none' } },
  });

  // ── v3: el componente NO re-renderiza por transacción; leemos isEmpty reactivo ──
  const isEmpty = useEditorState({
    editor,
    selector: (ctx) => ctx.editor?.isEmpty ?? true,
  });

  useEffect(() => () => editor?.destroy(), [editor]);

  function submit() {
    if (!editor || sending) return;
    const text = editor.getText({ blockSeparator: '\n' }).trim();
    if (!text) return;
    onSubmit(text, extractMentionIds(text));
    editor.commands.clearContent();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); submit(); }
  }

  const empty = !editor || isEmpty;

  return (
    <div style={{ padding: '10px 14px', borderTop: '1px solid var(--bd)', display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div className="prisma-comment-wrapper" onKeyDown={onKeyDown}>
        <EditorContent editor={editor} />
      </div>
      <button onClick={submit} disabled={empty || sending}
        style={{ alignSelf: 'flex-end', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 6, background: !empty ? 'var(--primary)' : 'var(--surface-elev)', border: `1px solid ${!empty ? 'transparent' : 'var(--bd)'}`, color: !empty ? 'var(--primary-ink)' : 'var(--muted)', fontSize: 11, fontWeight: 600, cursor: !empty ? 'pointer' : 'not-allowed' }}>
        <Send size={11} />{sending ? 'Enviando…' : 'Enviar'}
      </button>
    </div>
  );
}