"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/**
 * Render assistant / AI content as rich GitHub-flavoured Markdown — headings, ordered and
 * unordered lists, tables, code, blockquotes, links — styled for the app surfaces. Used
 * anywhere a model returns Markdown (V-GPT, command-center Copilot/Knowledge, center chats)
 * so `**bold**` and numbered steps render properly instead of showing raw markup.
 */
export function MarkdownView({ content, className }: { content: string; className?: string }) {
  return (
    <div className={className ?? "text-sm leading-relaxed [word-break:break-word]"}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (p) => <p className="my-1.5 first:mt-0 last:mb-0" {...p} />,
          ul: (p) => <ul className="my-1.5 ms-5 list-disc space-y-0.5" {...p} />,
          ol: (p) => <ol className="my-1.5 ms-5 list-decimal space-y-0.5" {...p} />,
          li: (p) => <li className="ps-0.5 [&>p]:my-0" {...p} />,
          h1: (p) => <h1 className="mb-1.5 mt-3 text-base font-semibold first:mt-0" {...p} />,
          h2: (p) => <h2 className="mb-1.5 mt-3 text-[15px] font-semibold first:mt-0" {...p} />,
          h3: (p) => <h3 className="mb-1 mt-2 text-sm font-semibold first:mt-0" {...p} />,
          h4: (p) => <h4 className="mb-1 mt-2 text-sm font-semibold first:mt-0" {...p} />,
          a: (p) => <a className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer" {...p} />,
          strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
          blockquote: (p) => <blockquote className="my-1.5 border-s-2 border-border ps-3 text-muted-foreground" {...p} />,
          hr: () => <hr className="my-3 border-border" />,
          code: (p) => <code className="rounded bg-surface-3 px-1 py-0.5 font-mono text-[12.5px]" {...p} />,
          pre: (p) => <pre className="my-2 overflow-x-auto rounded-md border border-border bg-[#0c1a2e] p-3 text-[12px] leading-relaxed text-slate-100 [&_code]:rounded-none [&_code]:bg-transparent [&_code]:p-0 [&_code]:text-inherit" {...p} />,
          table: (p) => <div className="my-2 overflow-x-auto"><table className="w-full border-collapse text-[13px]" {...p} /></div>,
          thead: (p) => <thead className="bg-surface-3/60" {...p} />,
          th: (p) => <th className="border border-border px-2 py-1 text-start font-semibold" {...p} />,
          td: (p) => <td className="border border-border px-2 py-1 align-top" {...p} />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
