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

function comparisonRow(label, value, average, formatter, scaleMax, unit = '') {
  const safeScale = Math.max(Number(scaleMax) || 1, 1);
  const userWidth = Math.max(1, Math.min(100, value / safeScale * 100));
  const averageWidth = Math.max(1, Math.min(100, average / safeScale * 100));
  const gap = value - average;
  const isPercentage = label.toLowerCase().includes('allocation') || label.toLowerCase().includes('rate');
  const threshold = isPercentage ? 3 : Math.max(Math.abs(average) * .05, 1);
  const direction = Math.abs(gap) <= threshold ? 'Near the group average' : `${gap > 0 ? 'Above' : 'Below'} group average`;
  const difference = isPercentage ? `${Math.abs(gap).toFixed(1)} percentage points` : `${formatter(Math.abs(gap))}${unit ? ` ${unit}` : ''}`;
  return `<div class="compare-row">
    <div class="compare-label"><strong>${escapeHtml(label)}</strong><span>${direction}</span></div>
    <div class="compare-values"><span>You <b>${formatter(value)}</b></span><span>Group avg. <b>${formatter(average)}</b></span></div>
    <div class="compare-track" role="img" aria-label="${escapeHtml(label)}: you ${formatter(value)}, group average ${formatter(average)}">
      <span class="compare-bar average-bar" style="width:${averageWidth}%"></span><span class="compare-marker" style="left:${userWidth}%"></span>
    </div><p class="compare-caption">${Math.abs(gap) <= threshold ? 'This is close to the simulated group average.' : `You are ${difference} ${gap > 0 ? 'higher' : 'lower'} than the simulated group average.`}</p>
  </div>`;
}

function commonPatternRows(profile) {
  const labels = {
    City_Tier: 'Most common city tier', Employment_Type: 'Most common employment',
    Debt_Status: 'Most common debt status', Risk_Tolerance_Level: 'Most common risk comfort',
    Primary_Financial_Goal: 'Most common goal',
  };
  return Object.entries(labels).map(([key, label]) => {
    const item = dominantCategory(profile, key);
    return `<div class="pattern-row"><span>${label}</span><strong>${escapeHtml(item.value)}</strong><span>${percent(item.share * 100)} of group</span><div class="pattern-track"><span style="width:${Math.max(0, Math.min(100, item.share * 100))}%"></span></div></div>`;
  }).join('');
}

function numericComparisonNarrative(values, means) {
  const comparisons = [
    { label: 'monthly SIP', value: values.Monthly_SIP, average: means.Monthly_SIP, format: money },
    { label: 'savings rate', value: values.Savings_Percentage, average: means.Savings_Percentage, format: percent },
    { label: 'equity allocation', value: values.Equity_Allocation_Pct, average: means.Equity_Allocation_Pct, format: percent },
    { label: 'monthly income', value: values.Monthly_Income_INR, average: means.Monthly_Income_INR, format: money },
    { label: 'investment experience', value: values.Investment_Experience_Years, average: means.Investment_Experience_Years, format: value => `${value.toFixed(1)} years` },
  ].map(item => ({ ...item, relativeGap: Math.abs(item.value - item.average) / Math.max(Math.abs(item.average), 1) }));
  const strongest = comparisons.sort((a, b) => b.relativeGap - a.relativeGap).slice(0, 2);
  if (!strongest.length) return 'Your profile has been assigned to the closest group in the model.';
  return strongest.map(item => {
    const difference = item.value - item.average;
    if (Math.abs(difference) < Math.max(Math.abs(item.average) * .05, 1)) {
      return `Your ${item.label} is close to this group’s average (${item.format(item.average)}).`;
    }
    return `Your ${item.label} is ${item.format(Math.abs(difference))} ${difference > 0 ? 'above' : 'below'} this group’s average (${item.format(item.average)}).`;
  }).join(' ');
}

function readoutForProfile(values, monthlyRemainder, debtBurden, sipRate) {
  const cashText = monthlyRemainder < 0
    ? `The entered expenses and debt payments exceed income by ${money(Math.abs(monthlyRemainder))} per month.`
    : `After entered expenses and debt payments, about ${money(monthlyRemainder)} remains each month.`;
  const savingsText = values.Savings_Percentage >= 30
    ? `The entered savings rate of ${percent(values.Savings_Percentage)} is a substantial share of income in this profile.`
    : values.Savings_Percentage >= 15
      ? `The entered savings rate is ${percent(values.Savings_Percentage)} of income.`
      : `The entered savings rate is ${percent(values.Savings_Percentage)} of income, so the profile reports a smaller monthly savings share.`;
  const debtText = debtBurden === 0
    ? 'No monthly debt payment is included in the profile.'
    : `Debt payments use ${percent(debtBurden)} of monthly income${debtBurden >= 30 ? ', a relatively large cash-flow commitment in this profile' : debtBurden >= 15 ? ', a noticeable part of monthly cash flow' : ', a smaller part of monthly cash flow'}.`;
  const sipText = sipRate >= 15
    ? `The SIP amount equals ${percent(sipRate)} of monthly income, a high contribution relative to this profile’s income.`
    : sipRate >= 5
      ? `The SIP amount equals ${percent(sipRate)} of monthly income.`
      : `The SIP amount equals ${percent(sipRate)} of monthly income, a modest contribution relative to this profile’s income.`;
  const allocationStyle = values.Equity_Allocation_Pct >= 60
    ? 'Your entered portfolio is equity-heavy.'
    : values.Equity_Allocation_Pct >= 30
      ? 'Your entered portfolio has a mixed equity and fixed-income allocation.'
      : 'Your entered portfolio has a smaller equity allocation and larger fixed-income share.';
  return [cashText, savingsText, debtText, sipText, `${allocationStyle} Your selected risk comfort is ${values.Risk_Tolerance_Level.toLowerCase()} and your stated primary goal is ${values.Primary_Financial_Goal.toLowerCase()}.`];
}

function investmentCheck(values) {
  const income = values.Monthly_Income_INR;
  const postCosts = income - values.Monthly_Expenses_INR - values.Monthly_Debt_Payment_INR;
  const postSip = postCosts - values.Monthly_SIP;
  const sipRate = income ? values.Monthly_SIP / income * 100 : 0;
  const allocations = [
    ['Equity', values.Equity_Allocation_Pct],
    ['fixed deposits', values.FD_Allocation_Pct],
    ['debt assets', values.Debt_Allocation_Pct],
  ].sort((a, b) => b[1] - a[1]);
  const [largestAsset, largestShare] = allocations[0];
  let cashStatus;
  let cashTone;
  let cashText;
  if (postCosts < 0) {
    cashStatus = 'Costs exceed income';
    cashTone = 'attention';
    cashText = `Entered expenses and debt payments exceed income by ${money(Math.abs(postCosts))} before the SIP. The profile alone cannot establish whether the contribution is sustainable.`;
  } else if (values.Monthly_SIP > postCosts) {
    cashStatus = 'SIP exceeds estimated balance';
    cashTone = 'attention';
    cashText = `The SIP is ${money(values.Monthly_SIP - postCosts)} more than the balance left after entered expenses and debt. Check whether other income or cash reserves fund the difference.`;
  } else if (postCosts > 0 && values.Monthly_SIP / postCosts >= .7) {
    cashStatus = 'Uses most of estimated balance';
    cashTone = 'review';
    cashText = `The SIP uses ${percent(values.Monthly_SIP / postCosts * 100)} of the balance left after entered expenses and debt. This is a cash-flow observation, not a judgement about the SIP.`;
  } else {
    cashStatus = 'Within estimated balance';
    cashTone = 'positive';
    cashText = `The SIP fits within the balance left after entered expenses and debt, leaving about ${money(postSip)} in this simplified monthly estimate.`;
  }

  const equity = values.Equity_Allocation_Pct;
  const risk = values.Risk_Tolerance_Level;
  const riskMismatch = (risk === 'Low' && equity >= 60)
    || (risk === 'High' && equity < 30)
    || (risk === 'Medium' && (equity < 10 || equity >= 85));
  const riskText = riskMismatch
    ? `You selected ${risk.toLowerCase()} risk comfort and entered ${percent(equity)} equity. These inputs point in different directions; the form does not assess suitability or your ability to absorb losses.`
    : `You selected ${risk.toLowerCase()} risk comfort and entered ${percent(equity)} equity. These inputs point in a similar direction, but that alone does not establish suitability.`;

  const concentrationText = largestShare >= 80
    ? `${percent(largestShare)} is in ${largestAsset}, so the entered allocation is concentrated in one of these three broad buckets.`
    : `${largestAsset} is the largest entered bucket at ${percent(largestShare)}. The form only shows broad categories, not the individual funds, securities, or deposits inside them.`;
  return {
    postCosts,
    postSip,
    sipRate,
    checks: [
      { title: 'Contribution and monthly balance', status: cashStatus, tone: cashTone, text: cashText },
      { title: 'Allocation and stated risk comfort', status: riskMismatch ? 'Worth reviewing' : 'Inputs broadly align', tone: riskMismatch ? 'review' : 'neutral', text: riskText },
      { title: 'Mix across broad asset buckets', status: largestShare >= 80 ? 'Highly concentrated' : 'Spread across buckets', tone: largestShare >= 80 ? 'review' : 'neutral', text: concentrationText },
      { title: 'Goal and time horizon', status: escapeHtml(values.Primary_Financial_Goal), tone: 'neutral', text: 'A goal is recorded, but no target date or time horizon is collected, so this profile cannot tell whether the current allocation fits when the money is needed.' },
    ],
  };
}

function showMatch(result, values) {
  const profile = result.cluster_profile;
  const averages = profile.numeric_means;
  const monthlyRemainder = values.Monthly_Income_INR - values.Monthly_Expenses_INR - values.Monthly_Debt_Payment_INR;
  const debtBurden = values.Monthly_Income_INR ? values.Monthly_Debt_Payment_INR / values.Monthly_Income_INR * 100 : 0;
  const sipRate = values.Monthly_Income_INR ? values.Monthly_SIP / values.Monthly_Income_INR * 100 : 0;
  const readout = readoutForProfile(values, monthlyRemainder, debtBurden, sipRate);
  const investment = investmentCheck(values);
  const categories = [
    ['Monthly income', values.Monthly_Income_INR, averages.Monthly_Income_INR, money, Math.max(values.Monthly_Income_INR, averages.Monthly_Income_INR, 1) * 1.1],
    ['Monthly expenses', values.Monthly_Expenses_INR, averages.Monthly_Expenses_INR, money, Math.max(values.Monthly_Expenses_INR, averages.Monthly_Expenses_INR, 1) * 1.1],
    ['Monthly debt payment', values.Monthly_Debt_Payment_INR, averages.Monthly_Debt_Payment_INR, money, Math.max(values.Monthly_Debt_Payment_INR, averages.Monthly_Debt_Payment_INR, 1) * 1.1],
    ['Monthly SIP', values.Monthly_SIP, averages.Monthly_SIP, money, Math.max(values.Monthly_SIP, averages.Monthly_SIP, 1) * 1.1],
    ['Savings rate', values.Savings_Percentage, averages.Savings_Percentage, percent, 100],
    ['Equity allocation', values.Equity_Allocation_Pct, averages.Equity_Allocation_Pct, percent, 100],
    ['FD allocation', values.FD_Allocation_Pct, averages.FD_Allocation_Pct, percent, 100],
    ['Debt allocation', values.Debt_Allocation_Pct, averages.Debt_Allocation_Pct, percent, 100],
    ['Age', values.Age, averages.Age, value => `${Math.round(value)} years`, 100],
    ['Financial literacy', values.Financial_Literacy_Score, averages.Financial_Literacy_Score, value => `${value.toFixed(1)} / 10`, 10],
    ['Investment experience', values.Investment_Experience_Years, averages.Investment_Experience_Years, value => `${value.toFixed(1)} years`, 82],
  ];

  resultCard.className = 'panel result-card match-card';
  resultCard.innerHTML = `
    <div class="match-top"><span class="match-kicker">YOUR SIMULATED MATCH</span><span class="cluster-pill">Cluster ${result.cluster_id} · 4 groups</span></div>
    <h2 class="match-name">${escapeHtml(result.segment_name)}</h2>
    <p class="match-subtitle">${percent(profile.share * 100)} of the generated profiles are in this group (${profile.size.toLocaleString('en-IN')} profiles).</p>
    <div class="match-summary"><span class="summary-icon" aria-hidden="true">✳</span><div><strong>Why this group?</strong><p>The model compares your complete profile with learned patterns and assigns the nearest group. ${escapeHtml(numericComparisonNarrative(values, averages))}</p><p class="model-caveat">These comparisons describe the group; they do not reveal causal factors or imply that one profile is better.</p></div></div>
    <div class="analysis-tabs" role="tablist" aria-label="Profile analysis sections">
      <button class="analysis-tab is-active" type="button" role="tab" aria-selected="true" aria-controls="analysis-overview" id="tab-overview" data-panel="overview">Profile readout</button>
      <button class="analysis-tab" type="button" role="tab" aria-selected="false" aria-controls="analysis-investment" id="tab-investment" data-panel="investment">Investment check-in</button>
      <button class="analysis-tab" type="button" role="tab" aria-selected="false" aria-controls="analysis-compare" id="tab-compare" data-panel="compare">Compare values</button>
      <button class="analysis-tab" type="button" role="tab" aria-selected="false" aria-controls="analysis-group" id="tab-group" data-panel="group">Group makeup</button>
    </div>
    <section id="analysis-overview" class="analysis-panel" role="tabpanel" aria-labelledby="tab-overview" tabindex="0">
      <p class="analysis-intro">A plain-language reading of the values you entered</p>
      <div class="insight-grid">
        <article class="insight-tile"><span class="insight-icon">₹</span><div><strong>${money(monthlyRemainder)}</strong><span>Monthly income remaining after entered expenses and debt</span></div></article>
        <article class="insight-tile"><span class="insight-icon">↗</span><div><strong>${percent(values.Savings_Percentage)}</strong><span>Reported monthly savings rate</span></div></article>
        <article class="insight-tile"><span class="insight-icon">◌</span><div><strong>${percent(debtBurden)}</strong><span>Debt payments as a share of income</span></div></article>
        <article class="insight-tile"><span class="insight-icon">◎</span><div><strong>${percent(sipRate)}</strong><span>Monthly SIP as a share of income</span></div></article>
      </div>
      <div class="narrative-list">${readout.map((text, index) => `<p><span>${index + 1}</span>${escapeHtml(text)}</p>`).join('')}</div>
      <div class="allocation-summary"><div class="allocation-summary-head"><strong>Your portfolio mix</strong><span>100% total</span></div><div class="allocation-bar" role="img" aria-label="Portfolio: ${values.Equity_Allocation_Pct}% equity, ${values.FD_Allocation_Pct}% fixed deposits, ${values.Debt_Allocation_Pct}% debt assets"><span class="alloc-equity" style="width:${values.Equity_Allocation_Pct}%"></span><span class="alloc-fd" style="width:${values.FD_Allocation_Pct}%"></span><span class="alloc-debt" style="width:${values.Debt_Allocation_Pct}%"></span></div><div class="allocation-legend"><span><i class="alloc-equity"></i>Equity ${percent(values.Equity_Allocation_Pct)}</span><span><i class="alloc-fd"></i>FDs ${percent(values.FD_Allocation_Pct)}</span><span><i class="alloc-debt"></i>Debt ${percent(values.Debt_Allocation_Pct)}</span></div></div>
      <div class="profile-tags"><span>${escapeHtml(values.Risk_Tolerance_Level)} risk comfort</span><span>${escapeHtml(values.Primary_Financial_Goal)}</span><span>${values.Investment_Experience_Years} yrs experience</span></div>
    </section>
    <section id="analysis-investment" class="analysis-panel" role="tabpanel" aria-labelledby="tab-investment" tabindex="0" hidden>
      <p class="analysis-intro">A check-in based on your reported monthly cash flow, SIP, and broad asset allocation</p>
      <div class="investment-metrics">
        <article><span>Monthly SIP</span><strong>${money(values.Monthly_SIP)}</strong><small>${percent(investment.sipRate)} of entered income</small></article>
        <article><span>Balance before SIP</span><strong>${money(investment.postCosts)}</strong><small>Income minus expenses and debt</small></article>
        <article><span>Balance after SIP</span><strong>${money(investment.postSip)}</strong><small>Simplified monthly estimate</small></article>
      </div>
      <div class="investment-check-grid">${investment.checks.map(check => `<article class="investment-check ${check.tone}"><div><h3>${escapeHtml(check.title)}</h3><span class="check-status">${check.status}</span></div><p>${escapeHtml(check.text)}</p></article>`).join('')}</div>
      <div class="performance-limits"><span class="limits-icon" aria-hidden="true">i</span><div><strong>Can this tell whether your investments are gaining or losing?</strong><p>No. This profile has no current portfolio value, purchase history, returns, fees, or benchmark. It can describe contributions and stated allocation, but it cannot measure performance or say whether you are on track.</p></div></div>
    </section>
    <section id="analysis-compare" class="analysis-panel" role="tabpanel" aria-labelledby="tab-compare" tabindex="0" hidden>
      <p class="analysis-intro">The marker is your value; the shaded bar is this group’s mean. All figures come from the synthetic sample.</p>
      <div class="comparison-list">${categories.map(([label, value, average, formatter, scale]) => comparisonRow(label, value, average, formatter, scale)).join('')}</div>
      <p class="distance-note">${escapeHtml(result.distance_note)} It describes distance from the assigned group center in standardized feature space, not probability, confidence, or profile quality.</p>
    </section>
    <section id="analysis-group" class="analysis-panel" role="tabpanel" aria-labelledby="tab-group" tabindex="0" hidden>
      <p class="analysis-intro">Most frequent categories among the ${profile.size.toLocaleString('en-IN')} synthetic profiles in this group</p>
      <div class="group-patterns"><div class="pattern-list">${commonPatternRows(profile)}</div></div>
      <div class="group-averages"><h3>Typical numeric profile</h3><div class="group-average-grid">
        <p><span>Age</span><strong>${Math.round(averages.Age)} years</strong></p><p><span>Monthly income</span><strong>${money(averages.Monthly_Income_INR)}</strong></p>
        <p><span>Monthly SIP</span><strong>${money(averages.Monthly_SIP)}</strong></p><p><span>Equity allocation</span><strong>${percent(averages.Equity_Allocation_Pct)}</strong></p>
        <p><span>FD allocation</span><strong>${percent(averages.FD_Allocation_Pct)}</strong></p><p><span>Financial literacy</span><strong>${averages.Financial_Literacy_Score.toFixed(1)} / 10</strong></p>
      </div></div>
    </section>
    <details class="method-details"><summary>How to read this result</summary><p>Cluster numbers are identifiers, not ranks. The model assigns the profile to the closest learned cluster using the submitted demographic, cash-flow, investing, and preference fields together. Group averages and category shares describe generated scenario data only; they are not benchmarks for real investors. ${escapeHtml(result.disclaimer)}</p></details>`;

  const tabs = [...resultCard.querySelectorAll('.analysis-tab')];
  const selectTab = tab => {
    tabs.forEach(item => {
      const selected = item === tab;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-selected', String(selected));
      item.tabIndex = selected ? 0 : -1;
    });
    resultCard.querySelectorAll('.analysis-panel').forEach(panel => { panel.hidden = panel.id !== `analysis-${tab.dataset.panel}`; });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[next].focus();
      selectTab(tabs[next]);
    });
  });
}

function updateLiveProfile() {
  const values = Object.fromEntries(new FormData(form).entries());
  const income = Number(values.Monthly_Income_INR) || 0;
  const expenses = Number(values.Monthly_Expenses_INR) || 0;
  const debt = Number(values.Monthly_Debt_Payment_INR) || 0;
  const sip = Number(values.Monthly_SIP) || 0;
  const remainder = income - expenses - debt;
  const allocation = ['Equity_Allocation_Pct', 'FD_Allocation_Pct', 'Debt_Allocation_Pct']
    .reduce((total, key) => total + (Number(values[key]) || 0), 0);
  const status = document.querySelector('#allocation-status');
  document.querySelector('#live-cashflow').textContent = money(remainder);
  document.querySelector('#live-after-sip').textContent = money(remainder - sip);
  document.querySelector('#live-cost-ratio').textContent = percent(income ? (expenses + debt) / income * 100 : 0);
  document.querySelector('#live-sip-ratio').textContent = percent(income ? sip / income * 100 : 0);
  const validAllocation = Math.abs(allocation - 100) <= .5;
  status.textContent = validAllocation ? 'Allocation totals 100%' : `Allocation totals ${percent(allocation)}`;
  status.classList.toggle('is-valid', validAllocation);
  status.classList.toggle('is-invalid', !validAllocation);
}

form.addEventListener('input', updateLiveProfile);
form.addEventListener('change', updateLiveProfile);
document.querySelector('#fill-example').addEventListener('click', () => {
  setForm(example);
  updateLiveProfile();
});
updateLiveProfile();
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
    const response = await fetch('/predict', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
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

fetch('/segments').then(response => {
  if (!response.ok) throw new Error('Could not load groups.');
  return response.json();
}).then(data => showSegments(data.segments)).catch(() => {
  segmentList.innerHTML = '<p class="loading">Groups are unavailable until the model is trained.</p>';
});
