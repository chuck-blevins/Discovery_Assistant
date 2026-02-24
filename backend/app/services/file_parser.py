"""File parsing service — converts uploaded file bytes to plain text."""

import csv
import io

import pdfplumber

SUPPORTED_EXTENSIONS = {".pdf", ".csv", ".txt", ".md"}


def parse_file(filename: str, file_bytes: bytes) -> str:
    """Dispatch to the appropriate parser based on file extension.

    Raises:
        ValueError: If the file extension is not supported.
    """
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()
    else:
        ext = ""

    if ext == ".pdf":
        return parse_pdf(file_bytes)
    elif ext == ".csv":
        return parse_csv(file_bytes)
    elif ext in (".txt", ".md"):
        try:
            return file_bytes.decode("utf-8")
        except UnicodeDecodeError:
            raise ValueError(f"File '{filename}' could not be decoded as UTF-8")
    else:
        raise ValueError(f"Unsupported file type: {ext or '(no extension)'}")


def parse_pdf(file_bytes: bytes) -> str:
    """Extract text from all pages of a PDF and join with newlines."""
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        pages = [page.extract_text() or "" for page in pdf.pages]
    return "\n".join(pages).strip()


def parse_csv(file_bytes: bytes) -> str:
    """Read CSV rows and join cells with tabs, rows with newlines."""
    try:
        text = file_bytes.decode("utf-8")
    except UnicodeDecodeError:
        raise ValueError("CSV file could not be decoded as UTF-8")
    reader = csv.reader(io.StringIO(text))
    rows = ["\t".join(row) for row in reader]
    return "\n".join(rows)
