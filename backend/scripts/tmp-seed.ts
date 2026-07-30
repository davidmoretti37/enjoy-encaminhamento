import { createClient } from '@supabase/supabase-js';
const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
const AG='37e8c878-20f4-42a5-874b-f35ecb8f1360', PW='ZzTeste!2026#anec';
const CO='c1a0de00-0000-4000-8000-000000000201', JOB='c1a0de00-0000-4000-8000-000000000301';
const C1='c1a0de00-0000-4000-8000-000000000101', C2='c1a0de00-0000-4000-8000-000000000102';
async function chk(label:string, r:any){ if(r.error) throw new Error(label+': '+r.error.message); }
(async()=>{
 const ids:any={};
 for(const [k,role] of [['admin','super_admin'],['empresa','company'],['alice','candidate'],['bruno','candidate']] as any){
  const {data,error}=await sb.auth.admin.createUser({email:`zz.teste.${k}@exemplo.invalid`,password:PW,email_confirm:true});
  if(error) throw new Error(k+': '+error.message); ids[k]=data.user!.id;
  await chk('user '+k, await sb.from('users').update({name:'ZZ TESTE '+k,role,agency_id:AG}).eq('id',data.user!.id));}
 await chk('company', await sb.from('companies').insert({id:CO,user_id:ids.empresa,agency_id:AG,status:'active',company_name:'ZZ TESTE Padaria',email:'zz.teste.empresa@exemplo.invalid',cnpj:'12345678000199',address:'Rua das Flores',neighborhood:'Centro',city:'Uberlândia',state:'MG',cep:'38400100'}));
 await chk('job', await sb.from('jobs').insert({id:JOB,agency_id:AG,company_id:CO,status:'open',title:'ZZ TESTE Atendente',description:'teste',contract_type:'clt',work_type:'presencial',location:'Uberlândia, MG',openings:1,salary_min:1800}));
 for(const [id,u,n,cpf,em] of [[C1,ids.alice,'ZZ TESTE Alice','11122233344','zz.teste.alice@exemplo.invalid'],[C2,ids.bruno,'ZZ TESTE Bruno','11122233355','zz.teste.bruno@exemplo.invalid']] as any){
  await chk('cand '+n, await sb.from('candidates').insert({id,user_id:u,agency_id:AG,full_name:n,cpf,email:em,phone:'(34) 90000-0001',city:'Uberlândia',state:'MG',education_level:'medio',status:'active',available_for_clt:true,date_of_birth:'2000-05-10'}));
  await chk('app '+n, await sb.from('applications').insert({job_id:JOB,candidate_id:id,status:'applied'}));}
 console.log(JSON.stringify(ids));
})().catch(e=>{console.error('FAILED:',e.message);process.exit(1);});
