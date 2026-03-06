export default function HelpPage() {
    return (
      <div className="max-w-3xl mx-auto px-6 py-10 space-y-12">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">User Guide</h1>
          <p className="mt-2 text-zinc-500 dark:text-zinc-400">
            Everything you need to know to get the most out of Discovery Assistant.
          </p>
        </div>
  
        {/* TOC */}
        <nav aria-label="Table of contents" className="rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Contents</p>
          <ol className="space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
            {[
              ['#account-setup', '1. Account Setup'],
              ['#managing-clients', '2. Managing Clients'],
              ['#managing-projects', '3. Managing Projects'],
              ['#adding-data-sources', '4. Adding Data Sources'],
              ['#running-analysis', '5. Running Analysis'],
              ['#reading-results', '6. Reading Analysis Results'],
              ['#personas', '7. Personas'],
              ['#icp', '8. Ideal Customer Profile (ICP)'],
              ['#artifacts', '9. Downloading Artifacts'],
            ].map(([href, label]) => (
              <li key={href}>
                <a href={href} className="hover:text-zinc-900 dark:hover:text-zinc-50 hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>
  
        {/* 1. Account Setup */}
        <section id="account-setup" className="space-y-4 scroll-mt-6">
          <SectionHeading>1. Account Setup</SectionHeading>
  
          <SubHeading>Sign Up</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Navigate to the app and click <Strong>Sign up</Strong>.
          </p>
          <FieldTable rows={[
            ['Email address', 'Yes', ''],
            ['Password', 'Yes', 'Minimum 8 characters, must include at least one number'],
            ['Confirm password', 'Yes', 'Must match password'],
          ]} />
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            The password field shows live validation feedback as you type. Once your account is created you are automatically logged in and redirected to the dashboard.
          </p>
  
          <SubHeading>Sign In</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Enter your email and password. Check <Strong>Remember me</Strong> to stay logged in across browser sessions.
          </p>
        </section>
  
        <Divider />
  
        {/* 2. Clients */}
        <section id="managing-clients" className="space-y-4 scroll-mt-6">
          <SectionHeading>2. Managing Clients</SectionHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            The dashboard is your client list. Each client represents a company or product you are working with.
          </p>
  
          <SubHeading>Create a Client</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Click <Strong>New Client</Strong> from the sidebar or the dashboard.
          </p>
          <FieldTable rows={[
            ['Name', 'Yes', 'The client or company name'],
            ['Description', 'No', 'Internal notes about the engagement'],
            ['Market Type', 'No', 'Enterprise, SMB, SaaS, Consumer, Marketplace, or Other'],
          ]} />
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            After saving, you are taken directly to the client's page.
          </p>
  
          <SubHeading>Edit a Client</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Click the edit action on any client row. The same form opens pre-filled with existing values.
          </p>
  
          <SubHeading>Archived Clients</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            By default, archived clients are hidden. Check <Strong>Show archived</Strong> on the dashboard to include them in the list.
          </p>
        </section>
  
        <Divider />
  
        {/* 3. Projects */}
        <section id="managing-projects" className="space-y-4 scroll-mt-6">
          <SectionHeading>3. Managing Projects</SectionHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Projects live inside a client and represent a specific research initiative. Each project has a single <Strong>objective</Strong> that determines which type of AI analysis runs.
          </p>
  
          <SubHeading>Create a Project</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            From a client page, click <Strong>New Project</Strong>.
          </p>
          <FieldTable rows={[
            ['Name', 'Yes', 'Descriptive name for the research initiative'],
            ['Objective', 'Yes', 'Determines the analysis type (see below)'],
            ['Assumed Problem', 'Conditional', 'Required when objective is Problem Validation'],
            ['Target Segments', 'No', 'Comma-separated list of audience segments to focus on'],
          ]} />
  
          <SubHeading>Objectives</SubHeading>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800 text-left">
                  <th className="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300 w-1/3">Objective</th>
                  <th className="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">What It Analyzes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[
                  ['Problem Validation', 'Tests whether your assumed problem is real, frequent, and consistent across respondents'],
                  ['Positioning', 'Surfaces value drivers and positioning angles from research data'],
                  ['Persona Build-out', 'Extracts structured buyer personas from qualitative research'],
                  ['ICP Refinement', 'Refines your Ideal Customer Profile across company, industry, and buying dimensions'],
                ].map(([obj, desc]) => (
                  <tr key={obj} className="bg-white dark:bg-zinc-900">
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">{obj}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Callout>
            Choose your objective carefully — it controls the AI system prompt and the structure of analysis output. You can create multiple projects under the same client to run different analyses on the same or different data.
          </Callout>
  
          <SubHeading>Project Overview (Quick View)</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Once a project has been analyzed, the project page shows a quick-view summary:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
            <li><Strong>Strength indicator</Strong> — a visual signal of how well-supported the findings are</li>
            <li><Strong>Assumed problem</Strong> — displayed with a tooltip for the full text</li>
            <li><Strong>Supporting quotes</Strong> — up to two direct quotes from the research (green left border)</li>
            <li><Strong>Contradicting quote</Strong> — a quote that challenges the finding (amber left border)</li>
            <li><Strong>Confidence score</Strong> — colored percentage</li>
            <li>A link to the full analysis</li>
          </ul>
        </section>
  
        <Divider />
  
        {/* 4. Data Sources */}
        <section id="adding-data-sources" className="space-y-4 scroll-mt-6">
          <SectionHeading>4. Adding Data Sources</SectionHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Data sources are the raw research materials Claude analyzes. You can upload files or paste text directly. Navigate to a project and scroll to the <Strong>Data Sources</Strong> section.
          </p>
  
          <SubHeading>Upload Files</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Select the <Strong>Upload</Strong> tab. Drag and drop files into the upload zone, or click to browse.
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
            <li><Strong>Supported formats:</Strong> PDF, CSV, TXT, MD</li>
            <li><Strong>Max file size:</Strong> 10 MB per file</li>
            <li><Strong>Multiple files:</Strong> You can select multiple files at once</li>
          </ul>
          <FieldTable label="Optional metadata" rows={[
            ['Collected Date', '', 'When this research was collected'],
            ['Creator Name', '', 'Who conducted or created the research'],
            ['Purpose', '', 'What this data was intended to capture'],
          ]} />
  
          <SubHeading>Paste Text</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Select the <Strong>Paste</Strong> tab. Paste any text content directly — interview transcripts, survey responses, notes, etc.
          </p>
          <FieldTable label="Optional metadata" rows={[
            ['Name', '', 'A label for this text source'],
            ['Collected Date', '', 'When the research was conducted'],
            ['Creator Name', '', 'Who produced the content'],
            ['Purpose', '', 'What this data was intended to capture'],
          ]} />
  
          <SubHeading>Managing Data Sources</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Each data source in the list shows its name, type badge (<Strong>Uploaded</Strong> or <Strong>Pasted</Strong>), creator name, and collected date. You can <Strong>Preview</Strong> the content or <Strong>Delete</Strong> it (prompts for confirmation before permanent deletion).
          </p>
          <Callout>
            Deleting a data source does not delete analyses that have already been run against it. However, future analyses will not include deleted sources.
          </Callout>
        </section>
  
        <Divider />
  
        {/* 5. Running Analysis */}
        <section id="running-analysis" className="space-y-4 scroll-mt-6">
          <SectionHeading>5. Running Analysis</SectionHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Analysis requires at least one data source. The <Strong>Analyze</Strong> button on the project page is disabled until a data source exists.
          </p>
  
          <SubHeading>Starting Analysis</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Click <Strong>Analyze</Strong> on the project page. You will be taken to the Analysis page, where the analysis starts automatically. Alternatively, navigate to the Analysis page directly and click <Strong>Start analysis</Strong>.
          </p>
  
          <SubHeading>Analysis Progress</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            While Claude is processing, you see a status label showing the current stage and a progress bar updating in real time. Analysis typically completes in 30–90 seconds depending on the volume of data.
          </p>
  
          <SubHeading>Cooldown Period</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            A <Strong>60-second cooldown</Strong> is enforced between analyses on the same project to prevent redundant runs.
          </p>
  
          <SubHeading>Switching Between Analyses</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Previous analyses are listed at the bottom of the Analysis page with their date and confidence score. Click any entry to load and view that analysis.
          </p>
        </section>
  
        <Divider />
  
        {/* 6. Reading Results */}
        <section id="reading-results" className="space-y-4 scroll-mt-6">
          <SectionHeading>6. Reading Analysis Results</SectionHeading>
  
          <SubHeading>Confidence Score</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            The confidence score reflects how well the research data supports the primary finding. It is calculated from three dimensions:
          </p>
          <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 dark:bg-zinc-800 text-left">
                  <th className="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">Dimension</th>
                  <th className="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">Weight</th>
                  <th className="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">What It Measures</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {[
                  ['Frequency', '40%', 'How often the theme appears across sources'],
                  ['Consistency', '35%', 'How consistently it appears across different respondents'],
                  ['Strength', '25%', 'How strongly respondents expressed it'],
                ].map(([d, w, m]) => (
                  <tr key={d} className="bg-white dark:bg-zinc-900">
                    <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100">{d}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{w}</td>
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{m}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <FieldTable label="Score interpretation" rows={[
            ['< 50%', '', 'Needs more data'],
            ['50–74%', '', 'Emerging'],
            ['≥ 75%', '', 'Problem validated'],
          ]} />
  
          <SubHeading>Insights</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Insights are organized into three categories:
          </p>
          <FieldTable rows={[
            ['Finding', '', 'Evidence that supports or clarifies the primary assumption'],
            ['Contradiction', '', 'Evidence that conflicts with or complicates the primary assumption'],
            ['Data Gap', '', 'Areas where the research data is thin or missing'],
          ]} />
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Each insight includes a citation showing which source and line the finding came from.
          </p>
  
          <SubHeading>Positioning Results</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            For <Strong>Positioning</Strong> projects, results also include value drivers (the core reasons customers buy or switch) and alternative positioning angles based on what the research reveals.
          </p>
  
          <SubHeading>Recommendations</SubHeading>
          <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
            <li><Strong>Suggested next actions</Strong> — specific follow-up steps based on findings</li>
            <li><Strong>Suggested next objective</Strong> — what type of analysis to run next</li>
          </ul>
  
          <SubHeading>Analysis Cost</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Token usage and estimated USD cost are displayed with each result. Costs are tracked per analysis and summed at the project level.
          </p>
        </section>
  
        <Divider />
  
        {/* 7. Personas */}
        <section id="personas" className="space-y-4 scroll-mt-6">
          <SectionHeading>7. Personas</SectionHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Persona Build-out projects generate a structured buyer persona from your research. The persona is displayed on the project page (after the first analysis) and updates each time you run analysis.
          </p>
  
          <SubHeading>Persona Fields</SubHeading>
          <FieldTable rows={[
            ['Name / Title', '', "The persona's representative role or title"],
            ['Goals', '', 'What they are trying to accomplish'],
            ['Pain Points', '', 'What frustrates or blocks them'],
            ['Decision Drivers', '', 'What factors influence their buying decisions'],
            ['False Beliefs', '', 'Misconceptions they hold about the problem or solutions'],
            ['Job to be Done', '', 'The core progress they are trying to make'],
            ['Usage Patterns', '', 'How they interact with tools or solutions'],
            ['Objections', '', 'What might stop them from buying'],
            ['Success Metrics', '', 'How they measure a successful outcome'],
          ]} />
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Each field is rated <Strong>Low</Strong>, <Strong>Medium</Strong>, or <Strong>High</Strong> quality based on how much supporting evidence exists in the research.
          </p>
  
          <SubHeading>Staleness Indicator</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            The persona card shows a staleness indicator — a decay percentage based on how many months have passed since the last analysis. This is a signal to re-run analysis when research gets out of date.
          </p>
  
          <SubHeading>Completion Score</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            A completion percentage shows how many of the nine persona fields were populated by the analysis.
          </p>
        </section>
  
        <Divider />
  
        {/* 8. ICP */}
        <section id="icp" className="space-y-4 scroll-mt-6">
          <SectionHeading>8. Ideal Customer Profile (ICP)</SectionHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            ICP Refinement projects generate a structured ICP from your research data. The ICP is displayed on the project page.
          </p>
  
          <SubHeading>ICP Dimensions</SubHeading>
          <FieldTable rows={[
            ['Company Size', '', 'Target headcount range'],
            ['Industries', '', 'Verticals where the ICP is concentrated'],
            ['Geography', '', 'Geographic markets'],
            ['Revenue', '', 'Target revenue range'],
            ['Tech Stack', '', 'Technology environment or requirements'],
            ['Use Case Fit', '', 'Specific use cases that resonate'],
            ['Buying Process', '', 'How they evaluate and purchase'],
            ['Budget', '', 'Typical budget range or authority level'],
            ['Maturity', '', 'Organizational or product maturity stage'],
            ['Custom', '', 'Any additional dimension surfaced from the research'],
          ]} />
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Each dimension includes a confidence rating (<Strong>Low</Strong>, <Strong>Medium</Strong>, <Strong>High</Strong>) indicating how well-supported that field is by the data.
          </p>
        </section>
  
        <Divider />
  
        {/* 9. Artifacts */}
        <section id="artifacts" className="space-y-4 scroll-mt-6">
          <SectionHeading>9. Downloading Artifacts</SectionHeading>
  
          <SubHeading>Interview Script and Survey Template</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            After any analysis, the Recommendations section includes download buttons for:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-sm text-zinc-600 dark:text-zinc-300">
            <li><Strong>Interview script</Strong> — a structured interview guide based on findings and data gaps</li>
            <li><Strong>Survey template</Strong> — a survey instrument targeting the key areas the analysis flagged</li>
          </ul>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            Both download as <code className="text-xs bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">.md</code> (Markdown) files, named after the project.
          </p>
  
          <SubHeading>Persona Export</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            The Persona card includes a <Strong>Download .md</Strong> button that exports the full persona as a structured Markdown document including completion and confidence stats, staleness information, each field with its quality rating, and a generation timestamp.
          </p>
  
          <SubHeading>ICP Export</SubHeading>
          <p className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed">
            The ICP card includes a <Strong>Download .md</Strong> button that exports the full ICP as a Markdown document including confidence stats, each dimension with its confidence rating, and a generation timestamp.
          </p>
        </section>
      </div>
    )
  }
  
  /* ── Small shared primitives ───────────────────────────────────────── */
  
  function SectionHeading({ children }: { children: React.ReactNode }) {
    return (
      <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50 border-b border-zinc-200 dark:border-zinc-700 pb-2">
        {children}
      </h2>
    )
  }
  
  function SubHeading({ children }: { children: React.ReactNode }) {
    return (
      <h3 className="text-base font-semibold text-zinc-800 dark:text-zinc-200 mt-2">
        {children}
      </h3>
    )
  }
  
  function Strong({ children }: { children: React.ReactNode }) {
    return <span className="font-semibold text-zinc-900 dark:text-zinc-100">{children}</span>
  }
  
  function Divider() {
    return <hr className="border-zinc-200 dark:border-zinc-700" />
  }
  
  function Callout({ children }: { children: React.ReactNode }) {
    return (
      <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 px-4 py-3 text-sm text-blue-800 dark:text-blue-300">
        {children}
      </div>
    )
  }
  
  function FieldTable({
    rows,
    label,
  }: {
    rows: [string, string, string][]
    label?: string
  }) {
    const hasRequired = rows.some(([, req]) => req !== '')
    return (
      <div>
        {label && <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">{label}</p>}
        <div className="overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-800 text-left">
                <th className="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">Field</th>
                {hasRequired && <th className="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">Required</th>}
                <th className="px-4 py-2 font-medium text-zinc-700 dark:text-zinc-300">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {rows.map(([field, req, notes]) => (
                <tr key={field} className="bg-white dark:bg-zinc-900">
                  <td className="px-4 py-2 font-medium text-zinc-900 dark:text-zinc-100 whitespace-nowrap">{field}</td>
                  {hasRequired && (
                    <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400 whitespace-nowrap">{req}</td>
                  )}
                  <td className="px-4 py-2 text-zinc-600 dark:text-zinc-400">{notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }