"""
Unit tests for file_parser service.

Tests each supported file type and the unsupported-type error path.
pdfplumber is mocked to avoid real PDF dependencies in tests.
"""

import io
from unittest.mock import MagicMock, patch

import pytest


class TestParseFile:
    def test_parse_txt(self):
        from app.services.file_parser import parse_file
        content = "Hello, world!\nLine two."
        result = parse_file("notes.txt", content.encode("utf-8"))
        assert result == content

    def test_parse_md(self):
        from app.services.file_parser import parse_file
        content = "# Header\n\nSome **markdown** content."
        result = parse_file("readme.md", content.encode("utf-8"))
        assert result == content

    def test_parse_txt_uppercase_extension(self):
        from app.services.file_parser import parse_file
        content = "Uppercase ext test"
        result = parse_file("notes.TXT", content.encode("utf-8"))
        assert result == content

    def test_parse_csv_single_row(self):
        from app.services.file_parser import parse_file
        csv_bytes = b"name,age,city\nAlice,30,NYC\n"
        result = parse_file("data.csv", csv_bytes)
        lines = result.split("\n")
        assert "name\tage\tcity" in lines
        assert "Alice\t30\tNYC" in lines

    def test_parse_csv_empty(self):
        from app.services.file_parser import parse_file
        result = parse_file("empty.csv", b"")
        assert result == ""

    def test_parse_pdf_calls_pdfplumber(self):
        from app.services.file_parser import parse_file

        mock_page1 = MagicMock()
        mock_page1.extract_text.return_value = "Page one text"
        mock_page2 = MagicMock()
        mock_page2.extract_text.return_value = "Page two text"
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page1, mock_page2]
        mock_pdf.__enter__ = lambda self: self
        mock_pdf.__exit__ = MagicMock(return_value=False)

        with patch("app.services.file_parser.pdfplumber.open", return_value=mock_pdf):
            result = parse_file("report.pdf", b"fake-pdf-bytes")

        assert "Page one text" in result
        assert "Page two text" in result

    def test_parse_pdf_none_page_handled(self):
        from app.services.file_parser import parse_file

        mock_page = MagicMock()
        mock_page.extract_text.return_value = None  # empty page
        mock_pdf = MagicMock()
        mock_pdf.pages = [mock_page]
        mock_pdf.__enter__ = lambda self: self
        mock_pdf.__exit__ = MagicMock(return_value=False)

        with patch("app.services.file_parser.pdfplumber.open", return_value=mock_pdf):
            result = parse_file("empty.pdf", b"fake-pdf-bytes")

        assert result == ""

    def test_unsupported_extension_raises(self):
        from app.services.file_parser import parse_file
        with pytest.raises(ValueError, match="Unsupported file type"):
            parse_file("spreadsheet.xlsx", b"some bytes")

    def test_no_extension_raises(self):
        from app.services.file_parser import parse_file
        with pytest.raises(ValueError, match="Unsupported file type"):
            parse_file("noextension", b"some bytes")

    def test_parse_txt_non_utf8_raises_value_error(self):
        from app.services.file_parser import parse_file
        with pytest.raises(ValueError, match="could not be decoded"):
            parse_file("notes.txt", b"\xff\xfe non-utf8 bytes")

    def test_parse_csv_non_utf8_raises_value_error(self):
        from app.services.file_parser import parse_file
        with pytest.raises(ValueError, match="could not be decoded"):
            parse_file("data.csv", b"\xff\xfe non-utf8 bytes")

    def test_pdfplumber_opens_with_bytesio(self):
        """Verify pdfplumber.open receives a BytesIO object, not a path string."""
        from app.services.file_parser import parse_file

        captured_args = []

        def mock_open(arg):
            captured_args.append(arg)
            mock_pdf = MagicMock()
            mock_pdf.pages = []
            mock_pdf.__enter__ = lambda self: self
            mock_pdf.__exit__ = MagicMock(return_value=False)
            return mock_pdf

        with patch("app.services.file_parser.pdfplumber.open", side_effect=mock_open):
            parse_file("doc.pdf", b"bytes")

        assert len(captured_args) == 1
        assert isinstance(captured_args[0], io.BytesIO)
