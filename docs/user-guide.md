# Discovery Assistant — User Guide

This guide walks through every feature and workflow in Discovery Assistant, from account setup to exporting artifacts.

---

## Table of Contents

1. [Account Setup](#1-account-setup)
2. [Managing Clients](#2-managing-clients)
3. [Managing Projects](#3-managing-projects)
4. [Adding Data Sources](#4-adding-data-sources)
5. [Running Analysis](#5-running-analysis)
6. [Reading Analysis Results](#6-reading-analysis-results)
7. [Personas](#7-personas)
8. [Ideal Customer Profile (ICP)](#8-ideal-customer-profile-icp)
9. [Downloading Artifacts](#9-downloading-artifacts)

---

## 1. Account Setup

### Sign Up

Navigate to the app and click **Sign up**.

**Required fields:**

- Email address
- Password (minimum 8 characters, must include at least one number)
- Confirm password

The password field shows live validation feedback as you type. Once your account is created, you are automatically logged in and redirected to the dashboard.

### Sign In

Enter your email and password. Check **Remember me** to stay logged in across browser sessions.

---

## 2. Managing Clients

The dashboard is your client list. Each client represents a company or product you are working with.

### Create a Client

Click **New Client** from the dashboard.

| Field | Required | Notes |
| --- | --- | --- |
| Name | Yes | The client or company name |
| Description | No | Internal notes about the engagement |
| Market Type | No | Enterprise, SMB, SaaS, Consumer, Marketplace, or Other |

After saving, you are taken directly to the client's page.

### Edit a Client

Click the **edit** action on any client row. The same form opens pre-filled with existing values.

### Archived Clients

By default, archived clients are hidden. Check **Show archived** on the dashboard to include them in the list.

---

## 3. Managing Projects

Projects live inside a client and represent a specific research initiative. Each project has a single **objective** that determines which type of AI analysis runs.

### Create a Project

From a client page, click **New Project**.

| Field | Required | Notes |
| --- | --- | --- |
| Name | Yes | Descriptive name for the research initiative |
| Objective | Yes | Determines the analysis type (see below) |
| Assumed Problem | Conditional | Required when objective is **Problem Validation** |
| Target Segments | No | Comma-separated list of audience segments to focus on |

### Objectives

| Objective | What It Analyzes |
| --- | --- |
| **Problem Validation** | Tests whether your assumed problem is real, frequent, and consistent across respondents |
| **Positioning** | Surfaces value drivers and positioning angles from research data |
| **Persona Build-out** | Extracts structured buyer personas from qualitative research |
| **ICP Refinement** | Refines your Ideal Customer Profile across company, industry, and buying dimensions |

> Choose your objective carefully — it controls the AI system prompt and the structure of analysis output. You can create multiple projects under the same client to run different analyses on the same or different data.

### Project Overview (Quick View)

Once a project has been analyzed, the project page shows a **quick view** summary:

- **Strength indicator** — a visual signal of how well-supported the findings are
- **Assumed problem** — displayed with a tooltip for the full text
- **Supporting quotes** — up to two direct quotes from the research that support the finding (green left border)
- **Contradicting quote** — a quote that challenges the finding (amber left border)
- **Confidence score** — colored percentage
- A link to the full analysis

### Archived Projects

Check **Show archived** on the client page to include archived projects. Total spend across all projects is displayed above the project table.

---

## 4. Adding Data Sources

Data sources are the raw research materials Claude analyzes. You can upload files or paste text directly.

Navigate to a project and scroll to the **Data Sources** section.

### Upload Files

Select the **Upload** tab. Drag and drop files into the upload zone, or click to browse.

**Supported formats:** PDF, CSV, TXT, MD
**Max file size:** 10 MB per file
**Multiple files:** You can select multiple files at once

**Optional metadata:**

| Field | Description |
| --- | --- |
| Collected Date | When this research was collected |
| Creator Name | Who conducted or created the research |
| Purpose | What this data was intended to capture |

Click **Upload** to submit. A success notification confirms how many files were uploaded.

### Paste Text

Select the **Paste** tab. Paste any text content directly — interview transcripts, survey responses, notes, etc.

**Optional metadata:**

| Field | Description |
| --- | --- |
| Name | A label for this text source |
| Collected Date | When the research was conducted |
| Creator Name | Who produced the content |
| Purpose | What this data was intended to capture |

Click **Save Text** to submit.

### Managing Data Sources

Each data source in the list shows:

- File or source name
- Source type badge (**Uploaded** or **Pasted**)
- Creator name and collected date (if provided)
- **Preview** button — opens the content in a modal
- **Delete** button — prompts for confirmation before permanent deletion

> **Note:** Deleting a data source does not delete analyses that have already been run against it. However, future analyses will not include deleted sources.

---

## 5. Running Analysis

Analysis requires at least one data source. The **Analyze** button on the project page is disabled until a data source exists.

### Starting Analysis

Click **Analyze** on the project page. You will be taken to the Analysis page, where the analysis starts automatically.

Alternatively, navigate to the Analysis page directly and click **Start analysis**.

### Analysis Progress

While Claude is processing, you see:

- A status label showing the current stage (e.g., "Analyzing… extracting insights")
- A progress bar updating in real time via streaming

Analysis typically completes in 30–90 seconds depending on the volume of data.

### Cooldown Period

A **60-second cooldown** is enforced between analyses on the same project to prevent redundant runs. If you try to start another analysis too soon, you will see an error.

### Switching Between Analyses

Previous analyses are listed at the bottom of the Analysis page with their date and confidence score. Click any entry to load and view that analysis.

---

## 6. Reading Analysis Results

### Confidence Score

The confidence score reflects how well the research data supports the primary finding. It is calculated from three dimensions:

| Dimension | Weight | What It Measures |
| --- | --- | --- |
| Frequency | 40% | How often the theme appears across sources |
| Consistency | 35% | How consistently it appears across different respondents |
| Strength | 25% | How strongly respondents expressed it |

**Score interpretation:**

| Score | Label |
| --- | --- |
| < 50% | Needs more data |
| 50–74% | Emerging |
| ≥ 75% | Problem validated |

### Insights

Insights are organized into three categories:

| Type | Description |
| --- | --- |
| **Finding** | Evidence that supports or clarifies the primary assumption |
| **Contradiction** | Evidence that conflicts with or complicates the primary assumption |
| **Data Gap** | Areas where the research data is thin or missing |

Each insight includes a citation showing which source and line the finding came from.

### Positioning Results

For **Positioning** projects, results also include:

- **Value drivers** — the core reasons customers buy or switch
- **Positioning angles** — alternative ways to frame your product's value based on what the research reveals

### Recommendations

After results, the recommendations section provides:

- **Suggested next actions** — specific follow-up steps based on findings
- **Suggested next objective** — what type of analysis to run next (e.g., move from Problem Validation to Persona Build-out once confidence is high enough)

### Analysis Cost

Token usage and estimated USD cost are displayed with each result. Costs are tracked per analysis and summed at the project level.

---

## 7. Personas

Persona Build-out projects generate a structured buyer persona from your research. The persona is displayed on the project page and updates each time you run analysis.

### Persona Fields

| Field | Description |
| --- | --- |
| Name / Title | The persona's representative role or title |
| Goals | What they are trying to accomplish |
| Pain Points | What frustrates or blocks them |
| Decision Drivers | What factors influence their buying decisions |
| False Beliefs | Misconceptions they hold about the problem or solutions |
| Job to be Done | The core progress they are trying to make |
| Usage Patterns | How they interact with tools or solutions |
| Objections | What might stop them from buying |
| Success Metrics | How they measure a successful outcome |

Each field is rated **Low**, **Medium**, or **High** quality based on how much supporting evidence exists in the research.

### Staleness Indicator

The persona card shows a **staleness** indicator — a decay percentage based on how many months have passed since the last analysis. This is a signal to re-run analysis when research gets out of date.

### Completion Score

A completion percentage shows how many of the nine persona fields were populated by the analysis.

---

## 8. Ideal Customer Profile (ICP)

ICP Refinement projects generate a structured ICP from your research data. The ICP is displayed on the project page.

### ICP Dimensions

| Dimension | Description |
| --- | --- |
| Company Size | Target headcount range |
| Industries | Verticals where the ICP is concentrated |
| Geography | Geographic markets |
| Revenue | Target revenue range |
| Tech Stack | Technology environment or requirements |
| Use Case Fit | Specific use cases that resonate |
| Buying Process | How they evaluate and purchase |
| Budget | Typical budget range or authority level |
| Maturity | Organizational or product maturity stage |
| Custom | Any additional dimension surfaced from the research |

Each dimension includes a confidence rating (**Low**, **Medium**, **High**) indicating how well-supported that field is by the data.

---

## 9. Downloading Artifacts

### Interview Script and Survey Template

After any analysis, the Recommendations section includes download buttons for:

- **Interview script** — a structured interview guide based on findings and gaps
- **Survey template** — a survey instrument targeting the key areas the analysis flagged

Both download as `.md` (Markdown) files, named after the project.

### Persona Export

The Persona card includes a **Download .md** button that exports the full persona as a structured Markdown document including:

- Completion and confidence stats
- Staleness information
- Each field with its quality rating
- Generation timestamp

### ICP Export

The ICP card includes a **Download .md** button that exports the full ICP as a Markdown document including:

- Confidence stats
- Each dimension with its confidence rating
- Generation timestamp
