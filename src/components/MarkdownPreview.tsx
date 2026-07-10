// src/components/MarkdownPreview.tsx
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

/**
 * Markdownプレビューコンポーネント
 * react-markdown + remark-gfm でGitHub Flavored Markdownをレンダリング
 */
export function MarkdownPreview({ content, className = '' }: MarkdownPreviewProps) {
  if (!content || content.trim() === '') {
    return (
      <div className={`text-gray-400 dark:text-gray-500 italic ${className}`}>
        メモがありません
      </div>
    );
  }

  return (
    <div
      className={`
        markdown-preview
        prose prose-sm dark:prose-invert
        max-w-none
        ${className}
      `}
      style={{
        // Tailwind proseのカスタマイズ
        '--tw-prose-body': 'rgb(55 65 81)',
        '--tw-prose-headings': 'rgb(17 24 39)',
        '--tw-prose-links': 'rgb(37 99 235)',
        '--tw-prose-bold': 'rgb(17 24 39)',
        '--tw-prose-code': 'rgb(17 24 39)',
        '--tw-prose-pre-bg': 'rgb(243 244 246)',
        '--tw-prose-pre-code': 'rgb(17 24 39)',
        '--tw-prose-quotes': 'rgb(75 85 99)',
        '--tw-prose-quote-borders': 'rgb(229 231 235)',
        '--tw-prose-invert-body': 'rgb(209 213 219)',
        '--tw-prose-invert-headings': 'rgb(243 244 246)',
        '--tw-prose-invert-links': 'rgb(96 165 250)',
        '--tw-prose-invert-bold': 'rgb(243 244 246)',
        '--tw-prose-invert-code': 'rgb(243 244 246)',
        '--tw-prose-invert-pre-bg': 'rgb(31 41 55)',
        '--tw-prose-invert-pre-code': 'rgb(209 213 219)',
        '--tw-prose-invert-quotes': 'rgb(156 163 175)',
        '--tw-prose-invert-quote-borders': 'rgb(55 65 81)',
      } as React.CSSProperties}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // カスタムコンポーネント（必要に応じて）
          h1: ({ node, ...props }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 first:mt-0" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 first:mt-0" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-lg font-bold mb-2 mt-4 first:mt-0" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-3 leading-relaxed" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside mb-3 space-y-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="ml-4" {...props} />
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            if (inline) {
              return (
                <code
                  className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 text-sm rounded"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className={`block p-3 bg-gray-100 dark:bg-gray-800 rounded-lg overflow-x-auto text-sm ${className || ''}`}
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ node, ...props }) => (
            <pre className="mb-3 overflow-hidden rounded-lg" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 italic text-gray-600 dark:text-gray-400 mb-3"
              {...props}
            />
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-blue-600 dark:text-blue-400 underline hover:text-blue-800 dark:hover:text-blue-300"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          hr: ({ node, ...props }) => (
            <hr className="my-4 border-gray-300 dark:border-gray-600" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto mb-3">
              <table className="min-w-full border border-gray-300 dark:border-gray-600" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border border-gray-300 dark:border-gray-600 px-3 py-2 bg-gray-100 dark:bg-gray-700 font-semibold" {...props} />
          ),
          td: ({ node, ...props }) => (
            <td className="border border-gray-300 dark:border-gray-600 px-3 py-2" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
