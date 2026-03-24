import { useState } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useStore } from '../lib/useStore';
import { Download } from 'lucide-react';

export function DocumentView() {
  const store = useStore();
  const allFiles = store.files.filter(f => f.path.endsWith('.md'));

  // Split: system doc vs process docs
  const systemDoc = allFiles.find(f => f.path === 'docs/system.md');
  const processDocs = allFiles.filter(f => f.path.startsWith('docs/processes/'));

  const [selected, setSelected] = useState<string | null>(null);

  // Default to system doc, then first process doc
  const activeFile = selected
    ?? systemDoc?.path
    ?? processDocs[0]?.path
    ?? null;

  const content = allFiles.find(f => f.path === activeFile)?.content ?? '';

  if (allFiles.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-base text-muted-foreground mb-2">No documents found</p>
          <p className="text-sm text-muted-foreground/60">
            Enriched Markdown files will appear here when generated via the MCP /enrich skill
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Top bar */}
      <div className="border-b border-border px-5 py-3 shrink-0 flex items-center gap-4">
        <span className="text-sm font-semibold text-foreground">Documents</span>
        <div className="w-px h-5 bg-border" />

        {/* System doc pill */}
        {systemDoc && (
          <button
            onClick={() => setSelected(systemDoc.path)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${
              activeFile === systemDoc.path
                ? 'bg-foreground text-background'
                : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            System Overview
          </button>
        )}

        {/* Process docs */}
        {processDocs.length > 0 && (
          <>
            {systemDoc && <div className="w-px h-5 bg-border" />}
            <span className="text-xs text-muted-foreground">Processes:</span>
            {processDocs.map(f => {
              const name = f.path.replace('docs/processes/', '').replace('.md', '');
              return (
                <button
                  key={f.path}
                  onClick={() => setSelected(f.path)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                    activeFile === f.path
                      ? 'bg-foreground text-background'
                      : 'bg-muted text-muted-foreground hover:text-foreground hover:bg-accent'
                  }`}
                >
                  {name}
                </button>
              );
            })}
          </>
        )}

        <div className="flex-1" />

        {/* Download */}
        {activeFile && (
          <button
            onClick={() => downloadMarkdown(activeFile, content)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <article className="max-w-4xl mx-auto px-8 py-8 prose-herbrand">
          <Markdown remarkPlugins={[remarkGfm]}>{content}</Markdown>
        </article>
      </div>
    </div>
  );
}

function downloadMarkdown(filepath: string, content: string) {
  const name = filepath.replace(/^docs\//, '').replace(/\.md$/, '').replace(/\//g, '-');
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name}.md`;
  a.click();
  URL.revokeObjectURL(url);
}
