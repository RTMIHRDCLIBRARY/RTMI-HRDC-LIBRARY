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
 const {data,error}=await sb.from("profiles")
 .select("full_name,role,member_code,program,account_status,phone,address,blood_group,profile_photo_path")
 .eq("id",u.id)
 .single();
 if(error||!data){msg("loginMsg","Profile not found. Ask the library administrator to check your profile.",true);return} 
 if(data.account_status!=="approved"){
 await sb.auth.signOut();
 msg("loginMsg","Your account is pending Admin approval or has been rejected. Please contact the Library Admin.",true);
 return;
}
profile=data;

$("myFullName").value=data.full_name||"";
$("myPhone").value=data.phone||"";
$("myAddress").value=data.address||"";
$("myBloodGroup").value=data.blood_group||"";

$("login").classList.add("hidden");;$("app").classList.remove("hidden");$("logout").classList.remove("hidden");
 $("who").textContent=(data.full_name||"Library user")+" • "+u.email;$("role").textContent=data.role||"member";
 $("staff").classList.toggle("hidden",!staff());$("actionHead").classList.toggle("hidden",!staff());
 $("membersPanel").classList.toggle("hidden",!staff());
 $("pendingApprovalsPanel").classList.toggle("hidden",!staff());
if(staff())await loadPendingRegistrations();
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
 
const pdf=document.createElement("td");

if(b.pdf_path){
 const read=document.createElement("button");
 read.type="button";
 read.textContent="Read Online";

 read.onclick=async()=>{
  const {data,error}=await sb.storage
   .from("library-pdfs")
   .createSignedUrl(b.pdf_path,3600);

  if(error){
   msg("catalogueMsg",error.message,true);
  }else{
   window.open(data.signedUrl,"_blank","noopener,noreferrer");
  }
 };

 const download=document.createElement("button");
 download.type="button";
 download.textContent="Download PDF";

 download.onclick=async()=>{
  const {data,error}=await sb.storage
   .from("library-pdfs")
   .download(b.pdf_path);

  if(error){
   msg("catalogueMsg",error.message,true);
   return;
  }

  const url=URL.createObjectURL(data);
  const link=document.createElement("a");
  link.href=url;
  link.download=(b.title||"library-book")+".pdf";
  link.click();
  URL.revokeObjectURL(url);
 };

 pdf.append(read,download);
}else{
 pdf.textContent="Not uploaded";
}

tr.append(pdf);
if(staff()){
 const td=document.createElement("td");
 const btn=document.createElement("button");

 btn.textContent="Delete";

 btn.onclick=async()=>{
  if(!confirm("Delete this book record?"))return;

  const {error}=await sb
   .from("books")
   .delete()
   .eq("id",b.id);

  if(error){
   msg("catalogueMsg",error.message,true);
  }else{
   await loadBooks();
  }
 };

 td.append(btn);
 tr.append(td);
}

body.append(tr);
}
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

async function loadPendingRegistrations(){
 const {data,error}=await sb
  .from("profiles")
  .select("id,full_name,email,requested_role,phone,account_status")
  .eq("account_status","pending")
  .order("updated_at",{ascending:false});

 if(error){
  msg("approvalMsg",error.message,true);
  return;
 }

 const body=$("pendingRows");
 body.replaceChildren();

 if(!data||data.length===0){
  const tr=document.createElement("tr");
  const td=document.createElement("td");
  td.colSpan=5;
  td.textContent="No pending registrations.";
  tr.append(td);
  body.append(tr);
  msg("approvalMsg","No pending requests.");
  return;
 }

 for(const m of data){
  const tr=document.createElement("tr");

  [m.full_name,m.email,m.requested_role,m.phone].forEach(value=>{
   const td=document.createElement("td");
   td.textContent=value||"—";
   tr.append(td);
  });

  const td=document.createElement("td");

  const approve=document.createElement("button");
  approve.textContent="Approve";
  approve.onclick=()=>approveMember(m.id,m.requested_role);

  const reject=document.createElement("button");
  reject.textContent="Reject";
  reject.onclick=()=>rejectMember(m.id);

  td.append(approve,reject);
  tr.append(td);
  body.append(tr);
 }

 msg("approvalMsg",data.length+" pending request(s) found.");
}

async function approveMember(id,requestedRole){
 if(!staff())return;
 if(!confirm("Approve this registration?"))return;

 const allowedRoles=["student","teacher","staff"];
 const finalRole=allowedRoles.includes(requestedRole)
  ?requestedRole
  :"student";

 const {error}=await sb
  .from("profiles")
  .update({role:finalRole,account_status:"approved"})
  .eq("id",id)
  .eq("account_status","pending");

 if(error){
  msg("approvalMsg",error.message,true);
  return;
 }

 msg("approvalMsg","Registration approved successfully.");
 await loadPendingRegistrations();
 await loadMembers();
}

async function rejectMember(id){
 if(!staff())return;
 if(!confirm("Reject this registration?"))return;

 const {error}=await sb
  .from("profiles")
  .update({account_status:"rejected"})
  .eq("id",id)
  .eq("account_status","pending");

 if(error){
  msg("approvalMsg",error.message,true);
  return;
 }

 msg("approvalMsg","Registration rejected.");
 await loadPendingRegistrations();
 await loadMembers();
}
// Save My Profile
$("profileForm").onsubmit=async e=>{
 e.preventDefault();

 const fullName=$("myFullName").value.trim();
 const phone=$("myPhone").value.trim();
 const address=$("myAddress").value.trim();
 const bloodGroup=$("myBloodGroup").value;
 const photo=$("myPhoto").files[0];

 if(!fullName){
  msg("profileMsg","Please enter your full name.",true);
  return;
 }

 msg("profileMsg","Saving your profile...");

 try{
  let photoPath=profile.profile_photo_path||null;

  if(photo){
   if(!["image/jpeg","image/png","image/webp"].includes(photo.type)){
    msg("profileMsg","Please select a JPG, PNG, or WEBP image.",true);
    return;
   }

   if(photo.size>3*1024*1024){
    msg("profileMsg","Photo must be smaller than 3 MB.",true);
    return;
   }

   const safeName=photo.name.replace(/[^a-zA-Z0-9._-]/g,"_");
   photoPath=user.id+"/"+Date.now()+"-"+safeName;

   const {error:uploadError}=await sb.storage
    .from("profile-photos")
    .upload(photoPath,photo,{contentType:photo.type});

   if(uploadError)throw uploadError;
  }

  const {error}=await sb.rpc("update_my_profile",{
   p_full_name:fullName,
   p_phone:phone,
   p_address:address,
   p_blood_group:bloodGroup,
   p_profile_photo_path:photoPath
  });

  if(error)throw error;

  profile.full_name=fullName;
  profile.phone=phone;
  profile.address=address;
  profile.blood_group=bloodGroup;
  profile.profile_photo_path=photoPath;

  $("who").textContent=fullName+" • "+user.email;
  $("myPhoto").value="";
  msg("profileMsg","Profile updated successfully!");

 }catch(error){
  msg("profileMsg",error.message,true);
 }
};

$("backToLogin").onclick=()=>{
 $("registerPanel").classList.add("hidden");
 $("login").classList.remove("hidden");
};
// Registration system
$("registerForm").onsubmit=async e=>{
 e.preventDefault();

 const password=$("regPassword").value;

 if(password!==$("regPassword2").value){
  msg("registerMsg","Passwords do not match.",true);
  return;
 }

 msg("registerMsg","Submitting registration...");

 const metadata={
  full_name:$("regName").value.trim(),
  requested_role:$("regRole").value,
  class_id:$("regClassId").value.trim(),
  session:$("regSession").value.trim(),
  phone:$("regPhone").value.trim(),
  blood_group:$("regBlood").value,
  course_name:$("regCourse").value.trim(),
  college_name:$("regCollege").value.trim(),
  department:$("regDepartment").value.trim(),
  academic_year:$("regYear").value.trim(),
  roll_number:$("regRoll").value.trim(),
  registration_number:$("regRegistration").value.trim()
 };

 try{
  const {data,error}=await sb.auth.signUp({
   email:$("regEmail").value.trim(),
   password,
   options:{data:metadata}
  });

  if(error){
   msg("registerMsg",error.message,true);
   return;
  }

  $("registerForm").reset();

  msg("registerMsg",data.session
   ? "Registration submitted. Your account is pending Admin approval."
   : "Registration created. Please check your email to confirm your address. Your account is pending Admin approval.");

 }catch(error){
  msg("registerMsg",error.message,true);
 }
};

$("showRegister").onclick=()=>{
 $("login").classList.add("hidden");
 $("registerPanel").classList.remove("hidden");
};

$("backToLogin").onclick=()=>{
 $("registerPanel").classList.add("hidden");
 $("login").classList.remove("hidden");
};

init().catch(e=>msg("loginMsg",e.message,true));
