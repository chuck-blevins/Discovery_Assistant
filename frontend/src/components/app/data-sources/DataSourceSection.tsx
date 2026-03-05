import { useState } from 'react'

import { DataSourceList } from './DataSourceList'
import { FileUploadZone } from './FileUploadZone'
import { PasteDataSourceForm } from './PasteDataSourceForm'

type Tab = 'upload' | 'paste'

interface DataSourceSectionProps {
  projectId: string
  /** When provided, upload zone shows Analyze button linking to project analyze page. */
  clientId?: string
}

export default function DataSourceSection({ projectId, clientId }: DataSourceSectionProps) {
  const [tab, setTab] = useState<Tab>('upload')

  return (
    <div>
      <DataSourceList projectId={projectId} />

      <div className="mt-6">
        <div role="tablist" aria-label="Add data source" className="flex gap-4 border-b mb-4">
          <button
            id="ds-tab-upload"
            role="tab"
            aria-selected={tab === 'upload'}
            aria-controls="ds-tabpanel"
            onClick={() => setTab('upload')}
            className={`pb-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm ${
              tab === 'upload'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Upload Files
          </button>
          <button
            id="ds-tab-paste"
            role="tab"
            aria-selected={tab === 'paste'}
            aria-controls="ds-tabpanel"
            onClick={() => setTab('paste')}
            className={`pb-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm ${
              tab === 'paste'
                ? 'border-b-2 border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Paste Text
          </button>
        </div>

        <div
          id="ds-tabpanel"
          role="tabpanel"
          aria-labelledby={tab === 'upload' ? 'ds-tab-upload' : 'ds-tab-paste'}
        >
          {tab === 'upload' ? (
            <FileUploadZone projectId={projectId} clientId={clientId} />
          ) : (
            <PasteDataSourceForm projectId={projectId} />
          )}
        </div>
      </div>
    </div>
  )
}
