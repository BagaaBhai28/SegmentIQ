const form = document.querySelector('#profile-form');
const resultCard = document.querySelector('#result-card');
const segmentList = document.querySelector('#segment-list');
const errorBox = document.querySelector('#form-error');
const apiUrl = path => `${(window.SEGMENTIQ_API_BASE || '').replace(/\/$/, '')}${path}`;
const example = {
  Age: 32, City_Tier: 'Tier 1', Employment_Type: 'Salaried', Monthly_Income_INR: 160000,
  Monthly_Expenses_INR: 85000, Savings_Percentage: 46.9, Debt_Status: 'No Debt',
  Monthly_Debt_Payment_INR: 0, Monthly_SIP: 30000, Equity_Allocation_Pct: 70,
  FD_Allocation_Pct: 10, Debt_Allocation_Pct: 20, Investment_Experience_Years: 6,
  Financial_Literacy_Score: 8, Risk_Tolerance_Level: 'High', Primary_Financial_Goal: 'Wealth Accumulation',
};
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const percent = value => `${Math.round(value)}%`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);

function setForm(values) {
  for (const [key, value] of Object.entries(values)) {
    const field = form.elements.namedItem(key);
    if (field) field.value = value;
  }
}

function showSegments(items) {
  segmentList.innerHTML = items.map(item => `
    <div class="segment-item"><span class="segment-swatch" aria-hidden="true"></span>
      <div class="segment-info"><strong>${escapeHtml(item.display_name)}</strong><span>${Math.round(item.share * 100)}% of generated profiles</span></div>
      <span class="segment-count">${item.size.toLocaleString('en-IN')} profiles</span></div>`).join('');
}

function dominantCategory(profile, field) {
  const shares = profile.category_shares?.[field] || {};
  const [value, share] = Object.entries(shares).sort((a, b) => b[1] - a[1])[0] || ['Not available', 0];
  return { value, share };
}

function comparisonRow(label, value, average, formatter, scaleMax) {
  const userWidth = Math.max(3, Math.min(100, value / scaleMax * 100));
  const averageWidth = Math.max(3, Math.min(100, average / scaleMax * 100));
  const gap = value - average;
  const direction = Math.abs(gap) < (scaleMax * .04) ? 'Close to group average' : `${gap > 0 ? 'Above' : 'Below'} group average`;
  return `<div class="compare-row">
    <div class="compare-label"><strong>${label}</strong><span>${direction}</span></div>
    <div class="compare-values"><span>You <b>${formatter(value)}</b></span><span>Group avg. <b>${formatter(average)}</b></span></div>
    <div class="compare-track" aria-label="${label}: your value ${formatter(value)}, group average ${formatter(average)}">
      <span class="compare-bar average-bar" style="width:${averageWidth}%"></span><span class="compare-marker" style="left:${userWidth}%"></span>
    </div>
  </div>`;
}

function showMatch(result, values) {
  const profile = result.cluster_profile;
  const averages = profile.numeric_means;
  const monthlyRemainder = values.Monthly_Income_INR - values.Monthly_Expenses_INR - values.Monthly_Debt_Payment_INR;
  const debtBurden = values.Monthly_Income_INR ? values.Monthly_Debt_Payment_INR / values.Monthly_Income_INR * 100 : 0;
  const sipRate = values.Monthly_Income_INR ? values.Monthly_SIP / values.Monthly_Income_INR * 100 : 0;
  const risk = dominantCategory(profile, 'Risk_Tolerance_Level');
  const goal = dominantCategory(profile, 'Primary_Financial_Goal');
  const debt = dominantCategory(profile, 'Debt_Status');
  const employment = dominantCategory(profile, 'Employment_Type');
  const categories = [
    ['Most common risk comfort', risk.value, risk.share],
    ['Most common goal', goal.value, goal.share],
    ['Most common debt status', debt.value, debt.share],
    ['Most common employment', employment.value, employment.share],
  ];

  resultCard.className = 'panel result-card match-card';
  resultCard.innerHTML = `
    <div class="match-top"><span class="match-kicker">YOUR SIMULATED MATCH</span><span class="cluster-pill">Cluster ${result.cluster_id}</span></div>
    <h2 class="match-name">${escapeHtml(result.segment_name)}</h2>
    <p class="match-subtitle">${Math.round(profile.share * 100)}% of the generated profiles are in this group (${profile.size.toLocaleString('en-IN')} profiles).</p>
    <div class="match-summary"><span class="summary-icon" aria-hidden="true">✳</span><p>Your inputs are closest to the <strong>${escapeHtml(result.segment_name)}</strong> pattern in this model. That is a similarity grouping, not a rating or prediction.</p></div>
    <div class="analysis-tabs" role="tablist" aria-label="Profile analysis sections">
      <button class="analysis-tab is-active" type="button" role="tab" aria-selected="true" aria-controls="analysis-overview" id="tab-overview" data-panel="overview">Your snapshot</button>
      <button class="analysis-tab" type="button" role="tab" aria-selected="false" aria-controls="analysis-compare" id="tab-compare" data-panel="compare">Compare with group</button>
    </div>
    <section id="analysis-overview" class="analysis-panel" role="tabpanel" aria-labelledby="tab-overview">
      <p class="analysis-intro">A quick read of the details you entered</p>
      <div class="insight-grid">
        <article class="insight-tile"><span class="insight-icon">₹</span><div><strong>${money(monthlyRemainder)}</strong><span>Income left after expenses and debt payments</span></div></article>
        <article class="insight-tile"><span class="insight-icon">↗</span><div><strong>${percent(values.Savings_Percentage)}</strong><span>Monthly savings rate you entered</span></div></article>
        <article class="insight-tile"><span class="insight-icon">◌</span><div><strong>${percent(debtBurden)}</strong><span>Debt payments as a share of income</span></div></article>
        <article class="insight-tile"><span class="insight-icon">◎</span><div><strong>${percent(sipRate)}</strong><span>Monthly SIP as a share of income</span></div></article>
      </div>
      <div class="allocation-summary"><div class="allocation-summary-head"><strong>Your portfolio mix</strong><span>100% total</span></div><div class="allocation-bar" role="img" aria-label="Portfolio: ${values.Equity_Allocation_Pct}% equity, ${values.FD_Allocation_Pct}% fixed deposits, ${values.Debt_Allocation_Pct}% debt assets"><span class="alloc-equity" style="width:${values.Equity_Allocation_Pct}%"></span><span class="alloc-fd" style="width:${values.FD_Allocation_Pct}%"></span><span class="alloc-debt" style="width:${values.Debt_Allocation_Pct}%"></span></div><div class="allocation-legend"><span><i class="alloc-equity"></i>Equity ${percent(values.Equity_Allocation_Pct)}</span><span><i class="alloc-fd"></i>FDs ${percent(values.FD_Allocation_Pct)}</span><span><i class="alloc-debt"></i>Debt ${percent(values.Debt_Allocation_Pct)}</span></div></div>
      <div class="profile-tags"><span>${escapeHtml(values.Risk_Tolerance_Level)} risk comfort</span><span>${escapeHtml(values.Primary_Financial_Goal)}</span><span>${escapeHtml(values.Investment_Experience_Years)} yrs experience</span></div>
    </section>
    <section id="analysis-compare" class="analysis-panel" role="tabpanel" aria-labelledby="tab-compare" hidden>
      <p class="analysis-intro">Your values and the average for this simulated group</p>
      <div class="comparison-list">
        ${comparisonRow('Monthly SIP', values.Monthly_SIP, averages.Monthly_SIP, money, Math.max(values.Monthly_SIP, averages.Monthly_SIP, 1) * 1.15)}
        ${comparisonRow('Savings rate', values.Savings_Percentage, averages.Savings_Percentage, percent, 100)}
        ${comparisonRow('Equity allocation', values.Equity_Allocation_Pct, averages.Equity_Allocation_Pct, percent, 100)}
        ${comparisonRow('Financial literacy', values.Financial_Literacy_Score, averages.Financial_Literacy_Score, value => `${value.toFixed(1)} / 10`, 10)}
        ${comparisonRow('Investment experience', values.Investment_Experience_Years, averages.Investment_Experience_Years, value => `${value.toFixed(1)} yrs`, Math.max(values.Investment_Experience_Years, averages.Investment_Experience_Years, 1) * 1.15)}
      </div>
      <div class="group-patterns"><h3>Common patterns in this group</h3><div class="pattern-list">${categories.map(([label, value, share]) => `<div class="pattern-row"><span>${label}</span><strong>${escapeHtml(value)}</strong><span>${Math.round(share * 100)}% of group</span></div>`).join('')}</div></div>
      <p class="distance-note">${escapeHtml(result.distance_note)} A smaller distance means a profile sits nearer the group’s center in the model’s feature space.</p>
    </section>
    <details class="method-details"><summary>How to read this result</summary><p>SegmentIQ compares your entries with patterns learned from generated scenario data. Group averages describe that synthetic sample; they are not benchmarks for real investors. ${escapeHtml(result.disclaimer)}</p></details>`;

  resultCard.querySelectorAll('.analysis-tab').forEach(tab => tab.addEventListener('click', () => {
    resultCard.querySelectorAll('.analysis-tab').forEach(item => {
      const selected = item === tab;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    resultCard.querySelectorAll('.analysis-panel').forEach(panel => { panel.hidden = panel.id !== `analysis-${tab.dataset.panel}`; });
  }));
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
  button.querySelector('span:first-child').textContent = 'Analysing your profile…';
  try {
    const response = await fetch(apiUrl('/predict'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.detail || 'Could not create a profile analysis.');
    showMatch(result, data);
  } catch (error) {
    errorBox.textContent = error.message || 'The service is unavailable. Please try again.';
    errorBox.hidden = false;
  } finally {
    button.disabled = false;
    button.querySelector('span:first-child').textContent = 'Explore my segment';
  }
});

fetch(apiUrl('/segments')).then(response => {
  if (!response.ok) throw new Error('Could not load groups.');
  return response.json();
}).then(data => showSegments(data.segments)).catch(() => {
  segmentList.innerHTML = '<p class="loading">Groups are unavailable until the model is trained.</p>';
});

