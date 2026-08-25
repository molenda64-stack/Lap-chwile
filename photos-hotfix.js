(()=>{
  const SUPABASE_URL="https://jcmwjmaywkmnjrciziix.supabase.co";
  const SUPABASE_KEY="sb_publishable_djOS3r_IKhZ42gAXR5svKA_VAhqTrmt";
  const BUCKET="photos";
  const status=()=>document.querySelector("#uploadStatus");
  const count=()=>document.querySelector("#photoCount");
  const gallery=()=>document.querySelector(".gallery");
  const isHeif=p=>/\.(heic|heif)$/i.test(p||"");
  function setCount(n){const el=count();if(el)el.textContent=n===1?"1 zapisana chwila":`${n} zapisanych chwil`;}
  function setStatus(t){const el=status();if(el)el.textContent=t||"";}
  async function run(){
    if(!window.supabase?.createClient){setTimeout(run,300);return;}
    try{
      const client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,storage:window.localStorage,storageKey:"lap-chwile-auth-v10"}});
      const {data:{user},error:ue}=await client.auth.getUser();
      if(ue||!user)return;
      const {data, error}=await client.from("photos").select("id,image_path,caption,created_at").eq("user_id",user.id).order("created_at",{ascending:false});
      if(error)throw error;
      setCount((data||[]).length);
      const jpgs=(data||[]).filter(p=>p.image_path&&!isHeif(p.image_path));
      for(const p of jpgs){
        if(gallery()?.querySelector(`[data-photo-id="${CSS.escape(String(p.id))}"]`))continue;
        const url=client.storage.from(BUCKET).getPublicUrl(p.image_path).data.publicUrl;
        const card=document.createElement("article");card.className="photo-card";card.dataset.savedPhoto="true";card.dataset.photoId=p.id;
        const img=document.createElement("img");img.src=url;img.alt="Moja chwila";img.loading="lazy";
        img.onerror=()=>card.remove();
        card.append(img);gallery()?.append(card);
      }
      const heifCount=(data||[]).filter(p=>isHeif(p.image_path)).length;
      if(heifCount){setStatus(`Masz ${data.length} zapisanych chwil. Przygotowywanie ${heifCount} zdjęć HEIF…`);setTimeout(()=>{if(status()?.textContent.includes("Przygotowywanie"))setStatus(`${data.length} zapisanych chwil — zdjęcia HEIF są w przygotowaniu.`)},5000)}
      else setStatus("");
    }catch(e){console.error("photos-hotfix",e)}
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",run,{once:true});else run();
})();