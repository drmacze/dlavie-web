from pathlib import Path

source = Path("index.html")
if not source.exists():
    raise SystemExit("index.html not found")

text = source.read_text(encoding="utf-8")

script_marker = "<script>\n\n// ═══════════════════════════════════════════════════════════════\n// SUPABASE CONFIG"
if '<script src="portal-sso.js"></script>' not in text:
    if script_marker not in text:
        raise SystemExit("main script marker not found")
    text = text.replace(
        script_marker,
        '<script src="portal-sso.js"></script>\n<script>\n\n// ═══════════════════════════════════════════════════════════════\n// SUPABASE CONFIG',
        1,
    )

connect_start = "// v7.9.62 FIX: connectToDLavie()"
connect_end = "\nfunction showPortalInfo(){"
if connect_start not in text or connect_end not in text:
    raise SystemExit("connectToDLavie markers not found")
start = text.index(connect_start)
end = text.index(connect_end, start)
secure_connect = '''// v326: Portal-to-launcher SSO is implemented by portal-sso.js.
// No access token or refresh token is ever placed in a URI.
async function connectToDLavie(){
return window.DLaviePortalSso.connect();
}
'''
text = text[:start] + secure_connect + text[end:]

oauth_start = "// GOOGLE OAUTH LOGIN"
oauth_end = "// v7.9.77: Auto-create profile untuk OAuth user"
if oauth_start not in text or oauth_end not in text:
    raise SystemExit("Google OAuth markers not found")
start = text.rfind("// ═══════════════════════════════════════════════════════════════", 0, text.index(oauth_start))
end = text.index(oauth_end, text.index(oauth_start))
secure_oauth = '''// ═══════════════════════════════════════════════════════════════
// GOOGLE OAUTH LOGIN — v326 Authorization Code + PKCE
// ═══════════════════════════════════════════════════════════════
function loginWithGoogle(){
return window.DLaviePortalSso.loginWithGoogle();
}

async function handleOAuthCallback(){
return window.DLaviePortalSso.handleOAuthCallback();
}

'''
text = text[:start] + secure_oauth + text[end:]

text = text.replace(
    "Login dilakukan langsung di launcher. Website tidak pernah mengirim token akun ke aplikasi.",
    "Akun Portal aktif diotorisasi satu kali lalu digunakan otomatis oleh launcher. Token tidak pernah dikirim lewat URL.",
)
text = text.replace(
    "Login di Launcher</strong><br>Buka launcher, login dengan akun DLavie.",
    "Secure Connect</strong><br>Launcher memverifikasi akun Portal aktif melalui kode sekali pakai.",
)
text = text.replace(
    "Login dengan aman</strong><br>Gunakan email/password atau Google langsung di launcher.",
    "Auto-connect</strong><br>Launcher membuka akun Portal yang sama setelah verifikasi selesai.",
)
text = text.replace("Latest version <strong data-launcher-version>v8.1.0</strong>", "Latest version <strong data-launcher-version>v8.2.0</strong>")
text = text.replace("build <span data-launcher-code>325</span>", "build <span data-launcher-code>326</span>")
text = text.replace("let LAUNCHER_VERSION = 'v8.1.0';", "let LAUNCHER_VERSION = 'v8.2.0';")
text = text.replace("let LAUNCHER_VERSION_CODE = 325;", "let LAUNCHER_VERSION_CODE = 326;")

required = [
    '<script src="portal-sso.js"></script>',
    'return window.DLaviePortalSso.connect();',
    'return window.DLaviePortalSso.loginWithGoogle();',
    'return window.DLaviePortalSso.handleOAuthCallback();',
]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit("Portal SSO patch incomplete: " + ", ".join(missing))
if "code_challenge_method=s256" in text:
    raise SystemExit("lowercase PKCE method remains in index.html")
if "intent://connect?token=" in text or "dlavie://connect?token=" in text:
    raise SystemExit("credential-bearing launcher URI remains")

source.write_text(text, encoding="utf-8")
print("Portal launcher SSO source materialized")
