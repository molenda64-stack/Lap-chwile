(() => {
  const URL = "https://jcmwjmaywkmnjrciziix.supabase.co";
  const KEY = "sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";
  function init(){
    if(!window.supabase?.createClient){setTimeout(init,100);return;}
    const sb=window.supabase.createClient(URL,KEY,{auth:{persistSession:true,storage:window.localStorage,storageKey:"lap-chwile-auth-v10"}});
    const panel=document.querySelector('#accountPanel'), name=document.querySelector('#accountName'), mail=document.querySelector('#accountEmail'), avatar=document.querySelector('#accountAvatar'), msg=document.querySelector('#accountMessage');
    const edit=document.querySelector('#profileEdit'), nameInput=document.querySelector('#profileName'), pass=document.querySelector('#passwordForm');
    const say=(t,ok=false)=>{if(msg){msg.textContent=t||'';msg.className=`auth-message${ok?' ok':''}`}};
    const render=user=>{if(!panel)return; if(!user){panel.classList.remove('open');return;} const display=user.user_metadata?.display_name||user.email?.split('@')[0]||'Moje konto'; name.textContent=display; mail.textContent=user.email||''; avatar.textContent=display.trim().charAt(0).toUpperCase()||'👤'; nameInput.value=user.user_metadata?.display_name||''; panel.classList.add('open');};
    document.querySelector('#editProfileBtn')?.addEventListener('click',()=>{edit.classList.toggle('open');pass.classList.remove('open');say('')});
    document.querySelector('#changePasswordBtn')?.addEventListener('click',()=>{pass.classList.toggle('open');edit.classList.remove('open');say('')});
    document.querySelector('#logoutBtn')?.addEventListener('click',async()=>{say('Wylogowywanie…');const {error}=await sb.auth.signOut();if(error)say('Nie udało się wylogować. Spróbuj ponownie.');});
    edit?.addEventListener('submit',async e=>{e.preventDefault();const value=nameInput.value.trim();if(!value)return say('Wpisz nazwę.');const {data,error}=await sb.auth.updateUser({data:{display_name:value}});if(error)return say('Nie udało się zapisać profilu.');render(data.user);say('Profil zapisany.',true)});
    pass?.addEventListener('submit',async e=>{e.preventDefault();const value=document.querySelector('#newPassword').value;if(value.length<6)return say('Hasło musi mieć co najmniej 6 znaków.');const {error}=await sb.auth.updateUser({password:value});if(error)return say('Nie udało się zmienić hasła.');e.target.reset();e.target.classList.remove('open');say('Hasło zostało zmienione.',true)});
    sb.auth.getSession().then(({data})=>render(data.session?.user||null)); sb.auth.onAuthStateChange((_event,session)=>render(session?.user||null));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
