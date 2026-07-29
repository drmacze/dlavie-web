from pathlib import Path

INDEX = Path("index.html")
if not INDEX.exists():
    raise SystemExit("index.html not found")

html = INDEX.read_text(encoding="utf-8")

# ── Browser security policy ────────────────────────────────────────────────────
expires_meta = '<meta http-equiv="Expires" content="0" />'
security_meta = '''<meta http-equiv="Expires" content="0" />
<meta name="referrer" content="strict-origin-when-cross-origin" />
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com https://unpkg.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.fontshare.com; font-src 'self' https: data:; img-src 'self' https: data: blob:; connect-src 'self' https://lvmucsxbmadtsgrxuwmo.supabase.co https://raw.githubusercontent.com https://cdn.jsdelivr.net https://api.github.com; object-src 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests" />'''
if 'Content-Security-Policy' not in html:
    if expires_meta not in html:
        raise SystemExit("Head insertion marker not found")
    html = html.replace(expires_meta, security_meta, 1)

# ── Session storage: tab-scoped, never persistent localStorage ────────────────
session_start = "function saveSession(access,refresh,uid,email){"
session_end = "\n\nasync function fetchUserProfile(uid,token){"
if session_start not in html or session_end not in html:
    raise SystemExit("Session block markers not found")
start = html.index(session_start)
end = html.index(session_end, start)
secure_session = '''function saveSession(access,refresh,uid,email){
sessionStorage.setItem('dlavie_access',access);
sessionStorage.setItem('dlavie_refresh',refresh||'');
sessionStorage.setItem('dlavie_uid',uid);
sessionStorage.setItem('dlavie_email',email||'');
}
function clearSession(){
['dlavie_access','dlavie_refresh','dlavie_uid','dlavie_email'].forEach(k=>sessionStorage.removeItem(k));
currentUser=null;
updateNavUser();
}
function logout(){
clearSession();
showToast(currentLang==='en'?'Logged out successfully.':'Berhasil logout.');
location.hash='#/portal';
setTimeout(()=>{initPortal();},200);
}
function getStoredSession(){
const a=sessionStorage.getItem('dlavie_access'),u=sessionStorage.getItem('dlavie_uid');
return(a&&u)?{access:a,uid:u}:null;
}'''
html = html[:start] + secure_session + html[end:]

# Remaining session reads must use the same tab-scoped store.
for key in ('dlavie_access','dlavie_refresh','dlavie_uid','dlavie_email'):
    html = html.replace(f"localStorage.getItem('{key}')", f"sessionStorage.getItem('{key}')")
    html = html.replace(f"localStorage.setItem('{key}'", f"sessionStorage.setItem('{key}'")
    html = html.replace(f"localStorage.removeItem('{key}')", f"sessionStorage.removeItem('{key}')")

# ── Reject legacy token login URLs ─────────────────────────────────────────────
auto_start = "async function autoLoginFromURL(){"
auto_end = "\n\nfunction updateNavUser(){"
if auto_start not in html or auto_end not in html:
    raise SystemExit("autoLoginFromURL markers not found")
start = html.index(auto_start)
end = html.index(auto_end, start)
secure_auto_login = '''async function autoLoginFromURL(){
const params=new URLSearchParams(window.location.search);
const legacyKeys=['token','uid','refresh','access_token','refresh_token'];
const containsLegacySecrets=legacyKeys.some(key=>params.has(key));
if(!containsLegacySecrets)return false;
clearSession();
const cleanUrl=window.location.origin+window.location.pathname+(window.location.hash||'');
window.history.replaceState({},document.title,cleanUrl);
showToast('Tautan login lama ditolak demi keamanan. Silakan login kembali.');
return false;
}'''
html = html[:start] + secure_auto_login + html[end:]

# ── Portal connect opens the launcher only; no credentials cross the URL ──────
connect_start = "function connectToDLavie(){"
connect_end = "\n\nfunction showPortalInfo(){"
if connect_start not in html or connect_end not in html:
    raise SystemExit("connectToDLavie markers not found")
start = html.index(connect_start)
end = html.index(connect_end, start)
secure_connect = '''function connectToDLavie(){
const ua=navigator.userAgent||'';
const isAndroid=/android/i.test(ua);
const isIOS=/iphone|ipad|ipod/i.test(ua);
if(!isAndroid&&!isIOS){showPortalInfo();return;}

let opened=false;
const visibilityHandler=()=>{if(document.hidden)opened=true;};
document.addEventListener('visibilitychange',visibilityHandler,{once:true});

if(isAndroid){
window.location.href=`intent://connect#Intent;scheme=dlavie;package=com.drmacze.f16launcher;S.browser_fallback_url=${encodeURIComponent(PORTAL_URL+'?connect=fail')};end`;
}else{
window.location.href='dlavie://connect';
}
setTimeout(()=>{
document.removeEventListener('visibilitychange',visibilityHandler);
if(!opened&&!document.hidden)showPortalInfo();
},1500);
}'''
html = html[:start] + secure_connect + html[end:]

html = html.replace(
    '<p class="portal-sub">Untuk connect langsung dari launcher, pastikan:</p>',
    '<p class="portal-sub">Login dilakukan langsung di launcher. Website tidak pernah mengirim token akun ke aplikasi.</p>'
)
html = html.replace(
    '<strong style="color:var(--text-white);">Klik "Connect" dari Launcher</strong><br>Launcher akan redirect balik ke sini.',
    '<strong style="color:var(--text-white);">Login dengan aman</strong><br>Gunakan email/password atau Google langsung di launcher.'
)

# ── Google OAuth: Authorization Code + PKCE ───────────────────────────────────
oauth_start = "function loginWithGoogle() {"
oauth_end = "\n\n// v7.9.77: Auto-create profile"
if oauth_start not in html or oauth_end not in html:
    raise SystemExit("Google OAuth block markers not found")
start = html.index(oauth_start)
end = html.index(oauth_end, start)
pkce_oauth = r'''function base64Url(bytes){
return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
function createCodeVerifier(){
const bytes=new Uint8Array(64);
crypto.getRandomValues(bytes);
return base64Url(bytes);
}
async function createCodeChallenge(verifier){
const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
return base64Url(new Uint8Array(digest));
}
async function loginWithGoogle(){
try{
const verifier=createCodeVerifier();
const challenge=await createCodeChallenge(verifier);
sessionStorage.setItem('dlavie_pkce_verifier',verifier);
sessionStorage.setItem('dlavie_pkce_started',String(Date.now()));
const redirectTo=window.location.origin+window.location.pathname;
const authUrl=SUPABASE_URL+'/auth/v1/authorize?provider=google'+
'&redirect_to='+encodeURIComponent(redirectTo)+
'&code_challenge='+encodeURIComponent(challenge)+
'&code_challenge_method=s256';
window.location.assign(authUrl);
}catch(error){
console.error('PKCE initialization failed',error);
showToast('Login Google tidak dapat dimulai. Coba lagi.');
}
}

async function handleOAuthCallback(){
const url=new URL(window.location.href);
const code=url.searchParams.get('code');
const oauthError=url.searchParams.get('error');
if(!code&&!oauthError)return false;

const verifier=sessionStorage.getItem('dlavie_pkce_verifier')||'';
const startedAt=Number(sessionStorage.getItem('dlavie_pkce_started')||'0');
sessionStorage.removeItem('dlavie_pkce_verifier');
sessionStorage.removeItem('dlavie_pkce_started');
url.searchParams.delete('code');
url.searchParams.delete('error');
url.searchParams.delete('error_description');
history.replaceState({},document.title,url.pathname+url.search+(url.hash||''));

if(oauthError){
showToast('Login Google dibatalkan atau gagal.');
return true;
}
if(!verifier||!startedAt||Date.now()-startedAt>10*60*1000){
clearSession();
showToast('Sesi login sudah kedaluwarsa. Mulai login Google kembali.');
return true;
}

try{
const tokenResponse=await fetch(SUPABASE_URL+'/auth/v1/token?grant_type=pkce',{
method:'POST',
headers:{'apikey':SUPABASE_ANON_KEY,'Content-Type':'application/json','Accept':'application/json'},
body:JSON.stringify({auth_code:code,code_verifier:verifier}),
cache:'no-store'
});
const session=await tokenResponse.json();
if(!tokenResponse.ok||!session.access_token||!session.refresh_token)throw new Error('PKCE exchange failed');

const userResponse=await fetch(SUPABASE_URL+'/auth/v1/user',{
headers:{'apikey':SUPABASE_ANON_KEY,'Authorization':'Bearer '+session.access_token,'Accept':'application/json'},
cache:'no-store'
});
const user=await userResponse.json();
if(!userResponse.ok||!user.id)throw new Error('Session verification failed');
if(session.user&&session.user.id&&session.user.id!==user.id)throw new Error('User mismatch');

saveSession(session.access_token,session.refresh_token,user.id,user.email||'');
let profile=await fetchUserProfile(user.id,session.access_token);
if(!profile){
const meta=user.user_metadata||{};
profile=await ensureProfileFromOAuth(
user.id,
session.access_token,
user.email||'',
meta.full_name||meta.name||meta.display_name||'',
meta.avatar_url||meta.picture||''
);
}
if(profile){
currentUser={id:profile.id,email:user.email||'',username:profile.username,display_name:profile.display_name,avatar_url:profile.avatar_url,role:profile.role};
updateNavUser();
showToast('Login Google berhasil! Selamat datang, '+(currentUser.display_name||currentUser.username));
setTimeout(()=>{location.hash='#/portal';},300);
}else{
showToast('Login berhasil, tetapi profil belum siap. Coba refresh halaman.');
}
}catch(error){
console.error('OAuth PKCE callback failed',error);
clearSession();
showToast('Sesi Google tidak dapat diverifikasi. Silakan login kembali.');
}
return true;
}'''
html = html[:start] + pkce_oauth + html[end:]

# Register new accounts with a stronger client-side minimum. Existing users can still login.
html = html.replace("if(pwd.length<6){err.textContent='Password minimal 6 karakter.'", "if(pwd.length<8){err.textContent='Password minimal 8 karakter.'")
html = html.replace("Password terlalu lemah. Gunakan minimal 6 karakter.", "Password terlalu lemah. Gunakan minimal 8 karakter.")

# ── Security assertions ────────────────────────────────────────────────────────
for forbidden in (
    'intent://connect?token=',
    'dlavie://connect?token=',
    "localStorage.setItem('dlavie_access'",
    "localStorage.setItem('dlavie_refresh'",
    "const token=p.get('token')",
    "hash.includes('access_token')",
):
    if forbidden in html:
        raise SystemExit(f"Legacy credential handling remains: {forbidden}")

for required in (
    "grant_type=pkce",
    "code_verifier:verifier",
    "sessionStorage.setItem('dlavie_access'",
    "window.location.href='dlavie://connect'",
    "Content-Security-Policy",
):
    if required not in html:
        raise SystemExit(f"Security marker missing: {required}")

INDEX.write_text(html,encoding="utf-8")
print("Portal auth hardened: PKCE, tab sessions, tokenless launcher connect")
