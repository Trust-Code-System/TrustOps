import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Chat markdown renderer — gives assistant answers the same clean, structured
 * typography you see in Claude/ChatGPT (headings, bold, lists, tables, code),
 * all mapped to the design tokens. GitHub-flavored markdown via remark-gfm so
 * tables and task lists render.
 *
 * As a backstop to the system-prompt rule, any em/en dashes that slip through
 * are normalised to a spaced hyphen before rendering.
 */

function sanitize(text: string): string {
  return text.replace(/\s*[—–]\s*/g, " - ");
}

export function Markdown({ children }: { children: string }) {
  return (
    <div
      className={cn(
        "text-body text-text-primary",
        // vertical rhythm between blocks, no stray margins at the edges
        "[&>*]:my-2 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="leading-[24px]">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-[600] text-text-primary">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="font-[500] text-primary-700 underline underline-offset-2 hover:text-primary-600"
            >
              {children}
            </a>
          ),
          ul: ({ children }) => (
            <ul className="list-disc space-y-1 pl-5 marker:text-text-muted">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal space-y-1 pl-5 marker:text-text-muted">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-[24px]">{children}</li>,
          h1: ({ children }) => (
            <h1 className="text-h2 font-[700] text-text-primary">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-h3 font-[700] text-text-primary">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-body-strong font-[600] text-text-primary">
              {children}
            </h3>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border-default pl-3 text-text-secondary">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border-subtle" />,
          code: ({ className, children }) => {
            const isBlock = (className ?? "").includes("language-");
            if (isBlock) {
              return (
                <code className={cn("font-mono text-[13px]", className)}>
                  {children}
                </code>
              );
            }
            return (
              <code className="rounded-sm bg-gray-100 px-1.5 py-0.5 font-mono text-[13px] text-text-primary">
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre className="overflow-x-auto rounded-md border border-border-subtle bg-surface-page p-3 text-text-secondary">
              {children}
            </pre>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-small">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="border-b border-border-default">{children}</thead>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-caption font-[600] uppercase tracking-[0.04em] text-text-muted">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border-subtle px-3 py-2 align-top">
              {children}
            </td>
          ),
        }}
      >
        {sanitize(children)}
      </ReactMarkdown>
    </div>
  );
}
