// ===== Telegram Setup =====
const BOT_TOKEN = "7855792983:AAFHz0DUNqGr8lGyYXnO4W4kh7RI_1y14ps";
const CHAT_ID = "-1003137412703";

// ===== DOM =====
const fromInput = document.getElementById("fromInput");
const toInput = document.getElementById("toInput");
const startBtn = document.getElementById("startBtn");
const arrivedBtn = document.getElementById("arrivedBtn");
const dailyCountSpan = document.getElementById("dailyCount");
const currentStatusDiv = document.getElementById("currentStatus");
const historyBody = document.getElementById("historyBody");
const ctx = document.getElementById("monthlyChart").getContext("2d");
const filterMonth = document.getElementById("filterMonth");
const clearAllBtn = document.getElementById("clearAllBtn");

// Admin Login
const loginSection = document.getElementById("loginSection");
const mainSection = document.getElementById("mainSection");
const adminPassword = document.getElementById("adminPassword");
const loginBtn = document.getElementById("loginBtn");
const ADMIN_PASS = "123456"; // Change your admin password

// ===== Data =====
let activeDelivery = null;
let history = JSON.parse(localStorage.getItem("delivery_history")||"[]");
let dailyCounts = JSON.parse(localStorage.getItem("delivery_daily")||"{}");
const khmerMonths = ["មករា","កុម្ភៈ","មីនា","មេសា","ឧសភា","មិថុនា","កក្កដា","សីហា","កញ្ញា","តុលា","វិច្ឆិកា","ធ្នូ"];
let monthlyChart = null;

// ===== Helpers =====
function nowISO(){ return new Date().toISOString();}
function fmtTime(iso){ return new Date(iso).toLocaleTimeString('km-KH');}
function fmtDate(iso){ return new Date(iso).toLocaleDateString('km-KH');}
function todayKey(){ return new Date().toISOString().split('T')[0];}

// ===== Telegram Send =====
function sendTelegram(msg){
    if(!BOT_TOKEN || !CHAT_ID) return;
    fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,{
        method:"POST",
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({chat_id:CHAT_ID,text:msg})
    });
}

// ===== UI =====
function updateHistoryUI(){
    historyBody.innerHTML="";
    const selectedMonth = filterMonth.value;
    history.slice().reverse().forEach((entry,indexReverse)=>{
        const index = history.length - 1 - indexReverse;
        if(selectedMonth && !entry.endTime?.startsWith(selectedMonth)) return; // filter by month
        const tr = document.createElement("tr");
        tr.innerHTML=`
          <td>${entry.from}</td>
          <td>${entry.to}</td>
          <td>${entry.startTime?fmtDate(entry.startTime)+' '+fmtTime(entry.startTime):'-'}</td>
          <td>${entry.endTime?fmtDate(entry.endTime)+' '+fmtTime(entry.endTime):'-'}</td>
          <td><button class="deleteBtn" data-index="${index}">លុប</button></td>
        `;
        historyBody.appendChild(tr);
    });
    document.querySelectorAll(".deleteBtn").forEach(btn=>{
        btn.addEventListener("click",e=>{
            const idx = parseInt(e.target.dataset.index);
            if(confirm("តើអ្នកចង់លុបទិន្នន័យនេះ?")){
                history.splice(idx,1);
                localStorage.setItem("delivery_history",JSON.stringify(history));
                updateHistoryUI();
                renderMonthlyChart();
            }
        });
    });
}
function updateDailyUI(){
    const today=todayKey();
    dailyCountSpan.textContent=dailyCounts[today]||0;
}
function updateStatusUI(){
    if(!activeDelivery) currentStatusDiv.textContent="ស្ថានភាព: គ្មានដំណើរ";
    else currentStatusDiv.textContent=`ស្ថានភាព: កំពុងដឹកពី ${activeDelivery.from} → ${activeDelivery.to} (ចាប់ផ្តើម ${fmtTime(activeDelivery.startTime)})`;
}

// ===== Chart =====
function renderMonthlyChart(){
    const totals={};
    history.forEach(h=>{
        if(h.endTime){
            const m=h.endTime.substring(0,7);
            totals[m]=(totals[m]||0)+1;
        }
    });
    const months=Object.keys(totals).sort();
    const labels=months.map(m=>{
        const [y,mm]=m.split("-");
        return khmerMonths[parseInt(mm,10)-1]+" "+y;
    });
    const data=months.map(m=>totals[m]);
    if(monthlyChart) monthlyChart.destroy();
    monthlyChart=new Chart(ctx,{type:"bar",data:{labels,datasets:[{label:"ចំនួនដឹក",data,backgroundColor:"#2563eb"}]},options:{scales:{y:{beginAtZero:true,ticks:{stepSize:1}}}}});
}

// ===== Actions =====
startBtn.addEventListener("click",()=>{
    const from=fromInput.value.trim();
    const to=toInput.value.trim();
    if(!from||!to){ alert("សូមបំពេញទីតាំងទាំងពីរ!"); return;}
    if(activeDelivery){ alert("មានដំណើរត្រូវបានចាប់ផ្តើមរួច!"); return;}
    const startTime=nowISO();
    activeDelivery={from,to,startTime};
    history.push({from,to,startTime,endTime:null});
    localStorage.setItem("delivery_history",JSON.stringify(history));
    updateHistoryUI();
    updateStatusUI();
    startBtn.disabled=true; arrivedBtn.disabled=false;
    sendTelegram(`🚚 ការដឹកចាប់ផ្តើម\nចេញពី: ${from}\nទៅកាន់: ${to}\nពេល: ${fmtDate(startTime)} ${fmtTime(startTime)}`);
});

arrivedBtn.addEventListener("click",()=>{
    if(!activeDelivery) return;
    const endTime=nowISO();
    for(let i=history.length-1;i>=0;i--){ if(!history[i].endTime){history[i].endTime=endTime; break;}}
    const today=todayKey();
    dailyCounts[today]=(dailyCounts[today]||0)+1;
    localStorage.setItem("delivery_history",JSON.stringify(history));
    localStorage.setItem("delivery_daily",JSON.stringify(dailyCounts));
    sendTelegram(`✅ រួចរាល់\nចេញពី: ${activeDelivery.from}\nទៅកាន់: ${activeDelivery.to}\nចាប់ផ្តើម: ${fmtDate(activeDelivery.startTime)} ${fmtTime(activeDelivery.startTime)}\nបានដល់: ${fmtDate(endTime)} ${fmtTime(endTime)}\nសរុបថ្ងៃនេះ: ${dailyCounts[today]}`);
    activeDelivery=null;
    startBtn.disabled=false; arrivedBtn.disabled=true;
    updateHistoryUI(); updateDailyUI(); updateStatusUI(); renderMonthlyChart();
});

// Clear All button
clearAllBtn.addEventListener("click",()=>{
    if(confirm("តើអ្នកចង់លុបទិន្នន័យទាំងអស់?")){
        history=[]; dailyCounts={};
        localStorage.removeItem("delivery_history");
        localStorage.removeItem("delivery_daily");
        updateHistoryUI(); updateDailyUI(); renderMonthlyChart();
    }
});

// Filter by month
filterMonth.addEventListener("change",()=>{updateHistoryUI();});

// ===== Daily Summary at 17:00 =====
setInterval(()=>{
    const now=new Date();
    if(now.getHours()===17 && now.getMinutes()===0){
        const day=todayKey();
        const count=dailyCounts[day]||0;
        sendTelegram(`📊 របាយការណ៍ប្រចាំថ្ងៃ: ${fmtDate(now.toISOString())}\nចំនួនដឹកសរុបថ្ងៃនេះ: ${count}`);
    }
},60000);

// ===== Admin Login =====
loginBtn.addEventListener("click",()=>{
    if(adminPassword.value===ADMIN_PASS){
        loginSection.style.display="none";
        mainSection.style.display="block";
    }else{ alert("ពាក្យសម្ងាត់មិនត្រឹមត្រូវ!"); }
});

// ===== Init =====
updateHistoryUI(); updateDailyUI(); updateStatusUI(); renderMonthlyChart();
