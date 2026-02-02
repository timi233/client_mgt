from rest_framework.authentication import (
    SessionAuthentication,
    TokenAuthentication,
    BaseAuthentication,
)


class MultiAuthentication(BaseAuthentication):
    """
    Try multiple authentication methods in order:
    1. SessionAuthentication
    2. TokenAuthentication
    3. JWTAuthentication (if rest_framework_simplejwt is available)
    """

    def __init__(self):
        self.authenticators = [SessionAuthentication(), TokenAuthentication()]

        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication

            self.authenticators.append(JWTAuthentication())
        except ImportError:
            pass

    def authenticate(self, request):
        for authenticator in self.authenticators:
            try:
                user_auth_tuple = authenticator.authenticate(request)
                if user_auth_tuple is not None:
                    return user_auth_tuple
            except Exception:
                continue

        return None
