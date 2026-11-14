import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./config.js";
const $=id=>document.getElementById(id);let sb,user,profile,books=[],members=[],selectedMemberId=null;
const staff=()=>["admin","librarian"].includes(profile?.role);
function msg(id,t,error=false){$(id).textContent=t;$(id).style.color=error?"#a12828":""}
async function init(){
 if(SUPABASE_URL.includes("PASTE_")||SUPABASE_PUBLISHABLE_KEY.includes("PASTE_")){msg("loginMsg","First add your Project URL and Publishable key in config.js.",true);return}
 sb=createClient(SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY);
 const {data:{session}}=await sb.auth.getSession();if(session)await enter(session.user);
 sb.auth.onAuthStateChange((_e,s)=>{if(s)setTimeout(()=>enter(s.user),0);else{$("login").classList.remove("hidden");$("app").classList.add("hidden");$("logout").classList.add("hidden")}});
}
async function enter(u){
 user=u;const {data,error}=await sb.from("profiles").select("full_name,role,member_code,program").eq("id",u.id).single();
 if(error||!data){msg("loginMsg","Profile not found. Ask the library administrator to check your profile.",true);return}
 profile=data;$("login").classList.add("hidden");$("app").classList.remove("hidden");$("logout").classList.remove("hidden");
 $("who").textContent=(data.full_name||"Library user")+" • "+u.email;$("role").textContent=data.role||"member";
 $("staff").classList.toggle("hidden",!staff());$("actionHead").classList.toggle("hidden",!staff());
 $("membersPanel").classList.toggle("hidden",!staff());
 await loadBooks();if(staff())await loadMembers();
}
async function loadBooks(){
 const {data,error}=await sb.from("books").select("id,accession_no,title,author,isbn,ddc_number,category,pdf_path").order("title").limit(1000);
 if(error){msg("catalogueMsg",error.message,true);return}books=data||[];$("count").textContent=books.length;render();
}
function render(){
 const q=$("search").value.toLowerCase().trim(),body=$("rows");body.replaceChildren();
 const filtered=books.filter(b=>[b.title,b.author,b.isbn,b.accession_no,b.category].some(v=>String(v||"").toLowerCase().includes(q)));
 if(!filtered.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="No matching books found.";tr.append(td);body.append(tr);return}
 for(const b of filtered){const tr=document.createElement("tr");[b.accession_no,(b.title||"")+(b.author?"\n"+b.author:""),b.ddc_number,b.category].forEach((v,i)=>{const td=document.createElement("td");td.textContent=v||"—";if(i===1)td.style.whiteSpace="pre-line";tr.append(td)});
 const pdf=document.createElement("td");if(b.pdf_path){const a=document.createElement("a");a.href="#";a.textContent="Open PDF";a.onclick=async e=>{e.preventDefault();const {data,error}=await sb.storage.from("library-pdfs").createSignedUrl(b.pdf_path,300);if(error)msg("catalogueMsg",error.message,true);else window.open(data.signedUrl,"_blank","noopener,noreferrer")};pdf.append(a)}else pdf.textContent="Not uploaded";tr.append(pdf);
 if(staff()){const td=document.createElement("td"),btn=document.createElement("button");btn.textContent="Delete";btn.onclick=async()=>{if(!confirm("Delete this book record?"))return;const {error}=await sb.from("books").delete().eq("id",b.id);if(error)msg("catalogueMsg",error.message,true);else loadBooks()};td.append(btn);tr.append(td)}body.append(tr)}
}
const memberColumns="id,full_name,member_code,role,email,phone,program,department,designation,address,status,joining_date,expiry_date";
async function loadMembers(){
 msg("memberMsg","Loading members…");
 const {data,error}=await sb.from("profiles").select(memberColumns).order("full_name",{ascending:true}).limit(1000);
 if(error){msg("memberMsg",error.message,true);return}
 members=data||[];$("memberCount").textContent=members.length;renderMembers();msg("memberMsg","Member records loaded.");
}
function renderMembers(){
 const q=$("memberSearch").value.toLowerCase().trim(),body=$("memberRows");body.replaceChildren();
 const filtered=members.filter(m=>[m.full_name,m.member_code,m.email,m.phone,m.role,m.program].some(v=>String(v||"").toLowerCase().includes(q)));
 if(!filtered.length){const tr=document.createElement("tr"),td=document.createElement("td");td.colSpan=6;td.textContent="No matching members found.";tr.append(td);body.append(tr);return}
 for(const m of filtered){const tr=document.createElement("tr");
 [m.member_code,m.full_name,m.role,m.program,m.phone,m.status||"Active"].forEach(v=>{const td=document.createElement("td");td.textContent=v||"—";tr.append(td)});
 const td=document.createElement("td"),btn=document.createElement("button");btn.type="button";btn.textContent="Edit";btn.onclick=()=>editMember(m);td.append(btn);tr.append(td);body.append(tr)}
}
function editMember(m){
 selectedMemberId=m.id;$("memberFormTitle").textContent="Edit member: "+(m.full_name||m.member_code||"Profile");
 for(const id of ["fullName","memberCode","memberEmail","memberPhone","memberProgram","memberDepartment","memberDesignation","memberAddress","memberStatus","joiningDate","expiryDate"]){
  const key={fullName:"full_name",memberCode:"member_code",memberEmail:"email",memberPhone:"phone",memberProgram:"program",memberDepartment:"department",memberDesignation:"designation",memberAddress:"address",memberStatus:"status",joiningDate:"joining_date",expiryDate:"expiry_date"}[id];
  $(id).value=m[key]||"";
 }
 $("memberRole").textContent=m.role||"student";$("memberEditor").classList.remove("hidden");msg("memberEditMsg","");
 $("memberEditor").scrollIntoView({behavior:"smooth",block:"start"});
}
$("loginForm").onsubmit=async e=>{e.preventDefault();msg("loginMsg","Signing in…");const {data,error}=await sb.auth.signInWithPassword({email:$("email").value.trim(),password:$("password").value});if(error)msg("loginMsg",error.message,true);else await enter(data.user)};
$("logout").onclick=()=>sb.auth.signOut();$("search").oninput=render;
$("bookForm").onsubmit=async e=>{
 e.preventDefault();if(!staff())return;msg("bookMsg","Saving…");const f=$("pdf").files[0];if(f&&f.type!=="application/pdf"){msg("bookMsg","Select a PDF file only.",true);return}
 const rec={accession_no:$("accession").value.trim(),title:$("title").value.trim(),author:$("author").value.trim()||null,isbn:$("isbn").value.trim()||null,ddc_number:$("ddc").value.trim()||null,category:$("category").value.trim()||null,publisher:$("publisher").value.trim()||null,edition:$("edition").value.trim()||null,total_copies:Number($("copies").value)||1,shelf_location:$("shelf").value.trim()||null,description:$("description").value.trim()||null};
 if(f){const path=Date.now()+"-"+f.name.replace(/[^a-zA-Z0-9._-]/g,"_");const {error}=await sb.storage.from("library-pdfs").upload(path,f,{contentType:"application/pdf"});if(error){msg("bookMsg",error.message,true);return}rec.pdf_path=path}
 const {error}=await sb.from("books").insert(rec);if(error){msg("bookMsg",error.message,true);return}e.target.reset();$("copies").value=1;msg("bookMsg","Book saved.");await loadBooks()
};
$("memberSearch").oninput=renderMembers;
$("memberForm").onsubmit=async e=>{
 e.preventDefault();if(!staff()||!selectedMemberId){msg("memberEditMsg","Select an existing member using the Edit button first.",true);return}
 msg("memberEditMsg","Saving member details…");
 const rec={full_name:$("fullName").value.trim(),member_code:$("memberCode").value.trim()||null,email:$("memberEmail").value.trim()||null,phone:$("memberPhone").value.trim()||null,program:$("memberProgram").value.trim()||null,department:$("memberDepartment").value.trim()||null,designation:$("memberDesignation").value.trim()||null,address:$("memberAddress").value.trim()||null,status:$("memberStatus").value||"Active",joining_date:$("joiningDate").value||null,expiry_date:$("expiryDate").value||null};
 const {error}=await sb.from("profiles").update(rec).eq("id",selectedMemberId);
 if(error){msg("memberEditMsg",error.message,true);return}
 msg("memberEditMsg","Member details saved successfully.");await loadMembers();
};
$("cancelMemberEdit").onclick=()=>{$("memberForm").reset();selectedMemberId=null;$("memberEditor").classList.add("hidden");msg("memberEditMsg","")};
init().catch(e=>msg("loginMsg",e.message,true));
