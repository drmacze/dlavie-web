from pathlib import Path

INDEX = Path("index.html")
MODULE = Path("portal-sso.js")
for source in (INDEX, MODULE):
    if not source.exists():
        raise SystemExit(f"{source} not found")

wrong_key = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJIUzI1NiIsInJlZiI6Imx2bXVjc3hibWFkdHNncnh1d21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5ODUyODksImV4cCI6MjA5ODU2MTI4OX0.y-1sE6uYTn4Wbter6g6NozY6uojzD5x9YVeYif-5nJs"
publishable_key = "sb_publishable_aYFlbWVJMErOHwPsli33QQ_INJD9mhx"
verified_callback = "https://drmacze.github.io/launcher/auth/callback/"


def replace_once(value: str, old: str, new: str, label: str) -> str:
    if new in value:
        return value
    if old not in value:
        raise SystemExit(f"{label} marker not found")
    return value.replace(old, new, 1)


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

secure_connect = '''// v327: Portal-to-launcher SSO is implemented by portal-sso.js.
// New launchers return through a verified HTTPS App Link; v326 remains compatible.
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
// GOOGLE OAUTH LOGIN — v327 Authorization Code + PKCE
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

# Google OAuth can return in a new browser/custom-tab context. sessionStorage is
# scoped to one tab, so a successful OAuth exchange could look signed-out after
# the redirect. Keep the short-lived PKCE verifier in same-origin localStorage
# (TTL-checked and deleted immediately on callback), and persist the verified
# Portal session across tabs. Access is still revalidated/refreshed on startup.
legacy_module_session = '''  function session() {
    const access = sessionStorage.getItem('dlavie_access') || '';
    const uid = sessionStorage.getItem('dlavie_uid') || '';
    const email = sessionStorage.getItem('dlavie_email') || '';
    return access && uid ? { access, uid, email } : null;
  }
'''
persistent_module_session = '''  const AUTH_KEYS = ['dlavie_access', 'dlavie_refresh', 'dlavie_uid', 'dlavie_email'];

  function readAuthValue(key) {
    return sessionStorage.getItem(key) || localStorage.getItem(key) || '';
  }

  function persistAuthSession(access, refresh, uid, email) {
    const values = {
      dlavie_access: access || '',
      dlavie_refresh: refresh || '',
      dlavie_uid: uid || '',
      dlavie_email: email || '',
    };
    Object.entries(values).forEach(([key, value]) => {
      if (value) {
        sessionStorage.setItem(key, value);
        localStorage.setItem(key, value);
      } else {
        sessionStorage.removeItem(key);
        localStorage.removeItem(key);
      }
    });
  }

  function clearAuthSession() {
    AUTH_KEYS.forEach(key => {
      sessionStorage.removeItem(key);
      localStorage.removeItem(key);
    });
  }

  function session() {
    const access = readAuthValue('dlavie_access');
    const uid = readAuthValue('dlavie_uid');
    const email = readAuthValue('dlavie_email');
    if (!access || !uid) return null;
    // Hydrate the active tab so existing Portal code keeps working unchanged.
    sessionStorage.setItem('dlavie_access', access);
    sessionStorage.setItem('dlavie_uid', uid);
    if (email) sessionStorage.setItem('dlavie_email', email);
    return { access, uid, email };
  }
'''
module = replace_once(module, legacy_module_session, persistent_module_session, "persistent module session")

for key in ("GOOGLE_VERIFIER", "GOOGLE_STATE", "GOOGLE_STARTED"):
    module = module.replace(f"sessionStorage.setItem({key},", f"localStorage.setItem({key},")
    module = module.replace(f"sessionStorage.getItem({key})", f"localStorage.getItem({key})")
module = module.replace(
    "[GOOGLE_VERIFIER, GOOGLE_STATE, GOOGLE_STARTED].forEach(key => sessionStorage.removeItem(key));",
    "[GOOGLE_VERIFIER, GOOGLE_STATE, GOOGLE_STARTED].forEach(key => localStorage.removeItem(key));",
)

legacy_oauth_save = '''      sessionStorage.setItem('dlavie_access', authSession.access_token);
      sessionStorage.setItem('dlavie_refresh', authSession.refresh_token);
      sessionStorage.setItem('dlavie_uid', user.id);
      sessionStorage.setItem('dlavie_email', user.email || '');
'''
module = replace_once(
    module,
    legacy_oauth_save,
    "      persistAuthSession(authSession.access_token, authSession.refresh_token, user.id, user.email || '');\n",
    "OAuth persistent session save",
)
module = module.replace(
    "['dlavie_access', 'dlavie_refresh', 'dlavie_uid', 'dlavie_email'].forEach(key => sessionStorage.removeItem(key));",
    "clearAuthSession();",
)
# Do not force Google's account chooser after an already authenticated browser
# session. Google can still show a chooser when it is actually needed.
module = module.replace("      url.searchParams.set('prompt', 'select_account');\n", "")

legacy_index_session = '''function saveSession(access,refresh,uid,email){
sessionStorage.setItem('dlavie_access',access);
sessionStorage.setItem('dlavie_refresh',refresh||'');
sessionStorage.setItem('dlavie_uid',uid);
sessionStorage.setItem('dlavie_email',email||'');
}
function clearSession(){
['dlavie_access','dlavie_refresh','dlavie_uid','dlavie_email'].forEach(k=>sessionStorage.removeItem(k));
currentUser=null;
window.currentUser=null;
updateNavUser();
}
function logout(){
clearSession();
showToast(tr('toast_logout'));
location.hash='#/portal';
setTimeout(()=>{initPortal();},200);
}
function getStoredSession(){
const a=sessionStorage.getItem('dlavie_access'),u=sessionStorage.getItem('dlavie_uid');
return(a&&u)?{access:a,uid:u}:null;
}
'''
persistent_index_session = '''const DLAVIE_AUTH_KEYS=['dlavie_access','dlavie_refresh','dlavie_uid','dlavie_email'];
function readSessionValue(key){return sessionStorage.getItem(key)||localStorage.getItem(key)||'';}
function saveSession(access,refresh,uid,email){
const values={dlavie_access:access||'',dlavie_refresh:refresh||'',dlavie_uid:uid||'',dlavie_email:email||''};
Object.entries(values).forEach(([key,value])=>{
if(value){sessionStorage.setItem(key,value);localStorage.setItem(key,value);}
else{sessionStorage.removeItem(key);localStorage.removeItem(key);}
});
}
function clearSession(){
DLAVIE_AUTH_KEYS.forEach(k=>{sessionStorage.removeItem(k);localStorage.removeItem(k);});
currentUser=null;
window.currentUser=null;
updateNavUser();
}
function logout(){
clearSession();
showToast(tr('toast_logout'));
location.hash='#/portal';
setTimeout(()=>{initPortal();},200);
}
function getStoredSession(){
const access=readSessionValue('dlavie_access'),uid=readSessionValue('dlavie_uid');
if(!access||!uid)return null;
const value={access:access,refresh:readSessionValue('dlavie_refresh'),uid:uid,email:readSessionValue('dlavie_email')};
// Migrate an older tab-only session into persistent same-origin storage.
saveSession(value.access,value.refresh,value.uid,value.email);
return value;
}
function accessTokenNeedsRefresh(token){
try{
const part=token.split('.')[1]||'';
const normalized=part.replace(/-/g,'+').replace(/_/g,'/');
const padded=normalized+'='.repeat((4-normalized.length%4)%4);
const payload=JSON.parse(atob(padded));
return Number(payload.exp||0)<=Math.floor(Date.now()/1000)+60;
}catch(_){return true;}
}
async function refreshStoredSession(stored){
if(!stored||!stored.refresh)return null;
try{
const r=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify({refresh_token:stored.refresh}),cache:'no-store'});
const d=await r.json().catch(()=>({}));
if(!r.ok||!d.access_token||!d.refresh_token||!d.user||!d.user.id)return null;
saveSession(d.access_token,d.refresh_token,d.user.id,d.user.email||stored.email||'');
return{access:d.access_token,refresh:d.refresh_token,uid:d.user.id,email:d.user.email||stored.email||''};
}catch(e){console.warn('Session refresh failed:',e);return null;}
}
'''
text = replace_once(text, legacy_index_session, persistent_index_session, "persistent index session")

legacy_restore = '''async function restoreSession(){
const s=getStoredSession();if(!s)return;
const p=await fetchUserProfile(s.uid,s.access);
if(p){
currentUser={id:p.id,email:sessionStorage.getItem('dlavie_email')||'',username:p.username,display_name:p.display_name,avatar_url:p.avatar_url,cover_url:p.cover_url||'',bio:p.bio||'',role:p.role};
updateNavUser();
}else{
// v7.9.77 FIX: Jangan clear session langsung. Coba auto-create profile dulu.
// Ini handle case dimana user signup via Google OAuth tapi trigger gagal create profile.
console.warn('restoreSession: profile not found, attempting auto-create...');
const email=sessionStorage.getItem('dlavie_email')||'';
const created=await ensureProfileFromOAuth(s.uid,s.access,email,'','');
if(created){
currentUser={id:created.id,email:email,username:created.username,display_name:created.display_name,avatar_url:created.avatar_url,cover_url:'',bio:'',role:created.role};
updateNavUser();
showToast('Profil berhasil dibuat. Selamat datang!');
}else{
// Last resort: set fallback currentUser dari localStorage supaya user
// tetap kelihatan logged in (nav shows avatar), meski profile row belum ada.
// Profile bisa di-create later via launcher atau manual.
console.warn('restoreSession: profile creation failed, using fallback currentUser');
currentUser={id:s.uid,email:email,username:email?email.split('@')[0]:'user',display_name:email?email.split('@')[0]:'DLavie User',avatar_url:null,cover_url:'',bio:'',role:'user'};
updateNavUser();
}
}
}
'''
persistent_restore = '''async function restoreSession(){
let s=getStoredSession();if(!s)return;
if(accessTokenNeedsRefresh(s.access)){
const refreshed=await refreshStoredSession(s);
if(!refreshed){clearSession();return;}
s=refreshed;
}
let p=await fetchUserProfile(s.uid,s.access);
// A token can be revoked before its exp. One refresh retry avoids presenting a
// valid Google user as signed-out because of a stale access token.
if(!p&&s.refresh){
const refreshed=await refreshStoredSession(s);
if(refreshed){s=refreshed;p=await fetchUserProfile(s.uid,s.access);}
}
if(p){
currentUser={id:p.id,email:readSessionValue('dlavie_email'),username:p.username,display_name:p.display_name,avatar_url:p.avatar_url,cover_url:p.cover_url||'',bio:p.bio||'',role:p.role};
window.currentUser=currentUser;
updateNavUser();
}else{
console.warn('restoreSession: profile not found, attempting auto-create...');
const email=readSessionValue('dlavie_email');
const created=await ensureProfileFromOAuth(s.uid,s.access,email,'','');
if(created){
currentUser={id:created.id,email:email,username:created.username,display_name:created.display_name,avatar_url:created.avatar_url,cover_url:'',bio:'',role:created.role};
window.currentUser=currentUser;
updateNavUser();
showToast('Profil berhasil dibuat. Selamat datang!');
}else{
console.warn('restoreSession: profile creation failed, using verified-session fallback user');
currentUser={id:s.uid,email:email,username:email?email.split('@')[0]:'user',display_name:email?email.split('@')[0]:'DLavie User',avatar_url:null,cover_url:'',bio:'',role:'user'};
window.currentUser=currentUser;
updateNavUser();
}
}
}
'''
text = replace_once(text, legacy_restore, persistent_restore, "refreshing restoreSession")

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
for old in ("v8.1.0", "v8.2.0"):
    text = text.replace(f"Latest version <strong data-launcher-version>{old}</strong>", "Latest version <strong data-launcher-version>v8.3.0</strong>")
    text = text.replace(f"let LAUNCHER_VERSION = '{old}';", "let LAUNCHER_VERSION = 'v8.3.0';")
for old_code in (325, 326):
    text = text.replace(f"build <span data-launcher-code>{old_code}</span>", "build <span data-launcher-code>327</span>")
    text = text.replace(f"let LAUNCHER_VERSION_CODE = {old_code};", "let LAUNCHER_VERSION_CODE = 327;")

required = [
    '<script src="portal-sso.js"></script>',
    'return window.DLaviePortalSso.connect();',
    'return window.DLaviePortalSso.loginWithGoogle();',
    'return window.DLaviePortalSso.handleOAuthCallback();',
    publishable_key,
    verified_callback,
    'normalizeRequestedCallback',
    'isTrustedCallbackResult',
    'callback_uri',
    'persistAuthSession',
    'localStorage.setItem(key, value)',
    'localStorage.setItem(GOOGLE_VERIFIER',
    'readSessionValue',
    'refreshStoredSession',
    'accessTokenNeedsRefresh',
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
if "sessionStorage.setItem(GOOGLE_VERIFIER" in module:
    raise SystemExit("Google PKCE verifier is still tab-scoped")
if "url.searchParams.set('prompt', 'select_account')" in module:
    raise SystemExit("Google login still forces a second account-selection prompt")

INDEX.write_text(text, encoding="utf-8")
MODULE.write_text(module, encoding="utf-8")
print("Portal verified launcher SSO source materialized with persistent Google session")
