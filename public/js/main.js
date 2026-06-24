let currentStep = 1;
let isRestoring = false; 
const flightsData = { arr: { flights: [], airlines: [], iata: '' }, dep: { flights: [], airlines: [], iata: '' } };

function changeLanguage(lang) {
    currentLang = lang;
    document.getElementById('current_flag').textContent = lang === 'vi' ? '🇻🇳' : '🇺🇸';
    document.getElementById('current_lang_text').textContent = lang.toUpperCase();
    document.getElementById('lang_dropdown').classList.add('hidden');
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) el.innerHTML = translations[lang][key];
    });
    ['arr', 'dep'].forEach(t => {
        const inp = document.getElementById(`${t}_airline_input`);
        if(inp && !flightsData[t].iata) inp.placeholder = translations[lang].placeholder_airline;
    });
    if(!isRestoring) saveCurrentFormState();
}

function switchPage(page) {
    const isHome = (page === 'home' || page === '/');
    document.getElementById('page_home').classList.toggle('hidden', !isHome);
    document.getElementById('page_booking').classList.toggle('hidden', isHome);
    document.getElementById('nav_home').className = isHome ? "text-amber-500 border-b-2 border-amber-500 pb-1 transition font-bold" : "text-slate-400 hover:text-white pb-1 transition";
    document.getElementById('nav_booking').className = !isHome ? "text-amber-500 border-b-2 border-amber-500 pb-1 transition font-bold" : "text-slate-400 hover:text-white pb-1 transition";
    
    const targetUrl = isHome ? '/home' : '/fasttrack';
    if(window.location.pathname !== targetUrl && window.location.pathname !== '/') history.pushState({ page: isHome ? 'home' : 'fasttrack' }, "", targetUrl);
    if(!isRestoring) saveCurrentFormState();
    window.scrollTo(0, 0);
}

window.addEventListener('popstate', (e) => {
    if(e.state && e.state.page) switchPage(e.state.page);
});

function handleServiceToggle() {
    const hasArr = document.getElementById('srv_arrival').checked;
    const hasDep = document.getElementById('srv_departure').checked;
    const tabs = document.getElementById('booking_tabs');
    document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    document.getElementById('inline_error_msg').classList.add('hidden');

    if (hasArr && hasDep) {
        tabs.classList.remove('hidden'); document.getElementById('copy_arr_wrapper').style.display = 'flex'; switchBookingTab('arr');
    } else {
        tabs.classList.add('hidden');
        if (hasArr) { switchBookingTab('arr'); document.getElementById('copy_arr_wrapper').style.display = 'none'; } 
        else if (hasDep) { switchBookingTab('dep'); document.getElementById('copy_arr_info').checked = false; toggleDepPax(); document.getElementById('copy_arr_wrapper').style.display = 'none'; } 
        else { document.getElementById('card_arrival').classList.add('hidden'); document.getElementById('card_departure').classList.add('hidden'); }
    }
    if(hasArr && flightsData.arr.airlines.length === 0) fetchFlights('arr');
    if(hasDep && flightsData.dep.airlines.length === 0) fetchFlights('dep');
    if(!isRestoring) saveCurrentFormState();
}

function switchBookingTab(tab) {
    document.getElementById('card_arrival').classList.toggle('hidden', tab !== 'arr');
    document.getElementById('card_departure').classList.toggle('hidden', tab !== 'dep');
    const btnArr = document.getElementById('tab_btn_arr');
    const btnDep = document.getElementById('tab_btn_dep');
    if(btnArr && btnDep) {
        if(tab === 'arr') {
            btnArr.className = "flex-1 py-4 text-sm uppercase font-bold tracking-widest rounded-xl bg-emerald-500 text-slate-950 shadow-md";
            btnDep.className = "flex-1 py-4 text-sm uppercase font-bold tracking-widest rounded-xl bg-slate-800 text-slate-400 hover:text-white";
        } else {
            btnDep.className = "flex-1 py-4 text-sm uppercase font-bold tracking-widest rounded-xl bg-blue-500 text-slate-950 shadow-md";
            btnArr.className = "flex-1 py-4 text-sm uppercase font-bold tracking-widest rounded-xl bg-slate-800 text-slate-400 hover:text-white";
        }
    }
}

function toggleDropdown(idPrefix) { document.getElementById(`${idPrefix}_dropdown`).classList.toggle('hidden'); }

function toggleDepPax() {
    const isCopy = document.getElementById('copy_arr_info').checked;
    document.getElementById('dep_pax_container').style.display = isCopy ? 'none' : 'block';
    if(isCopy) document.getElementById('dep_pax_container').querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    if(!isRestoring) { saveCurrentFormState(); calculateTotalBill(); }
}

function autoCalculateMeetTime() {
    const depTime = document.getElementById('dep_time').value;
    if(!depTime) return;
    let [h, m] = depTime.split(':').map(Number);
    h = (h - 2 + 24) % 24;
    document.getElementById('dep_meet_time').value = `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}`;
    if(!isRestoring) saveCurrentFormState();
}

// Phóng to Font Chữ bên trong Thẻ Khách Hàng (Tăng text-xs -> text-sm, text-[10px] -> text-xs, padding p-3 -> p-4)
function renderPax(type) {
    const adults = parseInt(document.getElementById(`${type}_adult`).value) || 0;
    const children = parseInt(document.getElementById(`${type}_child`).value) || 0;
    const infants = parseInt(document.getElementById(`${type}_infant`).value) || 0;
    const zone = document.getElementById(`${type}_pax_zone`);
    if(!zone) return;
    
    zone.className = "w-full space-y-4 h-[400px] overflow-y-auto pr-2 custom-scrollbar pb-36";
    
    const currentInputs = {};
    zone.querySelectorAll('input').forEach(inp => { currentInputs[inp.name] = inp.value; });
    zone.innerHTML = '';

    let paxIdx = 1;
    for (let i = 1; i <= adults; i++) { drawCard(type, paxIdx, 'Người lớn (>6t)', currentInputs, zone); paxIdx++; }
    for (let i = 1; i <= children; i++) { drawCard(type, paxIdx, 'Trẻ em (2-5t)', currentInputs, zone); paxIdx++; }
    for (let i = 1; i <= infants; i++) { drawCard(type, paxIdx, 'Em bé (<2t)', currentInputs, zone); paxIdx++; }

    if(!isRestoring) { saveCurrentFormState(); calculateTotalBill(); }
}

function drawCard(type, idx, label, currentInputs, zone) {
    const card = document.createElement('div');
    card.className = "bg-[#131f32] border border-slate-700/40 rounded-xl p-5 space-y-3 relative";
    const oldName = currentInputs[`${type}_pax_${idx}_name`] || '';
    const oldNat = currentInputs[`${type}_pax_${idx}_nat`] || '';

    card.innerHTML = `
        <div class="text-xs font-bold text-slate-400 uppercase tracking-wider">Hành khách #${idx} (${label}) *</div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <input type="text" name="${type}_pax_${idx}_name" value="${oldName}" placeholder="Họ Tên Tiếng Anh (ENG) *" class="w-full bg-[#0b111e] border border-slate-700 rounded-xl p-4 text-sm text-white uppercase focus:outline-none focus:border-amber-500" required oninput="this.classList.remove('input-error')">
            <div class="relative">
                <div class="flex items-center bg-[#0b111e] border border-slate-700 rounded-xl focus-within:border-amber-500 transition">
                    <span class="pl-4 pr-2 text-lg" id="flag_${type}_${idx}">🏳️</span>
                    <input type="text" id="nat_inp_${type}_${idx}" name="${type}_pax_${idx}_nat" value="${oldNat}" placeholder="Quốc Tịch (KOR, VNM...) *" class="w-full bg-transparent p-4 text-sm text-white uppercase focus:outline-none" required autocomplete="off">
                </div>
                <div id="nat_drop_${type}_${idx}" class="absolute left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-[#1a2639] border border-slate-600 rounded-xl shadow-2xl hidden z-50 custom-scrollbar"></div>
            </div>
        </div>
    `;
    zone.appendChild(card);

    const inp = card.querySelector(`#nat_inp_${type}_${idx}`);
    const drop = card.querySelector(`#nat_drop_${type}_${idx}`);
    const flagSpan = card.querySelector(`#flag_${type}_${idx}`);

    if(oldNat) {
        const match = countriesList.find(c => oldNat.toUpperCase().includes(c.code.toUpperCase()));
        if(match) flagSpan.textContent = match.flag;
    }

    inp.addEventListener('input', (e) => {
        inp.parentElement.classList.remove('input-error');
        drop.innerHTML = '';
        const kw = e.target.value.toLowerCase().trim();
        const filtered = countriesList.filter(c => c.code.toLowerCase().includes(kw) || c.name.toLowerCase().includes(kw));
        
        filtered.forEach(c => {
            const item = document.createElement('div');
            item.className = "p-3 text-sm text-slate-300 hover:bg-amber-500 hover:text-slate-950 cursor-pointer flex items-center gap-3 border-b border-slate-700/50";
            item.innerHTML = `<span>${c.flag}</span> <span>${c.code} (${c.name})</span>`;
            item.onmousedown = (evt) => {
                evt.preventDefault();
                inp.value = `${c.code} (${c.name})`;
                flagSpan.textContent = c.flag;
                drop.classList.add('hidden');
                saveCurrentFormState();
            };
            drop.appendChild(item);
        });
    });
    inp.addEventListener('focus', () => { inp.dispatchEvent(new Event('input')); drop.classList.remove('hidden'); });
    inp.addEventListener('blur', () => { setTimeout(() => drop.classList.add('hidden'), 200); });
}

function validateStep1() {
    const hasArr = document.getElementById('srv_arrival').checked;
    const hasDep = document.getElementById('srv_departure').checked;
    let isValid = true; let firstError = null;
    const errBox = document.getElementById('inline_error_msg');
    errBox.classList.add('hidden');

    function checkField(id) {
        const el = document.getElementById(id);
        if (el && !el.value.trim()) { el.classList.add('input-error'); if(!firstError) firstError = el; isValid = false; }
    }
    checkField('contact_email');

    function checkZone(id) {
        const zone = document.getElementById(id);
        if(!zone) return;
        zone.querySelectorAll('input[required]').forEach(el => {
            if(!el.value.trim()) { 
                const target = el.id.includes('nat_inp_') ? el.parentElement : el;
                target.classList.add('input-error'); if(!firstError) firstError = el; isValid = false; }
        });
    }

    if (hasArr) {
        if(!flightsData.arr.iata) { document.getElementById('arr_airline_input').classList.add('input-error'); if(!firstError) firstError = document.getElementById('arr_airline_input'); isValid = false; }
        checkField('arr_flight_num'); checkField('arr_date');
        if(!document.getElementById('arr_time').value && document.getElementById('fixed_arr_time_val').value) {
            document.getElementById('arr_time').value = document.getElementById('fixed_arr_time_val').value;
        }
        checkField('arr_time'); checkZone('arr_pax_zone');
    }
    if (hasDep) {
        if(!flightsData.dep.iata) { document.getElementById('dep_airline_input').classList.add('input-error'); if(!firstError) firstError = document.getElementById('dep_airline_input'); isValid = false; }
        checkField('dep_flight_num'); checkField('dep_date'); checkField('dep_time'); checkField('dep_meet_time');
        if(!document.getElementById('copy_arr_info').checked) checkZone('dep_pax_zone');
    }

    if (!isValid) {
        if (!hasArr && !hasDep) errBox.textContent = translations[currentLang]?.err_no_service;
        else if (firstError && document.getElementById('card_arrival').contains(firstError)) errBox.textContent = translations[currentLang]?.err_arr_missing;
        else if (firstError && document.getElementById('card_departure').contains(firstError)) errBox.textContent = translations[currentLang]?.err_dep_missing;
        else errBox.textContent = translations[currentLang]?.alert_error;
        
        errBox.classList.remove('hidden');
        if(firstError) {
            if(document.getElementById('card_arrival').contains(firstError) && hasArr && hasDep) switchBookingTab('arr');
            if(document.getElementById('card_departure').contains(firstError) && hasArr && hasDep) switchBookingTab('dep');
            setTimeout(() => { firstError.scrollIntoView({ behavior: 'smooth', block: 'center' }); firstError.focus(); }, 250);
        }
        return false;
    }
    return true;
}

function goToStep(step) {
    if (step === 2 && currentStep === 1 && !validateStep1()) return;
    currentStep = step;
    [1, 2, 3].forEach(s => {
        document.getElementById(`step_section_${s}`).classList.toggle('hidden', s !== step);
        document.getElementById(`step_dot_${s}`).className = s <= step 
            ? "w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-lg"
            : "w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-lg";
    });
    document.getElementById('progress_line').style.width = step === 1 ? '0%' : step === 2 ? '50%' : '100%';
    if (step === 2) calculateTotalBill();
    if(!isRestoring) saveCurrentFormState();
    window.scrollTo(0, 0);
}

async function fetchFlights(type) {
    const loc = document.getElementById(`${type}_location`).value;
    try {
        const response = await fetch(`/api/flights?iata=${loc}`);
        const resData = await response.json();
        const all = resData.success ? resData.data : [];
        flightsData[type].flights = all.filter(f => f.type === (type === 'arr' ? 'ARRIVAL' : 'DEPARTURE'));
        const airlineMap = new Map();
        flightsData[type].flights.forEach(f => { if(f.airline_iata) airlineMap.set(f.airline_iata, f.airline_name); });
        flightsData[type].airlines = Array.from(airlineMap, ([iata, name]) => ({ iata, name })).sort((a,b) => a.name.localeCompare(b.name));
        flightsData[type].iata = ''; document.getElementById(`${type}_airline_input`).value = ''; document.getElementById(`${type}_prefix`).textContent = '--';
    } catch (e) { console.error(e); }
}

function renderAirlineSuggestions(type, text = '') {
    const dropdown = document.getElementById(`${type}_airline_dropdown`);
    dropdown.innerHTML = '';
    const kw = text.toLowerCase().trim();
    const filtered = flightsData[type].airlines.filter(a => a.iata.toLowerCase().includes(kw) || a.name.toLowerCase().includes(kw));
    filtered.forEach(airline => {
        const item = document.createElement('div');
        item.className = "flex items-center gap-4 p-4 text-sm text-slate-300 hover:bg-slate-800 cursor-pointer border-b border-slate-800/50";
        item.innerHTML = `<img src="https://pics.avs.io/60/60/${airline.iata}.png" class="w-8 h-8 rounded bg-white object-contain p-1" onerror="this.src='https://placehold.co/60x60?text=${airline.iata}'"><span>${airline.name} (${airline.iata})</span>`;
        item.onmousedown = (e) => { e.preventDefault(); selectAirline(type, airline.iata, airline.name); dropdown.classList.add('hidden'); saveCurrentFormState(); };
        dropdown.appendChild(item);
    });
}

function selectAirline(type, iata, name) {
    flightsData[type].iata = iata;
    const input = document.getElementById(`${type}_airline_input`);
    input.value = `${name} (${iata})`;
    input.classList.remove('input-error');
    document.getElementById(`${type}_prefix`).textContent = iata;
    renderFlightSuggestions(type, document.getElementById(`${type}_flight_num`).value);
}

// TỰ ĐỘNG ĐIỀN GIỜ ĐÁP/TIỄN KHI CHỌN CHUYẾN BAY (CHUẨN 24H)
function renderFlightSuggestions(type, filterNum) {
    const dropdown = document.getElementById(`${type}_flight_dropdown`);
    dropdown.innerHTML = '';
    const iataFilter = flightsData[type].iata;
    const filtered = flightsData[type].flights.filter(f => f.airline_iata === iataFilter && f.flight_code.includes(iataFilter + filterNum.toUpperCase()));
    filtered.forEach(flight => {
        const item = document.createElement('div');
        item.className = "p-4 text-sm text-slate-300 cursor-pointer border-b border-slate-800/50 flex justify-between items-center hover:bg-slate-700";
        let timeStr = '--:--';
        if(flight.scheduled_time) {
            const d = new Date(flight.scheduled_time);
            timeStr = d.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hour12: false });
        }
        item.innerHTML = `<span>${flight.flight_code}</span><span class="text-[11px] font-bold bg-black/40 px-3 py-1 rounded">${timeStr}</span>`;
        item.onmousedown = (e) => {
            e.preventDefault();
            document.getElementById(`${type}_flight_num`).value = flight.flight_code.replace(iataFilter, '');
            document.getElementById(`${type}_flight_num`).parentElement.classList.remove('input-error');
            
            // Xử lý tự điền khung Giờ
            if(timeStr !== '--:--') {
                if(type === 'arr') {
                    document.getElementById('fixed_arr_time_val').value = timeStr;
                    document.getElementById('arr_fixed_time_text').textContent = timeStr;
                    document.getElementById('arr_time').value = timeStr;
                    document.getElementById('arr_time').classList.remove('input-error');
                } else {
                    document.getElementById('dep_time').value = timeStr;
                    document.getElementById('dep_time').classList.remove('input-error');
                    autoCalculateMeetTime();
                }
            }
            dropdown.classList.add('hidden'); saveCurrentFormState();
        };
        dropdown.appendChild(item);
    });
}

function calculateTotalBill() {
    const hasArr = document.getElementById('srv_arrival').checked;
    const hasDep = document.getElementById('srv_departure').checked;
    const isCopy = document.getElementById('copy_arr_info').checked;

    const arrA = parseInt(document.getElementById('arr_adult').value) || 0;
    const arrC = parseInt(document.getElementById('arr_child').value) || 0;
    const arrI = parseInt(document.getElementById('arr_infant').value) || 0;
    let depA = parseInt(document.getElementById('dep_adult').value) || 0;
    let depC = parseInt(document.getElementById('dep_child').value) || 0;
    let depI = parseInt(document.getElementById('dep_infant').value) || 0;
    if(hasArr && hasDep && isCopy) { depA = arrA; depC = arrC; depI = arrI; }

    const invoiceZone = document.getElementById('invoice_details_zone');
    if(!invoiceZone) return;
    invoiceZone.innerHTML = '';
    let subtotal = 0;

    if(hasArr) {
        const tier = parseFloat(document.querySelector('input[name="pkg_arr_tier"]:checked')?.value || 15);
        const adultCost = tier * arrA; const childCost = (tier * 0.5) * arrC;
        subtotal += adultCost + childCost;
        invoiceZone.innerHTML += `<div class="flex justify-between text-sm"><span>• Cước người lớn (Đón): ${arrA} pax × $${tier}</span><span>$${adultCost.toFixed(2)}</span></div>`;
        if(arrC > 0) invoiceZone.innerHTML += `<div class="flex justify-between text-sm text-emerald-400/90"><span>• Cước trẻ em (Đón -50%): ${arrC} pax × $${(tier*0.5)}</span><span>$${childCost.toFixed(2)}</span></div>`;
        if(arrI > 0) invoiceZone.innerHTML += `<div class="flex justify-between text-sm text-slate-500"><span>• Cước em bé (Đón - Miễn phí): ${arrI} pax</span><span>$0.00</span></div>`;
    }
    if(hasDep) {
        const tier = parseFloat(document.querySelector('input[name="pkg_dep_tier"]:checked')?.value || 15);
        const adultCost = tier * depA; const childCost = (tier * 0.5) * depC;
        subtotal += adultCost + childCost;
        invoiceZone.innerHTML += `<div class="flex justify-between text-sm"><span>• Cước người lớn (Tiễn): ${depA} pax × $${tier}</span><span>$${adultCost.toFixed(2)}</span></div>`;
        if(depC > 0) invoiceZone.innerHTML += `<div class="flex justify-between text-sm text-blue-400/90"><span>• Cước trẻ em (Tiễn -50%): ${depC} pax × $${(tier*0.5)}</span><span>$${childCost.toFixed(2)}</span></div>`;
        if(depI > 0) invoiceZone.innerHTML += `<div class="flex justify-between text-sm text-slate-500"><span>• Cước em bé (Tiễn - Miễn phí): ${depI} pax</span><span>$0.00</span></div>`;
    }
    if(document.getElementById('addon_security').checked) {
        const secA = hasDep ? depA : arrA; const secC = hasDep ? depC : arrC; const secI = hasDep ? depI : arrI;
        const adultSecCost = secA * 10; const childSecCost = secC * 5;
        subtotal += adultSecCost + childSecCost;
        invoiceZone.innerHTML += `<div class="flex justify-between text-sm text-amber-400/80"><span>• An ninh nhanh (Lớn): ${secA} pax × $10</span><span>$${adultSecCost.toFixed(2)}</span></div>`;
        if(secC > 0) invoiceZone.innerHTML += `<div class="flex justify-between text-sm text-amber-500/80"><span>• An ninh nhanh (Trẻ -50%): ${secC} pax × $5</span><span>$${childSecCost.toFixed(2)}</span></div>`;
        if(secI > 0) invoiceZone.innerHTML += `<div class="flex justify-between text-sm text-slate-500"><span>• An ninh nhanh (Bé - Miễn phí): ${secI} pax</span><span>$0.00</span></div>`;
    }

    let discount = (hasArr && hasDep) ? (subtotal * 0.05) : 0;
    document.getElementById('bill_discount_row').classList.toggle('hidden', discount === 0);
    document.getElementById('bill_subtotal').textContent = `$${subtotal.toFixed(2)}`;
    document.getElementById('bill_discount').textContent = `-$${discount.toFixed(2)}`;
    document.getElementById('bill_total').textContent = `$${(subtotal - discount).toFixed(2)}`;

    document.getElementById('bill_subtotal_val').value = subtotal.toFixed(2);
    document.getElementById('bill_discount_val').value = discount.toFixed(2);
    document.getElementById('bill_total_val').value = (subtotal - discount).toFixed(2);
}

function saveCurrentFormState() {
    if(isRestoring) return;
    const form = document.getElementById('fastTrackForm');
    if(!form) return;
    const formData = new FormData(form);
    const state = Object.fromEntries(formData.entries());
    state.activePage = document.getElementById('page_home').classList.contains('hidden') ? 'booking' : 'home';
    state.currentStep = currentStep; state.currentLang = currentLang;
    state.arr_airline_iata = flightsData.arr.iata; state.dep_airline_iata = flightsData.dep.iata;
    state.srv_arrival = document.getElementById('srv_arrival').checked;
    state.srv_departure = document.getElementById('srv_departure').checked;
    state.copy_arr_info = document.getElementById('copy_arr_info').checked;
    state.addon_security = document.getElementById('addon_security').checked;
    localStorage.setItem('bluetrip_saved_form', JSON.stringify(state));
}

function restoreFormState() {
    const saved = JSON.parse(localStorage.getItem('bluetrip_saved_form'));
    if (!saved) return;
    if (saved.currentLang) changeLanguage(saved.currentLang);
    document.getElementById('srv_arrival').checked = saved.srv_arrival === 'true' || saved.srv_arrival === true;
    document.getElementById('srv_departure').checked = saved.srv_departure === 'true' || saved.srv_departure === true;
    document.getElementById('copy_arr_info').checked = saved.copy_arr_info === 'true' || saved.copy_arr_info === true;
    document.getElementById('addon_security').checked = saved.addon_security === 'true' || saved.addon_security === true;

    handleServiceToggle(); toggleDepPax();

    ['arr', 'dep'].forEach(type => {
        if(saved[`${type}_location`]) document.getElementById(`${type}_location`).value = saved[`${type}_location`];
        if(saved[`${type}_airline_input`]) document.getElementById(`${type}_airline_input`).value = saved[`${type}_airline_input`];
        if(saved[`${type}_flight_num`]) document.getElementById(`${type}_flight_num`).value = saved[`${type}_flight_num`];
        if(saved[`${type}_date`]) document.getElementById(`${type}_date`).value = saved[`${type}_date`];
        if(saved[`${type}_time`]) document.getElementById(`${type}_time`).value = saved[`${type}_time`];
        if(saved[`${type}_note`]) document.getElementsByName(`${type}_note`)[0].value = saved[`${type}_note`];
        if(type === 'dep' && saved.dep_meet_time) document.getElementById('dep_meet_time').value = saved.dep_meet_time;
        
        ['adult', 'child', 'infant'].forEach(p => {
            if(saved[`${type}_${p}`]) document.getElementById(`${type}_${p}`).value = saved[`${type}_${p}`];
        });
        renderPax(type);
    });

    document.querySelectorAll('#arr_pax_zone input, #arr_pax_zone select, #dep_pax_zone input, #dep_pax_zone select, #contact_email').forEach(el => {
        if(saved[el.name]) el.value = saved[el.name];
    });

    if (saved.currentStep) goToStep(parseInt(saved.currentStep));
}

// CẤU HÌNH NGĂN CHẶN CHỌN NGÀY QUÁ KHỨ (BẢO ĐẢM TỪ HÔM NAY TRỞ ĐI)
function setupMinDateConstraints() {
    const today = new Date();
    today.setHours(today.getHours() + 7); // Áp múi giờ UTC+7 Việt Nam
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const minDate = `${yyyy}-${mm}-${dd}`;
    
    document.getElementById('arr_date')?.setAttribute('min', minDate);
    document.getElementById('dep_date')?.setAttribute('min', minDate);
}

const formElement = document.getElementById('fastTrackForm');
if(formElement) {
    formElement.addEventListener('input', () => { calculateTotalBill(); saveCurrentFormState(); });
    formElement.addEventListener('change', () => { calculateTotalBill(); saveCurrentFormState(); });
    formElement.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> Đang khởi tạo...';
        submitBtn.disabled = true;

        document.getElementById('full_flight_code_arr').value = (flightsData.arr.iata + document.getElementById('arr_flight_num').value).toUpperCase();
        document.getElementById('full_flight_code_dep').value = (flightsData.dep.iata + document.getElementById('dep_flight_num').value).toUpperCase();

        const payload = Object.fromEntries(new FormData(this).entries());
        payload.srv_arrival = document.getElementById('srv_arrival').checked;
        payload.srv_departure = document.getElementById('srv_departure').checked;

        try {
            const response = await fetch('/api/booking', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
            const res = await response.json();
            if(res.success) {
                alert(currentLang === 'vi' ? res.message_vi : res.message_en);
                localStorage.removeItem('bluetrip_saved_form');
                window.location.reload(); 
            } else {
                alert("Xử lý thất bại. Vui lòng thử lại.");
                submitBtn.innerHTML = originalText; submitBtn.disabled = false;
            }
        } catch(e) { 
            alert("Lỗi kết nối máy chủ Resend / MongoDB. Vui lòng kiểm tra API Key."); 
            submitBtn.innerHTML = originalText; submitBtn.disabled = false; 
        }
    });
}

['arr_adult', 'arr_child', 'arr_infant', 'dep_adult', 'dep_child', 'dep_infant'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.addEventListener('change', () => { renderPax(id.split('_')[0]); });
});

['arr', 'dep'].forEach(type => {
    const air = document.getElementById(`${type}_airline_input`);
    const airDrop = document.getElementById(`${type}_airline_dropdown`);
    air.addEventListener('focus', () => { renderAirlineSuggestions(type, air.value.split(' (')[0]); airDrop.classList.remove('hidden'); });
    air.addEventListener('input', () => { flightsData[type].iata = ''; document.getElementById(`${type}_prefix`).textContent = '--'; renderAirlineSuggestions(type, air.value); });
    air.addEventListener('blur', () => { setTimeout(() => airDrop.classList.add('hidden'), 200); });

    const fl = document.getElementById(`${type}_flight_num`);
    const flDrop = document.getElementById(`${type}_flight_dropdown`);
    fl.addEventListener('focus', () => { renderFlightSuggestions(type, fl.value); flDrop.classList.remove('hidden'); });
    fl.addEventListener('input', () => { renderFlightSuggestions(type, fl.value); });
    fl.addEventListener('blur', () => { setTimeout(() => flDrop.classList.add('hidden'), 200); });
});

// KHỞI ĐỘNG HỆ THỐNG
window.onload = async () => {
    isRestoring = true;
    
    setupMinDateConstraints(); 
    handleServiceToggle(); 
    renderPax('arr'); 
    renderPax('dep'); 
    changeLanguage('vi'); 
    restoreFormState();
    
    const path = window.location.pathname;
    const initialPage = path.includes('fasttrack') ? 'fasttrack' : 'home';
    switchPage(initialPage);
    
    isRestoring = false;
};