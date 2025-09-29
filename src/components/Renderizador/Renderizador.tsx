import * as React from "react";
import DOMPurify from "dompurify";

type Props = { html?: string; className?: string };

export default function HtmlContent({ html = "", className }: Props) {
  const clean = React.useMemo(() => {
    return DOMPurify.sanitize(html, {
      USE_PROFILES: { html: true },            // permite tags HTML comunes
      ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel|data:image\/(?:png|jpeg|gif|webp));)/i,
      ADD_ATTR: ["target", "rel"],             // para links con target/rel
    });
  }, [html]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: clean }} />;
}
