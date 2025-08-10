
/* ------------------ Nav highlight ------------------ */
(function(){
  const links = document.querySelectorAll('.nav a');
  const here = location.pathname.split('/').pop() || 'index.html';
  links.forEach(a => {
    const file = a.getAttribute('href');
    if (file === here) {
      a.setAttribute('aria-current','page');
      a.style.color = 'var(--brand)';
      a.style.fontWeight = '600';
    }
  });
})();

/* ------------- Car selection (cars.html) ------------ */
function selectCar(carName, ratePerDay) {
  localStorage.setItem('selectedCar', JSON.stringify({ name: carName, rate: Number(ratePerDay) }));
  alert(`You selected the ${carName}. Proceed to booking.`);
  window.location.href = 'booking.html';
}

// Event delegation so buttons work even if DOM changes
document.addEventListener('click', (e) => {
  const btn = e.target.closest('.add-to-booking');
  if (!btn) return;
  const car = btn.dataset.car;
  const rate = btn.dataset.rate;
  if (!car || !rate) {
    alert('Missing car info on this button.');
    return;
  }
  selectCar(car, rate);
});

/* ---------------- Rentals helpers (shared) ---------------- */
function getRentals(){ return JSON.parse(localStorage.getItem('rentals') || '[]'); }
function saveRentals(r){ localStorage.setItem('rentals', JSON.stringify(r)); }
function rentalCard(r, innerContentHtml){
  return `
    <article class="car-card">
      <div style="padding:16px">
        <h3>${r.car}</h3>
        <p class="meta">
          <span class="price-badge">${r.plan}</span>
          · <strong>${r.start}</strong> → <strong>${r.end}</strong>
        </p>
        ${innerContentHtml}
      </div>
    </article>
  `;
}

/* ---------------- Booking page (booking.html) ---------------- */
(function(){
  const form = document.getElementById('bookingForm');
  if (!form) return; // not on booking page

  const carSelect = document.getElementById('car');
  const plan = document.getElementById('plan');
  const start = document.getElementById('start');
  const end = document.getElementById('end');
  const output = document.getElementById('price');
  const calcBtn = document.getElementById('calc');

  // Prefill selected car (from cars.html)
  (function(){
    const saved = localStorage.getItem('selectedCar');
    if(saved){
      const { name, rate } = JSON.parse(saved);
      [...carSelect.options].forEach(opt => { if(opt.value === name){ opt.selected = true; } });
      carSelect.dataset.rate = rate; // fallback if option lacks data-rate
    }
  })();

  function daysBetween(a,b){ const MS = 1000*60*60*24; return Math.max(1, Math.round((b - a)/MS)); }
  function getSelectedRate(){
    const opt = carSelect.options[carSelect.selectedIndex];
    const base = Number(opt?.dataset.rate || carSelect.dataset.rate || 0);
    if (plan.value === 'daily')   return base;
    if (plan.value === 'weekly')  return Math.round((base*7)*0.81);  
    if (plan.value === 'monthly') return Math.round((base*30)*0.65);  
    return base;
  }

  function calcPrice(){
    if(!carSelect.value){ output.textContent = 'Select a car first.'; return; }
    const s = new Date(start.value);
    const e = new Date(end.value);
    if(isNaN(s) || isNaN(e)){ output.textContent = 'Pick start and end dates.'; return; }
    if(e < s){ output.textContent = 'End date must be after start date.'; return; }

    const days = daysBetween(s,e);
    const r = getSelectedRate();

    let total = 0;
    if(plan.value === 'daily')   total = r * days;
    if(plan.value === 'weekly')  total = r * Math.ceil(days/7);
    if(plan.value === 'monthly') total = r * Math.ceil(days/30);

    output.textContent = `Estimated price: $${total.toLocaleString()} (${plan.value}, ${days} day(s))`;
    return { total, days };
  }

  if (calcBtn) calcBtn.addEventListener('click', calcPrice);

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const estimate = calcPrice();
    if(!estimate){ alert('Please complete the form and calculate price.'); return; }

    // Demo "payment" check
    const cardNumber = document.getElementById('cardNumber').value.replace(/\s+/g,'');
    const cvv = document.getElementById('cvv').value;
    if(cardNumber.length < 12 || cvv.length < 3){
      alert('Please enter a valid card number and CVV.');
      return;
    }

    const payload = {
      car: carSelect.value,
      plan: plan.value,
      start: start.value,
      end: end.value,
      pickup: document.getElementById('pickup').value,
      returnLoc: document.getElementById('returnLoc').value,
      total: estimate.total
    };

    // Keep old confirmation behavior
    localStorage.setItem('booking', JSON.stringify(payload));

    // Create a rental record for workflow (customer-only demo)
    const rentals = getRentals();
    const id = Math.random().toString(36).slice(2,10).toUpperCase();
    const rental = {
      id,
      customerName: document.getElementById('cardName').value || 'Guest',
      car: payload.car,
      plan: payload.plan,
      start: payload.start,
      end: payload.end,
      pickup: payload.pickup,
      returnLoc: payload.returnLoc || '',
      baseTotal: payload.total,      // rental cost before any damage
      damageFee: 0,
      finalTotal: payload.total,     // equals baseTotal in customer-only flow
      status: 'Reserved',            // customer flow may stop here, or they can "Return"
      createdAt: Date.now()
    };
    rentals.push(rental);
    saveRentals(rentals);

    window.location.href = 'confirmation.html';
  });
})();

/* --------------- Confirmation page --------------- */
(function(){
  const card = document.getElementById('bookingSummary');
  if (!card) return;
  try {
    const data = JSON.parse(localStorage.getItem('booking') || '{}');
    if(!data.car){ card.textContent = 'No booking found.'; return; }
    const ref = Math.random().toString(36).slice(2,10).toUpperCase();
    card.innerHTML = `
      <p><strong>Reference:</strong> ${ref}</p>
      <p><strong>Car:</strong> ${data.car}</p>
      <p><strong>Plan:</strong> ${data.plan}</p>
      <p><strong>Start:</strong> ${data.start}</p>
      <p><strong>End:</strong> ${data.end}</p>
      <p><strong>Pickup:</strong> ${data.pickup}</p>
      <p><strong>Return:</strong> ${data.returnLoc}</p>
      <p><strong>Total:</strong> $${(data.total||0).toLocaleString()}</p>
    `;
  } catch(e){
    card.textContent = 'Unable to load booking.';
  }
})();

/* ------------------ Login page ------------------ */
(function(){
  const form = document.getElementById('loginForm');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value.trim();
    if(!u || !p){ alert('Username and password are required'); return; }
    localStorage.setItem('user', JSON.stringify({ username: u, ts: Date.now() }));
    alert('Login successful!');
    window.location.href = 'index.html';
  });
})();

/* ------------- Customer Return page (return.html) ------------- */
(function(){
  const panel = document.getElementById('returnPanel') || document.getElementById('returnList');
  if (!panel) return; // not on return page

  const all = getRentals();
  // Show most recent active rental 
  const active = all
    .filter(r => r.status === 'Reserved' || r.status === 'Rented' || r.status === 'Returned (submitted)')
    .sort((a,b) => (b.createdAt||0) - (a.createdAt||0));

  if (active.length === 0) {
    panel.innerHTML = `
      <article class="card">
        <h3>No active bookings</h3>
        <p class="muted">Once your trip ends, come back here to upload your return photos.</p>
        <a href="booking.html" class="btn mt-2">Make a Booking</a>
      </article>
    `;
    return;
  }

  const r = active[0];

  // Auto “Rent Out” if still Reserved (simulates office handover)
  if (r.status === 'Reserved') {
    const idxRO = all.findIndex(x => x.id === r.id);
    if (idxRO >= 0) {
      all[idxRO].status = 'Rented';
      saveRentals(all);
    }
  }

  panel.innerHTML = rentalCard(r, `
    <label class="muted" style="display:block;margin:8px 0 6px">Return Location</label>
    <select id="retLoc" style="margin-bottom:12px">
      <option value="Downtown Car Park A">Downtown Car Park A</option>
      <option value="East Car Park B">East Car Park B</option>
    </select>

    <div class="uploader">
      <strong>Upload Photos</strong>
      <p class="hint">Up to 6 images. Please include front, back, sides, interior, and any areas of concern.</p>
      <input type="file" accept="image/*" multiple id="retPhotos">
      <div class="previews" id="retPreviews"></div>
    </div>

    <div class="totals" style="margin-top:12px">
      <button class="btn" id="submitReturn">Upload & Submit Return</button>
    </div>
  `);

  // Previews
  const fileInput = document.getElementById('retPhotos');
  const preview = document.getElementById('retPreviews');
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files || []);
    preview.innerHTML = '';
    const max = Math.min(files.length, 6);
    for (let i=0; i<max; i++){
      const url = URL.createObjectURL(files[i]);
      const img = document.createElement('img');
      img.src = url;
      img.alt = `Upload preview ${i+1}`;
      preview.appendChild(img);
    }
  });

  // Convert files → data URLs for localStorage (demo only)
  function filesToDataURLs(files, limit = 6){
    const slice = Array.from(files || []).slice(0, limit);
    return Promise.all(slice.map(file => new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result); // data URL
      reader.onerror = reject;
      reader.readAsDataURL(file);
    })));
  }

  // Submit return → auto-inspect OK (damage $0) → go to billing
  document.getElementById('submitReturn').addEventListener('click', async () => {
    const returnLoc = document.getElementById('retLoc').value;
    const files = fileInput.files;

    if (!files || files.length === 0) {
      if (!confirm('No photos selected. Submit return without photos?')) return;
    }

    try {
      const photos = await filesToDataURLs(files, 6);
      const allNow = getRentals();
      const idx = allNow.findIndex(x => x.id === r.id);
      if (idx < 0) { alert('Booking not found.'); return; }

      // Save return + auto inspection (damage = $0)
      allNow[idx].returnLoc      = returnLoc;
      allNow[idx].imagesReturned = photos;
      allNow[idx].returnedAt     = Date.now();
      allNow[idx].damageFee      = 0;
      allNow[idx].finalTotal     = (allNow[idx].baseTotal || 0) + (allNow[idx].damageFee || 0);
      allNow[idx].status         = 'Inspected'; // inspection auto-passed for demo

      saveRentals(allNow);

      // Pass the rental id to billing
      localStorage.setItem('lastBillingId', r.id);

      // Go to final billing
      window.location.href = 'billing.html';
    } catch (err){
      console.error(err);
      alert('Upload failed. Please try again.');
    }
  });
})();

/* ---------------- Final Billing page (billing.html) ---------------- */
(function(){
  const wrap = document.getElementById('billingCard');
  if (!wrap) return; // not on billing page

  const rentals = getRentals();

  // Try URL param first, else use the stored last id
  const params = new URLSearchParams(location.search);
  const idFromUrl = params.get('id');
  const id = idFromUrl || localStorage.getItem('lastBillingId');

  const rental = rentals.find(r => r.id === id) || rentals.sort((a,b)=> (b.createdAt||0)-(a.createdAt||0))[0];

  if (!rental) {
    wrap.innerHTML = `
      <article class="card">
        <h3>No bill found</h3>
        <p class="muted">We couldn’t find a recent rental to bill.</p>
        <a class="btn mt-2" href="index.html">Back to Home</a>
      </article>
    `;
    return;
  }

  // If not inspected yet, show waiting state
  if (rental.status !== 'Inspected' && rental.status !== 'Billed') {
    wrap.innerHTML = `
      <article class="card">
        <h3>Preparing your bill</h3>
        <p class="muted">Please wait a moment and refresh this page.</p>
      </article>
    `;
    return;
  }

  const base  = rental.baseTotal || 0;
  const dmg   = rental.damageFee || 0;
  const total = rental.finalTotal != null ? rental.finalTotal : (base + dmg);
  const paid  = rental.status === 'Billed';

  wrap.innerHTML = `
    <article class="car-card">
      <div style="padding:16px">
        <h3>Rental: ${rental.car}</h3>
        <p class="meta">
          <span class="price-badge">${rental.plan}</span>
          · <strong>${rental.start}</strong> → <strong>${rental.end}</strong>
        </p>
        <p class="muted">Ref: ${rental.id}</p>
        <div class="form" style="box-shadow:none;border:0;padding:0;margin-top:10px">
          <p><strong>Base rental:</strong> $${base.toLocaleString()}</p>
          <p><strong>Damage fee:</strong> $${dmg.toLocaleString()}</p>
          <p><strong>Final total:</strong> $${total.toLocaleString()}</p>
        </div>
        ${paid ? `
          <div class="card" style="margin-top:10px">
            <p><strong>Payment Status:</strong> Paid</p>
            <p><strong>Receipt:</strong> ${rental.receiptRef || '—'}</p>
            <a class="btn mt-2" href="index.html">Back to Home</a>
          </div>
        ` : `
          <button class="btn" id="confirmPay">Confirm Final Payment</button>
        `}
      </div>
    </article>
  `;

  // Handle confirm payment
  const payBtn = document.getElementById('confirmPay');
  if (payBtn) {
    payBtn.addEventListener('click', () => {
      const all = getRentals();
      const idx = all.findIndex(x => x.id === rental.id);
      if (idx < 0) return;

      all[idx].status     = 'Billed';
      all[idx].paidAt     = Date.now();
      all[idx].receiptRef = (Math.random().toString(36).slice(2,10) + Date.now().toString(36)).toUpperCase();
      saveRentals(all);

      // Re-render as paid
      location.reload();
    });
  }
})();
