from pathlib import Path

INDEX = Path("index.html")
MODULE = Path("portal-sso.js")
for source in (INDEX, MODULE):
    if not source.exists():
        raise SystemExit(f"{source} not found")

wrong_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Imx2bXVjc3hibWFkdHNncnh1d21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5ODUyODksImV4cCI6MjA5ODU2MTI4OX0.y-1sE6uYTn4Wbter6g6NozY6uojzD5x9YVeYif-5nJs"
publishable_key = "sb_publishable_aYFlbWVJMErOHwPsli33QQ_INJD9mhx"

text = INDEX.read_text(encoding="utf-8")
module = MODULE.read_text(encoding="utf-8")
text = text.replace(wrong_key, publishable_key)
module = module.replace(wrong_key, publishable_key)

script_marker = "<script>\n\n// ═══════════════════════════════════════════════════════════════\n// SUPABASE CONFIG"
if '<script src="portal-sso.js"></script>' not in text:
    if script_marker not in text:
        raise SystemExit("main script marker not found")
    text = text.replace(
        script_marker,
        '<script src="portal-sso.js"></script>\n<script>\n\n// ═══════════════════════════════════════════════════════════════\n// SUPABASE CONFIG',
        1,
    )

secure_connect = '''// v326: Portal-to-launcher SSO is implemented by portal-sso.js.
// No access token or refresh token is ever placed in a URI.
async function connectToDLavie(){
return window.DLaviePortalSso.connect();
}
'''
if "return window.DLaviePortalSso.connect();" not in text:
    connect_start = "// v7.9.62 FIX: connectToDLavie()"
    connect_end = "\nfunction showPortalInfo(){"
    if connect_start not in text or connect_end not in text:
        raise SystemExit("connectToDLavie markers not found")
    start = text.index(connect_start)
    end = text.index(connect_end, start)
    text = text[:start] + secure_connect + text[end:]

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
if "return window.DLaviePortalSso.loginWithGoogle();" not in text:
    oauth_start = "// GOOGLE OAUTH LOGIN"
    oauth_end = "// v7.9.77: Auto-create profile untuk OAuth user"
    if oauth_start not in text or oauth_end not in text:
        raise SystemExit("Google OAuth markers not found")
    start = text.rfind("// ═══════════════════════════════════════════════════════════════", 0, text.index(oauth_start))
    end = text.index(oauth_end, text.index(oauth_start))
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
    publishable_key,
]
missing = [item for item in required if item not in text and item not in module]
if missing:
    raise SystemExit("Portal SSO patch incomplete: " + ", ".join(missing))
if wrong_key in text or wrong_key in module:
    raise SystemExit("invalid legacy Auth key remains")
if "code_challenge_method=s256" in text or "code_challenge_method=s256" in module:
    raise SystemExit("lowercase PKCE method remains")
if "intent://connect?token=" in text + module or "dlavie://connect?token=" in text + module:
    raise SystemExit("credential-bearing launcher URI remains")

INDEX.write_text(text, encoding="utf-8")
MODULE.write_text(module, encoding="utf-8")
print("Portal launcher SSO source materialized")
