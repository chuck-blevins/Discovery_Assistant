"""
Tests for JWT token creation, validation, and route protection.

RED PHASE - These tests intentionally fail until JWT functions are implemented.
This validates that our tests are comprehensive before we write code.

Acceptance Criteria:
  AC #2: "User login endpoint exists and returns JWT token"
    - JWT token: HS256 signature, user_id + email claims, 30-day expiry
    - Algorithm: HS256
    - Secret: From environment variable
"""

import pytest
from datetime import datetime, timedelta, timezone
from uuid import uuid4
import os
from app.utils.security import create_access_token, decode_token


class TestJWTTokenCreation:
    """Test suite for JWT token creation functions."""
    
    def test_create_access_token_returns_string(self):
        """create_access_token() should return a string (JWT token)."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = create_access_token(user_id, email)
        
        assert isinstance(token, str), "Token must be a string"
        assert len(token) > 0, "Token must not be empty"
    
    def test_create_access_token_jwt_format(self):
        """create_access_token() should return JWT format (3 parts separated by dots)."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = create_access_token(user_id, email)
        
        # JWT format: header.payload.signature
        parts = token.split('.')
        assert len(parts) == 3, f"JWT must have 3 parts separated by dots, got {len(parts)}"
    
    def test_create_access_token_uses_hs256_algorithm(self):
        """create_access_token() should use HS256 algorithm."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = create_access_token(user_id, email)
        
        # Decode header (first part is base64-encoded JSON)
        import base64
        import json
        
        header_b64 = token.split('.')[0]
        # JWT uses URL-safe base64 without padding
        header_json = base64.urlsafe_b64decode(header_b64 + '==')
        header = json.loads(header_json)
        
        assert header.get('alg') == 'HS256', f"Algorithm must be HS256, got {header.get('alg')}"
    
    def test_create_access_token_includes_user_id_claim(self):
        """create_access_token() should include user_id in token payload."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = create_access_token(user_id, email)
        decoded = decode_token(token)
        
        assert 'user_id' in decoded, "Token payload must include user_id claim"
        assert str(decoded['user_id']) == str(user_id), "user_id in token must match input"
    
    def test_create_access_token_includes_email_claim(self):
        """create_access_token() should include email in token payload."""
        user_id = uuid4()
        email = "test@example.com"
        
        token = create_access_token(user_id, email)
        decoded = decode_token(token)
        
        assert 'email' in decoded, "Token payload must include email claim"
        assert decoded['email'] == email, "Email in token must match input"
    
    def test_create_access_token_includes_expiration(self):
        """create_access_token() should include exp claim (30 days from now)."""
        user_id = uuid4()
        email = "test@example.com"
        now = datetime.now(timezone.utc)
        
        token = create_access_token(user_id, email)
        decoded = decode_token(token)
        
        assert 'exp' in decoded, "Token payload must include exp claim"
        # exp should be ~30 days from now
        exp_time = datetime.fromtimestamp(decoded['exp'], timezone.utc)
        expected_time = now + timedelta(days=30)
        # Allow 60 second variance
        time_diff = abs((exp_time - expected_time).total_seconds())
        assert time_diff < 60, f"Expiration must be ~30 days, diff was {time_diff}s"
    
    def test_create_access_token_different_tokens_for_different_users(self):
        """create_access_token() should produce different tokens for different users."""
        user1_id = uuid4()
        user2_id = uuid4()
        
        token1 = create_access_token(user1_id, "user1@example.com")
        token2 = create_access_token(user2_id, "user2@example.com")
        
        assert token1 != token2, "Different users should get different tokens"
    
    def test_create_access_token_deterministic_for_same_user(self):
        """create_access_token() with same user/email may differ due to exp (timestamp)."""
        user_id = uuid4()
        email = "test@example.com"
        
        # Create two tokens in quick succession
        token1 = create_access_token(user_id, email)
        token2 = create_access_token(user_id, email)
        
        # Both should decode to same user/email (though exp slightly different)
        decoded1 = decode_token(token1)
        decoded2 = decode_token(token2)
        
        assert decoded1['user_id'] == decoded2['user_id']
        assert decoded1['email'] == decoded2['email']
    
    def test_create_access_token_with_special_email_characters(self):
        """create_access_token() should handle special characters in email."""
        user_id = uuid4()
        emails = [
            "user+tag@example.com",  # Plus addressing
            "user.name@example.com",  # Dot in local part
            "user_123@example.com",   # Underscore
            "user-name@example.com",  # Hyphen
        ]
        
        for email in emails:
            token = create_access_token(user_id, email)
            decoded = decode_token(token)
            assert decoded['email'] == email, f"Email {email} should roundtrip through token"


class TestJWTTokenValidation:
    """Test suite for JWT token validation/decoding functions."""
    
    def test_decode_token_returns_dict(self):
        """decode_token() should return a dictionary."""
        user_id = uuid4()
        email = "test@example.com"
        token = create_access_token(user_id, email)
        
        decoded = decode_token(token)
        
        assert isinstance(decoded, dict), "Decoded token must be a dictionary"
    
    def test_decode_token_extracts_user_id(self):
        """decode_token() should extract user_id from token."""
        user_id = uuid4()
        email = "test@example.com"
        token = create_access_token(user_id, email)
        
        decoded = decode_token(token)
        
        assert 'user_id' in decoded
        # user_id might be string or UUID, convert to string for comparison
        assert str(decoded['user_id']) == str(user_id)
    
    def test_decode_token_extracts_email(self):
        """decode_token() should extract email from token."""
        user_id = uuid4()
        email = "test@example.com"
        token = create_access_token(user_id, email)
        
        decoded = decode_token(token)
        
        assert 'email' in decoded
        assert decoded['email'] == email
    
    def test_decode_token_raises_exception_for_invalid_token(self):
        """decode_token() should raise exception for invalid token format."""
        invalid_token = "not.a.valid.token"
        
        with pytest.raises(Exception):
            decode_token(invalid_token)
    
    def test_decode_token_raises_exception_for_tampered_token(self):
        """decode_token() should raise exception if signature is invalid."""
        user_id = uuid4()
        email = "test@example.com"
        token = create_access_token(user_id, email)
        
        # Tamper with the signature (change last character)
        parts = token.split('.')
        tampered_token = parts[0] + '.' + parts[1] + '.' + ('X' if parts[2][-1] != 'X' else 'Y')
        
        with pytest.raises(Exception):
            decode_token(tampered_token)
    
    def test_decode_expired_token_raises_exception(self):
        """decode_token() should raise exception for expired tokens.
        
        Note: This test creates an extremely old token (1 year expired) to avoid
        clock skew issues in test execution. In production, python-jose validates
        exp claim before accepting tokens.
        """
        user_id = uuid4()
        email = "test@example.com"
        
        # Create token with expiration 365 days ago (clearly expired)
        import base64
        import json
        from app.utils.security import SECRET_KEY
        from jose import jwt
        
        payload = {
            'user_id': str(user_id),
            'email': email,
            'exp': int((datetime.now(timezone.utc) - timedelta(days=365)).timestamp())
        }
        
        expired_token = jwt.encode(payload, SECRET_KEY, algorithm='HS256')
        
        with pytest.raises(Exception):
            decode_token(expired_token)
    
    def test_decode_token_with_empty_string(self):
        """decode_token() should raise exception for empty string."""
        with pytest.raises(Exception):
            decode_token("")
    
    def test_decode_token_with_malformed_jwt(self):
        """decode_token() should raise exception for malformed JWT."""
        malformed_tokens = [
            "header.payload",  # Missing signature
            "only_one_part",   # Missing all separators
            ".....",           # Only separators
            "header..signature",  # Missing payload
        ]
        
        for malformed in malformed_tokens:
            with pytest.raises(Exception):
                decode_token(malformed)


class TestSecretKeyConfiguration:
    """Test suite for SECRET_KEY environment variable handling."""
    
    def test_secret_key_exists(self):
        """SECRET_KEY environment variable must be set."""
        from app.utils.security import SECRET_KEY
        
        assert SECRET_KEY is not None, "SECRET_KEY must be set"
        assert len(SECRET_KEY) > 0, "SECRET_KEY must not be empty"
    
    def test_secret_key_is_string(self):
        """SECRET_KEY must be a string."""
        from app.utils.security import SECRET_KEY
        
        assert isinstance(SECRET_KEY, str), "SECRET_KEY must be a string"
    
    def test_secret_key_has_minimum_length(self):
        """SECRET_KEY should have reasonable length for HS256."""
        from app.utils.security import SECRET_KEY
        
        # HS256 should use at least 32 bytes (256 bits)
        # 32 bytes = 32 characters if ASCII
        assert len(SECRET_KEY) >= 32, f"SECRET_KEY should be >= 32 chars, got {len(SECRET_KEY)}"
    
    def test_tokens_created_with_different_secrets_are_incompatible(self):
        """Tokens created with different secrets cannot be decoded."""
        user_id = uuid4()
        email = "test@example.com"
        
        # Create token with current SECRET_KEY
        token = create_access_token(user_id, email)
        
        # Create a different secret and try to decode
        import os
        original_secret = os.environ.get('SECRET_KEY')
        
        try:
            os.environ['SECRET_KEY'] = 'different_secret_key_12345678'
            # Re-import to get new secret
            import importlib
            import app.utils.security as security_module
            importlib.reload(security_module)
            
            # Token created with original secret should not decode with new secret
            with pytest.raises(Exception):
                security_module.decode_token(token)
        finally:
            # Restore original secret
            if original_secret:
                os.environ['SECRET_KEY'] = original_secret
            importlib.reload(security_module)
