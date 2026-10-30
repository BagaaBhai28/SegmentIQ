const form = document.querySelector('#profile-form');
const resultCard = document.querySelector('#result-card');
const segmentList = document.querySelector('#segment-list');
const errorBox = document.querySelector('#form-error');
const example = {
  Age: 32, City_Tier: 'Tier 1', Employment_Type: 'Salaried', Monthly_Income_INR: 160000,
  Monthly_Expenses_INR: 85000, Savings_Percentage: 46.9, Debt_Status: 'No Debt',
  Monthly_Debt_Payment_INR: 0, Monthly_SIP: 30000, Equity_Allocation_Pct: 70,
  FD_Allocation_Pct: 10, Debt_Allocation_Pct: 20, Investment_Experience_Years: 6,
  Financial_Literacy_Score: 8, Risk_Tolerance_Level: 'High', Primary_Financial_Goal: 'Wealth Accumulation',
};
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

function setForm(values) {
  for (const [key, value] of Object.entries(values)) {
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  }
}

function showSegments(items) {
  segmentList.innerHTML = items.map(item => `
    <div class="segment-item"><span class="segment-swatch" aria-hidden="true"></span>
      <div class="segment-info"><strong>${item.display_name}</strong><span>${Math.round(item.share * 100)}% of generated profiles</span></div>
      <span class="segment-count">${item.size.toLocaleString('en-IN')} profiles</span></div>`).join('');
}

function showMatch(result) {
  const profile = result.cluster_profile;
  resultCard.className = 'panel result-card match-card';
  resultCard.innerHTML = `
    <div class="match-top"><span class="match-kicker">CLOSEST SIMULATED GROUP</span><span class="cluster-pill">Cluster ${result.cluster_id}</span></div>
    <h2 class="match-name">${result.segment_name}</h2>
    <p class="match-subtitle">${Math.round(profile.share * 100)}% of the generated profiles are in this group.</p>
    <div class="stat-row">
      <div class="stat"><strong>${money(profile.numeric_means.Monthly_SIP)}</strong><span>Typical monthly SIP</span></div>
      <div class="stat"><strong>${Math.round(profile.numeric_means.Equity_Allocation_Pct)}%</strong><span>Typical equity share</span></div>
      <div class="stat"><strong>${Math.round(profile.numeric_means.Age)}</strong><span>Typical age</span></div>
    </div><p class="result-note">${result.disclaimer}</p>`;
}

document.querySelector('#fill-example').addEventListener('click', () => setForm(example));
form.addEventListener('submit', async event => {
  event.preventDefault();
  errorBox.hidden = true;
  const data = Object.fromEntries(new FormData(form).entries());
  const numeric = ['Age','Monthly_Income_INR','Monthly_Expenses_INR','Savings_Percentage','Monthly_Debt_Payment_INR','Monthly_SIP','Equity_Allocation_Pct','FD_Allocation_Pct','Debt_Allocation_Pct','Investment_Experience_Years','Financial_Literacy_Score'];
  for (const field of numeric) data[field] = Number(data[field]);
  const allocation = data.Equity_Allocation_Pct + data.FD_Allocation_Pct + data.Debt_Allocation_Pct;
  if (Math.abs(allocation - 100) > .5) {
    errorBox.textContent = 'Please adjust the portfolio allocations so they total 100%.';
    errorBox.hidden = false;
    return;
  }
  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  button.querySelector('span:first-child').textContent = 'Finding a match…';
  try {
    const response = await fetch('/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Could not create a profile match.');
    showMatch(result);
  } catch (error) {
    errorBox.textContent = error.message || 'The service is unavailable. Please try again.';
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.querySelector('span:first-child').textContent = 'Explore my segment';
  }
});

fetch('/segments').then(response => {
  if (!response.ok) throw new Error('Could not load groups.');
  return response.json();
}).then(data => showSegments(data.segments)).catch(() => {
  segmentList.innerHTML = '<p class="loading">Groups are unavailable until the model is trained.</p>';
});
