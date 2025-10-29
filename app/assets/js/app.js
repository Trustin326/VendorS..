// Minimal JS - uses custom modal (no <dialog>)
const $=(s,c=document)=>c.querySelector(s), $$=(s,c=document)=>Array.from(c.querySelectorAll(s));
const fmt=(n,cur)=> (cur||settings().currency||"$")+Number(n||0).toFixed(2);
const uid=(p="id")=> p+"_"+Math.random().toString(36).slice(2,9);
const today=()=> new Date().toISOString().slice(0,10);
function storage(k,v){ if(v===undefined){ return JSON.parse(localStorage.getItem(k)||"null"); } localStorage.setItem(k, JSON.stringify(v)); return v;}
function purge(){localStorage.clear()}
function settings(next){ const s=storage("vs_settings")||{bizName:"",currency:"$",tax:0,theme:"dark"}; if(next){storage("vs_settings",{...s,...next}); return {...s,...next};} return s;}
function data(){ return {invoices:storage("vs_invoices")||[],expenses:storage("vs_expenses")||[],clients:storage("vs_clients")||[]};}
function setData(n){ if(n.invoices) storage("vs_invoices", n.invoices); if(n.expenses) storage("vs_expenses", n.expenses); if(n.clients) storage("vs_clients", n.clients);}

function seed(){ setData({
  clients:[{id:uid("cli"),company:"Blue Horizon Landscaping",contact:"Kim Park",email:"kim@bluehorizon.com",phone:"555-101-2222",notes:"Weekly service"},
           {id:uid("cli"),company:"Sparkle Cleaners",contact:"Luis Gomez",email:"luis@sparkleclean.com",phone:"555-313-2222",notes:"Bi-weekly"}],
  invoices:[{id:uid("inv"),num:"INV-1001",client:"Blue Horizon Landscaping",date:today(),due:today(),status:"Unpaid",total:650.00},
            {id:uid("inv"),num:"INV-1002",client:"Sparkle Cleaners",date:today(),due:today(),status:"Paid",total:420.00}],
  expenses:[{id:uid("exp"),date:today(),category:"Supplies",vendor:"Home Depot",notes:"Mulch & bags",amount:120.30},
            {id:uid("exp"),date:today(),category:"Fuel",vendor:"Shell",notes:"Route 9",amount:58.90}]
}); renderAll();}

function addInvoice(r){ const a=data().invoices; a.unshift({id:uid("inv"),...r}); storage("vs_invoices",a); renderInvoices(); renderDashboard();}
function updateInvoice(id,patch){ const a=data().invoices.map(r=>r.id===id?{...r,...patch}:r); storage("vs_invoices",a); renderInvoices(); renderDashboard();}
function removeInvoice(id){ storage("vs_invoices", data().invoices.filter(r=>r.id!==id)); renderInvoices(); renderDashboard();}
function addExpense(r){ const a=data().expenses; a.unshift({id:uid("exp"),...r}); storage("vs_expenses",a); renderExpenses(); renderDashboard();}
function removeExpense(id){ storage("vs_expenses", data().expenses.filter(r=>r.id!==id)); renderExpenses(); renderDashboard();}
function addClient(r){ const a=data().clients; a.unshift({id:uid("cli"),...r}); storage("vs_clients",a); renderClients();}
function removeClient(id){ storage("vs_clients", data().clients.filter(r=>r.id!==id)); renderClients();}

function toCSV(rows){ if(!rows.length) return ""; const headers=Object.keys(rows[0]); const esc=v=>('\"'+String(v).replace(/\"/g,'\"\"')+'\"'); return [headers.join(",")].concat(rows.map(r=>headers.map(h=>esc(r[h]??"")).join(","))).join("\n");}
function fromCSV(text){ const [h,...ls]=text.trim().split(/\r?\n/); const headers=h.split(",").map(x=>x.replace(/^\"|\"$/g,"")); return ls.map(line=>{const cells=line.match(/(\"(?:[^\"]|\"\")*\"|[^,]+)/g).map(c=>c.replace(/^\"|\"$/g,"").replace(/\"\"/g,'"')); const o={}; headers.forEach((hdr,i)=>o[hdr]=cells[i]||""); return o;});}

function drawChart(incomes,expenses){ const c=$("#chart"),x=c.getContext("2d"); x.clearRect(0,0,c.width,c.height); const pad=40,w=c.width-80,h=c.height-80; const maxv=Math.max(...incomes,...expenses,10); const barW=w/(incomes.length*2); x.strokeStyle="#89a"; x.beginPath(); x.moveTo(pad,pad); x.lineTo(pad,pad+h); x.lineTo(pad+w,pad+h); x.stroke(); incomes.forEach((v,i)=>{const X=pad+i*2*barW+10; const ih=(v/maxv)*h; x.fillStyle="#00e0d0"; x.fillRect(X,pad+h-ih,barW-12,ih);}); expenses.forEach((v,i)=>{const X=pad+i*2*barW+barW+10; const eh=(v/maxv)*h; x.fillStyle="#e9c46a"; x.fillRect(X,pad+h-eh,barW-12,eh);});}

function summarize(){ const ds=data(); const unpaid=ds.invoices.filter(i=>i.status!=="Paid"); const outstanding=unpaid.reduce((a,b)=>a+Number(b.total||0),0); const month=new Date().toISOString().slice(0,7); const monthExp=ds.expenses.filter(e=>e.date.slice(0,7)===month).reduce((a,b)=>a+Number(b.amount||0),0); const top=Object.entries(ds.invoices.reduce((acc,i)=>{acc[i.client]=(acc[i.client]||0)+Number(i.total||0);return acc;},{})).sort((a,b)=>b[1]-a[1])[0]?.[0]||"-"; $("#unpaidCount").textContent=unpaid.length; $("#outstandingTotal").textContent=fmt(outstanding); $("#monthExpenses").textContent=fmt(monthExp); $("#topClient").textContent=top; const months=Array.from({length:6}).map((_,k)=>{const d=new Date(); d.setMonth(d.getMonth()-(5-k)); return d.toISOString().slice(0,7);}); const incomes=months.map(m=>ds.invoices.filter(i=>i.date.slice(0,7)===m).reduce((a,b)=>a+Number(b.total||0),0)); const expenses=months.map(m=>ds.expenses.filter(e=>e.date.slice(0,7)===m).reduce((a,b)=>a+Number(b.amount||0),0)); drawChart(incomes,expenses); const catTotals=ds.expenses.reduce((acc,e)=>{acc[e.category]=(acc[e.category]||0)+Number(e.amount||0);return acc;},{}); $("#topCategories").innerHTML=Object.entries(catTotals).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([k,v])=>`<li>${k}: <b>${fmt(v)}</b></li>`).join("")||"<li>No categories yet</li>"; $("#monthlySummary").textContent=`Invoices this month: ${ds.invoices.filter(i=>i.date.slice(0,7)===month).length} • Expenses this month: ${fmt(monthExp)}`;}

function renderInvoices(){ const tb=$("#invoiceTable tbody"),cur=settings().currency||"$"; tb.innerHTML=data().invoices.map(i=>`<tr><td>${i.num}</td><td>${i.client}</td><td>${i.date}</td><td>${i.due}</td><td><select data-id="${i.id}" class="inv-status">${["Unpaid","Paid","Overdue"].map(s=>`<option ${i.status===s?"selected":""}>${s}</option>`).join("")}</select></td><td>${fmt(i.total,cur)}</td><td><button data-id="${i.id}" class="row-del danger">Delete</button></td></tr>`).join("")||`<tr><td colspan="7">No invoices yet — click "New Invoice".</td></tr>`;}
function renderExpenses(){ const tb=$("#expenseTable tbody"),cur=settings().currency||"$"; tb.innerHTML=data().expenses.map(e=>`<tr><td>${e.date}</td><td>${e.category}</td><td>${e.vendor}</td><td>${e.notes}</td><td>${fmt(e.amount,cur)}</td><td><button data-id="${e.id}" class="exp-del danger">Delete</button></td></tr>`).join("")||`<tr><td colspan="6">No expenses yet — click "Add Expense".</td></tr>`;}
function renderClients(){ const tb=$("#clientTable tbody"); tb.innerHTML=data().clients.map(c=>`<tr><td>${c.company}</td><td>${c.contact}</td><td>${c.email}</td><td>${c.phone}</td><td>${c.notes}</td><td><button data-id="${c.id}" class="cli-del danger">Delete</button></td></tr>`).join("")||`<tr><td colspan="6">No clients yet — click "Add Client".</td></tr>`;}
function renderDashboard(){ summarize(); }

function openModal(html){ $("#modalContent").innerHTML=html; $("#modal").classList.remove("hidden"); }
function closeModal(){ $("#modal").classList.add("hidden"); $("#modalContent").innerHTML=""; }
document.addEventListener("click", e=>{ if(e.target.dataset.close) closeModal(); });
document.addEventListener("keydown", e=>{ if(e.key==="Escape") closeModal(); });

function invoiceForm(i={}){ return `<h3>${i.id?"Edit":"New"} Invoice</h3><label>Number<input name="num" required></label><label>Client<input name="client" required></label><label>Date<input type="date" name="date" value="${today()}" required></label><label>Due<input type="date" name="due" value="${today()}" required></label><label>Status<select name="status">${["Unpaid","Paid","Overdue"].map(s=>`<option>${s}</option>`).join("")}</select></label><label>Total<input type="number" step="0.01" name="total" value="0" required></label><menu><button type="button" class="ghost" data-close="1">Cancel</button><button id="saveInv" class="primary">Create</button></menu>`;}
function expenseForm(){ return `<h3>New Expense</h3><label>Date<input type="date" name="date" value="${today()}" required></label><label>Category<input name="category" required></label><label>Vendor<input name="vendor"></label><label>Notes<input name="notes"></label><label>Amount<input type="number" step="0.01" name="amount" value="0" required></label><menu><button type="button" class="ghost" data-close="1">Cancel</button><button id="saveExp" class="primary">Add</button></menu>`;}
function clientForm(){ return `<h3>New Client</h3><label>Company<input name="company" required></label><label>Contact<input name="contact"></label><label>Email<input name="email" type="email"></label><label>Phone<input name="phone"></label><label>Notes<input name="notes"></label><menu><button type="button" class="ghost" data-close="1">Cancel</button><button id="saveCli" class="primary">Add</button></menu>`;}

// Nav
$$(".nav-item").forEach(b=>b.addEventListener("click", e=>{ $$(".nav-item").forEach(x=>x.classList.remove("active")); e.currentTarget.classList.add("active"); const v=e.currentTarget.getAttribute("data-view"); $$(".view").forEach(x=>x.classList.remove("visible")); $("#view-"+v).classList.add("visible"); if(v==="dashboard") renderDashboard(); }));

// Actions
$("#seedDemo").addEventListener("click", seed);
$("#clearAll").addEventListener("click", ()=>{ if(confirm("Clear all VendorS data?")){ purge(); renderAll(); }});
$("#printReport").addEventListener("click", ()=>window.print());
$("#themeToggle").addEventListener("click", ()=>{ const root=document.body; if(root.classList.contains("light")){ root.classList.remove("light"); settings({theme:"dark"}) } else { root.classList.add("light"); settings({theme:"light"}) }});

// Invoices modal handlers
$("#addInvoice").addEventListener("click", ()=>{ openModal(invoiceForm()); setTimeout(()=>{ const box=$("#modal"); box.addEventListener("click", onSaveOnce); function onSaveOnce(e){ if(e.target && e.target.id==="saveInv"){ e.preventDefault(); const f=$("#modal"); addInvoice({ num:f.querySelector("input[name='num']").value.trim(), client:f.querySelector("input[name='client']").value.trim(), date:f.querySelector("input[name='date']").value, due:f.querySelector("input[name='due']").value, status:f.querySelector("select[name='status']").value, total:Number(f.querySelector("input[name='total']").value||0) }); closeModal(); box.removeEventListener("click", onSaveOnce);} } }); });
document.addEventListener("change", e=>{ if(e.target.matches(".inv-status")) updateInvoice(e.target.dataset.id, {status:e.target.value}); });
document.addEventListener("click", e=>{ if(e.target.matches(".row-del")) removeInvoice(e.target.dataset.id); });

// Expenses
$("#addExpense").addEventListener("click", ()=>{ openModal(expenseForm()); setTimeout(()=>{ const box=$("#modal"); box.addEventListener("click", onSaveOnce); function onSaveOnce(e){ if(e.target && e.target.id==="saveExp"){ e.preventDefault(); const f=$("#modal"); addExpense({ date:f.querySelector("input[name='date']").value, category:f.querySelector("input[name='category']").value.trim(), vendor:f.querySelector("input[name='vendor']").value.trim(), notes:f.querySelector("input[name='notes']").value.trim(), amount:Number(f.querySelector("input[name='amount']").value||0) }); closeModal(); box.removeEventListener("click", onSaveOnce);} } }); });
document.addEventListener("click", e=>{ if(e.target.matches(".exp-del")) removeExpense(e.target.dataset.id); });

// Clients
$("#addClient").addEventListener("click", ()=>{ openModal(clientForm()); setTimeout(()=>{ const box=$("#modal"); box.addEventListener("click", onSaveOnce); function onSaveOnce(e){ if(e.target && e.target.id==="saveCli"){ e.preventDefault(); const f=$("#modal"); addClient({ company:f.querySelector("input[name='company']").value.trim(), contact:f.querySelector("input[name='contact']").value.trim(), email:f.querySelector("input[name='email']").value.trim(), phone:f.querySelector("input[name='phone']").value.trim(), notes:f.querySelector("input[name='notes']").value.trim() }); closeModal(); box.removeEventListener("click", onSaveOnce);} } }); });
document.addEventListener("click", e=>{ if(e.target.matches(".cli-del")) removeClient(e.target.dataset.id); });

// CSV import/export
$("#exportInvoices").addEventListener("click", ()=> downloadFile("vendors_invoices.csv", toCSV(data().invoices)));
$("#exportExpenses").addEventListener("click", ()=> downloadFile("vendors_expenses.csv", toCSV(data().expenses)));
$("#exportClients").addEventListener("click", ()=> downloadFile("vendors_clients.csv", toCSV(data().clients)));
$("#importInvoices").addEventListener("change", e=> handleCSVImport(e, "invoices"));
$("#importExpenses").addEventListener("change", e=> handleCSVImport(e, "expenses"));
$("#importClients").addEventListener("change", e=> handleCSVImport(e, "clients"));
function handleCSVImport(e,type){ const file=e.target.files[0]; if(!file) return; const reader=new FileReader(); reader.onload=()=>{ const rows=fromCSV(reader.result); const withIds=rows.map(r=>({id:uid(type.slice(0,3)),...r})); const cur=data()[type]; setData({[type]:withIds.concat(cur)}); renderAll(); }; reader.readAsText(file); }
function downloadFile(filename, content){ const a=document.createElement("a"); const blob=new Blob([content],{type:"text/plain"}); a.href=URL.createObjectURL(blob); a.download=filename; a.click(); URL.revokeObjectURL(a.href); }

// Backup/Restore
$("#downloadBackup").addEventListener("click", ()=> downloadFile("vendors_backup.json", JSON.stringify({settings:settings(), ...data()}, null, 2)));
$("#restoreBackup").addEventListener("click", ()=>{ const inp=document.createElement("input"); inp.type="file"; inp.accept=".json"; inp.onchange=(e)=>{ const f=e.target.files[0]; if(!f) return; const reader=new FileReader(); reader.onload=()=>{ try{ const parsed=JSON.parse(reader.result); if(parsed.settings) storage("vs_settings", parsed.settings); if(parsed.invoices) storage("vs_invoices", parsed.invoices); if(parsed.expenses) storage("vs_expenses", parsed.expenses); if(parsed.clients) storage("vs_clients", parsed.clients); renderAll(); }catch(err){ alert("Invalid JSON"); } }; reader.readAsText(f); }; inp.click(); });

function renderAll(){ renderDashboard(); renderInvoices(); renderExpenses(); renderClients(); const t=settings().theme||"dark"; if(t==="light") document.body.classList.add("light"); else document.body.classList.remove("light"); }
renderAll();
