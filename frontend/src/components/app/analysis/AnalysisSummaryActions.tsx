import { useState } from 'react'
import { Copy, Download, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface AnalysisSummaryActionsProps {
  markdown: string
  projectName: string
}

function downloadBlob(content: string, mimeType: string, fileName: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.click()
  URL.revokeObjectURL(url)
}

function buildPrintHtml(markdown: string, projectName: string): string {
  // Convert the markdown to simple HTML for printing
  const lines = markdown.split('\n')
  const htmlLines: string[] = []

  for (const line of lines) {
    if (line.startsWith('# ')) {
      htmlLines.push(`<h1>${escapeHtml(line.slice(2))}</h1>`)
    } else if (line.startsWith('## ')) {
      htmlLines.push(`<h2>${escapeHtml(line.slice(3))}</h2>`)
    } else if (line.startsWith('### ')) {
      htmlLines.push(`<h3>${escapeHtml(line.slice(4))}</h3>`)
    } else if (line.startsWith('- ')) {
      htmlLines.push(`<li>${renderInline(line.slice(2))}</li>`)
    } else if (line.trim() === '') {
      htmlLines.push('<br>')
    } else {
      htmlLines.push(`<p>${renderInline(line)}</p>`)
    }
  }

  const body = htmlLines.join('\n')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Analysis Summary — ${escapeHtml(projectName)}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 760px; margin: 40px auto; color: #111; font-size: 14px; line-height: 1.6; }
    h1 { font-size: 22px; margin-bottom: 4px; }
    h2 { font-size: 17px; margin-top: 24px; margin-bottom: 4px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
    h3 { font-size: 14px; margin-top: 16px; margin-bottom: 4px; }
    p, li { margin: 4px 0; }
    ul { padding-left: 20px; }
    em { font-style: italic; color: #555; }
    strong { font-weight: 700; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
${body}
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderInline(text: string): string {
  // Bold: **text**
  let result = escapeHtml(text)
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  // Italic/emphasis: _text_
  result = result.replace(/_(.+?)_/g, '<em>$1</em>')
  return result
}

export function AnalysisSummaryActions({ markdown, projectName }: AnalysisSummaryActionsProps) {
  const [copied, setCopied] = useState(false)
  const safeName = projectName.replace(/\s+/g, '-').toLowerCase()

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadMd = () => {
    downloadBlob(markdown, 'text/markdown', `analysis-summary-${safeName}.md`)
  }

  const handleDownloadPdf = () => {
    const html = buildPrintHtml(markdown, projectName)
    const newWin = window.open('', '_blank')
    if (!newWin) return
    newWin.document.write(html)
    newWin.document.close()
    newWin.print()
  }

  return (
    <div className="flex flex-wrap gap-2" aria-label="Export analysis summary">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="size-4 mr-1.5" aria-hidden="true" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Copy Summary</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={handleDownloadMd}>
            <Download className="size-4 mr-1.5" aria-hidden="true" />
            Download MD
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Download MD</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
            <FileText className="size-4 mr-1.5" aria-hidden="true" />
            Download PDF
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Download PDF</TooltipContent>
      </Tooltip>
    </div>
  )
}
