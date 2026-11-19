const form = document.querySelector('#profile-form');
const resultCard = document.querySelector('#result-card');
const segmentList = document.querySelector('#segment-list');
const errorBox = document.querySelector('#form-error');
const noPortfolio = document.querySelector('#no-portfolio');
const allocationError = document.querySelector('#allocation-error');
const allocationFields = ['Equity_Allocation_Pct', 'FD_Allocation_Pct', 'Debt_Allocation_Pct'];
let submittedProfile = null;
let submittedWithoutPortfolio = null;
const reportTimeoutMs = 20000;
let exampleSnapshot = null;
const editsAfterExample = new Set();
const example = {
  Age: 32, City_Tier: 'Tier 1', Employment_Type: 'Salaried', Monthly_Income_INR: 160000,
  Monthly_Expenses_INR: 85000, Monthly_Savings_INR: 32000, Debt_Status: 'No Debt',
  Monthly_Debt_Payment_INR: 0, Monthly_SIP: 30000, Equity_Allocation_Pct: 70,
  FD_Allocation_Pct: 10, Debt_Allocation_Pct: 20, Investment_Experience_Years: 6,
  Additional_Investment_INR: 0, Other_Expenses_INR: 13000,
  Financial_Literacy_Score: 8, Risk_Tolerance_Level: 'High', Primary_Financial_Goal: 'Wealth Accumulation',
};
const money = value => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value);
const paise = value => Math.round(Number(value) * 100);
const percent = value => `${Number(value.toFixed(2))}%`;
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

function comparisonThreshold(average, formatter) {
  return formatter === percent ? 3 : Math.max(Math.abs(average) * 0.05, 1);
}

function comparisonGap(gap, formatter) {
  const amount = Math.abs(gap);
  if (formatter !== percent) return formatter(amount);
  const points = Number(amount.toFixed(2));
  return `${points} percentage ${points === 1 ? 'point' : 'points'}`;
}

function comparisonRow(label, value, average, formatter, scaleMax) {
  const safeScale = Math.max(Number(scaleMax) || 1, 1);
  const userWidth = Math.max(0, Math.min(100, value / safeScale * 100));
  const averageWidth = Math.max(0, Math.min(100, average / safeScale * 100));
  const gap = value - average;
  const threshold = comparisonThreshold(average, formatter);
  const direction = Math.abs(gap) <= threshold ? 'Near the group average' : `${gap > 0 ? 'Above' : 'Below'} group average`;
  const difference = comparisonGap(gap, formatter);
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
    if (Math.abs(difference) <= comparisonThreshold(item.average, item.format)) {
      return `Your ${item.label} is close to this group’s average (${item.format(item.average)}).`;
    }
    const gap = comparisonGap(difference, item.format);
    return `Your ${item.label} is ${gap} ${difference > 0 ? 'above' : 'below'} this group’s average (${item.format(item.average)}).`;
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
  const postCostsPaise = paise(income) - paise(values.Monthly_Expenses_INR) - paise(values.Monthly_Debt_Payment_INR);
  const postCosts = postCostsPaise / 100;
  const postSip = (postCostsPaise - paise(values.Monthly_SIP)) / 100;
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
  } else if (postSip < 0) {
    cashStatus = 'SIP exceeds estimated balance';
    cashTone = 'attention';
    cashText = `The SIP is ${money(-postSip)} more than the balance left after entered expenses and debt. Check whether other income or cash reserves fund the difference.`;
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
  const riskText = `You selected ${risk.toLowerCase()} risk comfort and entered ${percent(equity)} equity. Assessing suitability also requires your time horizon and ability to absorb losses.`;

  const concentrationText = largestShare >= 80
    ? `${percent(largestShare)} is in ${largestAsset}, so the entered allocation is concentrated in one of these three broad buckets.`
    : `${largestAsset} is the largest entered bucket at ${percent(largestShare)}. The form only shows broad categories, not the individual funds, securities, or deposits inside them.`;
  return {
    postCosts,
    postSip,
    sipRate,
    checks: [
      { title: 'Contribution and monthly balance', status: cashStatus, tone: cashTone, text: cashText },
      { title: 'Allocation and stated risk comfort', status: 'Your inputs', tone: 'neutral', text: riskText },
      { title: 'Mix across broad asset buckets', status: largestShare >= 80 ? 'One bucket holds 80% or more' : 'Largest bucket', tone: largestShare >= 80 ? 'review' : 'neutral', text: concentrationText },
      { title: 'Goal and time horizon', status: escapeHtml(values.Primary_Financial_Goal), tone: 'neutral', text: 'A goal is recorded, but no target date or time horizon is collected, so this profile cannot tell whether the current allocation fits when the money is needed.' },
    ],
  };
}

const budgetFields = {"expenses":"Regular expenses","savings":"Savings","loan_repayments":"Loan repayments","investment":"Investments","other":"Other expenses"};
const budgetPercent = value => Number(value.toFixed(2)) + '%';

function roundedBudgetShares(shares) {
  const total = Object.values(shares).reduce((sum, share) => sum + share, 0);
  // Allocate the hundredths left by rounding down to the largest remainders.
  const rounded = Object.entries(shares).map(([category, share]) => {
    const scaled = share / total * 10000;
    const points = Math.floor(scaled);
    return { category, points, remainder: scaled - points };
  });
  let remaining = 10000 - rounded.reduce((sum, share) => sum + share.points, 0);
  rounded.sort((a, b) => b.remainder - a.remainder);
  for (const share of rounded) {
    if (remaining <= 0) break;
    share.points++;
    remaining--;
  }
  return Object.fromEntries(rounded.map(share => [share.category, share.points / 100]));
}
function readBudget(values) {
  const income = Number(values.Monthly_Income_INR);
  const amounts = {
    expenses: Number(values.Monthly_Expenses_INR),
    savings: Number(values.Monthly_Savings_INR),
    loan_repayments: Number(values.Monthly_Debt_Payment_INR),
    investment: (paise(values.Monthly_SIP) + paise(values.Additional_Investment_INR)) / 100,
    other: Number(values.Other_Expenses_INR),
  };
  const remaining = (paise(income) - Object.values(amounts).reduce((sum, amount) => sum + paise(amount), 0)) / 100;
  const shares = Object.fromEntries(Object.entries(amounts).map(([key, amount]) => [key, amount / income * 100]));
  return { income, remaining, shares, amounts };
}

function budgetStatus({ income, remaining }) {
  if (!(income > 0)) return 'Enter your monthly income to start.';
  const amount = Math.abs(remaining).toLocaleString('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
  if (remaining > 0) return amount + ' left to allocate.';
  if (remaining < 0) return 'Budget exceeds income by ' + amount + '.';
  return 'Budget matches your monthly income.';
}

function showBudgetComparison(segment, budget) {
  const userShares = roundedBudgetShares(budget);
  const groupShares = roundedBudgetShares(segment.average);
  const rows = Object.entries(budgetFields).map(([key, label]) =>
    '<tr><th scope="row">' + label + '</th><td>' + budgetPercent(userShares[key]) + '</td><td>' +
      budgetPercent(groupShares[key]) + '</td></tr>',
  ).join('');
  return '<section class="sebi-budget" aria-labelledby="sebi-result-title">' +
    '<h3 id="sebi-result-title">Monthly budget comparison</h3>' +
    '<table><thead><tr><th scope="col">Budget category</th><th scope="col">Your share</th>' +
    '<th scope="col">Group average</th></tr></thead><tbody>' + rows +
    '</tbody></table><p>Group averages come from held-out SEBI survey interviews in the investor sample. ' +
    'This compares your budget with those groups. Applicability to people without a portfolio has not been established.</p></section>';
}

function budgetMatch(segment) {
  return `<div class="budget-match"><span>Monthly behavior · SEBI Investor Survey 2025</span><strong>${escapeHtml(segment.name)}</strong></div>`;
}

function showMatch(result, values, budgetSegment, budget) {
  if (!result) {
    resultCard.className = 'panel result-card match-card';
    resultCard.innerHTML = `
      <h2 id="report-title" tabindex="-1">Your report</h2>
      <p id="report-stale" class="form-error" role="status" hidden>Inputs changed. Generate a new report to update these results.</p>
      <div class="report-matches budget-only">${budgetMatch(budgetSegment)}</div>
      ${showBudgetComparison(budgetSegment, budget)}`;
    return;
  }
  const profile = result.cluster_profile;
  const averages = profile.numeric_means;
  const monthlyRemainder = (paise(values.Monthly_Income_INR) - paise(values.Monthly_Expenses_INR) - paise(values.Monthly_Debt_Payment_INR)) / 100;
  const debtBurden = values.Monthly_Income_INR ? values.Monthly_Debt_Payment_INR / values.Monthly_Income_INR * 100 : 0;
  const sipRate = values.Monthly_Income_INR ? values.Monthly_SIP / values.Monthly_Income_INR * 100 : 0;
  const readout = readoutForProfile(values, monthlyRemainder, debtBurden, sipRate);
  const investment = investmentCheck(values);
  const categories = [
    ['Monthly income', values.Monthly_Income_INR, averages.Monthly_Income_INR, money, Math.max(values.Monthly_Income_INR, averages.Monthly_Income_INR, 1) * 1.1],
    ['Regular expenses', values.Monthly_Expenses_INR, averages.Monthly_Expenses_INR, money, Math.max(values.Monthly_Expenses_INR, averages.Monthly_Expenses_INR, 1) * 1.1],
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
    <h2 id="report-title" tabindex="-1">Your report</h2>
    <p id="report-stale" class="form-error" role="status" hidden>Inputs changed. Generate a new report to update these results.</p>
    <div class="report-matches">
      <div><span>Simulated investor match</span><strong>${escapeHtml(result.segment_name)}</strong><small>Cluster ${result.cluster_id} · ${percent(profile.share * 100)} of generated profiles (${profile.size.toLocaleString('en-IN')})</small></div>
      ${budgetMatch(budgetSegment)}
    </div>
    <div class="match-summary"><span class="summary-icon" aria-hidden="true">✳</span><div><strong>How you compare</strong><p>${escapeHtml(numericComparisonNarrative(values, averages))}</p></div></div>
    ${showBudgetComparison(budgetSegment, budget)}
    <div class="analysis-tabs" role="tablist" aria-label="Profile analysis sections">
      <button class="analysis-tab is-active" type="button" role="tab" aria-selected="true" aria-controls="analysis-overview" id="tab-overview" data-panel="overview">Profile readout</button>
      <button class="analysis-tab" type="button" role="tab" aria-selected="false" aria-controls="analysis-investment" id="tab-investment" data-panel="investment">Investment check-in</button>
      <button class="analysis-tab" type="button" role="tab" aria-selected="false" aria-controls="analysis-compare" id="tab-compare" data-panel="compare">Compare values</button>
      <button class="analysis-tab" type="button" role="tab" aria-selected="false" aria-controls="analysis-group" id="tab-group" data-panel="group">Group makeup</button>
    </div>
    <section id="analysis-overview" class="analysis-panel" role="tabpanel" aria-labelledby="tab-overview" tabindex="0">
      <div class="insight-grid">
        <article class="insight-tile"><span class="insight-icon">₹</span><div><strong>${money(monthlyRemainder)}</strong><span>After regular expenses and debt, before other allocations</span></div></article>
        <article class="insight-tile"><span class="insight-icon">↗</span><div><strong>${percent(values.Savings_Percentage)}</strong><span>Monthly savings as a share of income</span></div></article>
        <article class="insight-tile"><span class="insight-icon">◌</span><div><strong>${percent(debtBurden)}</strong><span>Debt payments as a share of income</span></div></article>
        <article class="insight-tile"><span class="insight-icon">◎</span><div><strong>${percent(sipRate)}</strong><span>Monthly SIP as a share of income</span></div></article>
      </div>
      <div class="narrative-list">${readout.map((text, index) => `<p><span>${index + 1}</span>${escapeHtml(text)}</p>`).join('')}</div>
      <div class="allocation-summary"><div class="allocation-summary-head"><strong>Your portfolio mix</strong><span>100% total</span></div><div class="allocation-bar" role="img" aria-label="Portfolio: ${values.Equity_Allocation_Pct}% equity, ${values.FD_Allocation_Pct}% fixed deposits, ${values.Debt_Allocation_Pct}% debt assets"><span class="alloc-equity" style="width:${values.Equity_Allocation_Pct}%"></span><span class="alloc-fd" style="width:${values.FD_Allocation_Pct}%"></span><span class="alloc-debt" style="width:${values.Debt_Allocation_Pct}%"></span></div><div class="allocation-legend"><span><i class="alloc-equity"></i>Equity ${percent(values.Equity_Allocation_Pct)}</span><span><i class="alloc-fd"></i>FDs ${percent(values.FD_Allocation_Pct)}</span><span><i class="alloc-debt"></i>Debt ${percent(values.Debt_Allocation_Pct)}</span></div></div>
      <div class="profile-tags"><span>${escapeHtml(values.Risk_Tolerance_Level)} risk comfort</span><span>${escapeHtml(values.Primary_Financial_Goal)}</span><span>${values.Investment_Experience_Years} yrs experience</span></div>
    </section>
    <section id="analysis-investment" class="analysis-panel" role="tabpanel" aria-labelledby="tab-investment" tabindex="0" hidden>
      <div class="investment-metrics">
        <article><span>Monthly SIP</span><strong>${money(values.Monthly_SIP)}</strong><small>${percent(investment.sipRate)} of entered income</small></article>
        <article><span>After regular expenses and debt</span><strong>${money(investment.postCosts)}</strong><small>Income minus expenses and debt</small></article>
        <article><span>After regular expenses, debt and SIP</span><strong>${money(investment.postSip)}</strong><small>Before savings and other allocations</small></article>
      </div>
      <div class="investment-check-grid">${investment.checks.map(check => `<article class="investment-check ${check.tone}"><div><h3>${escapeHtml(check.title)}</h3><span class="check-status">${check.status}</span></div><p>${escapeHtml(check.text)}</p></article>`).join('')}</div>
      <div class="performance-limits"><span class="limits-icon" aria-hidden="true">i</span><div><strong>Can this tell whether your investments are gaining or losing?</strong><p>No. This profile has no current portfolio value, purchase history, returns, fees, or benchmark. It can describe contributions and stated allocation, but it cannot measure performance or say whether you are on track.</p></div></div>
    </section>
    <section id="analysis-compare" class="analysis-panel" role="tabpanel" aria-labelledby="tab-compare" tabindex="0" hidden>
      <p class="analysis-intro">The marker shows your answer. The shaded bar shows the average for your simulated group.</p>
      <div class="comparison-list">${categories.map(([label, value, average, formatter, scale]) => comparisonRow(label, value, average, formatter, scale)).join('')}</div>
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
  selectTab(tabs[0]);
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

function updateProfileConstraints() {
  const { Age, Debt_Status, Monthly_Debt_Payment_INR, Investment_Experience_Years } = form.elements;
  const experienceLimit = Number.isFinite(Age.valueAsNumber) ? Math.max(0, Age.valueAsNumber - 18) : 82;
  Investment_Experience_Years.max = experienceLimit;
  Investment_Experience_Years.setCustomValidity(
    Investment_Experience_Years.valueAsNumber > experienceLimit
      ? 'Investment experience cannot exceed ' + experienceLimit + ' years for this age.' : '',
  );
  const noDebt = !Debt_Status.disabled && Debt_Status.value === 'No Debt';
  if (noDebt && Monthly_Debt_Payment_INR.value === '') Monthly_Debt_Payment_INR.value = 0;
  Monthly_Debt_Payment_INR.setCustomValidity(
    noDebt && Monthly_Debt_Payment_INR.valueAsNumber > 0 ? 'Choose your main debt type or enter zero loan payments.' : '',
  );
}

const compactLayout = window.matchMedia('(max-width: 760px)');
const budgetCard = document.querySelector('.budget-card');
function placeBudgetPreview() {
  if (compactLayout.matches) errorBox.before(budgetCard);
  else resultCard.before(budgetCard);
}
compactLayout.addEventListener('change', placeBudgetPreview);
placeBudgetPreview();

function updateBudgetPreview(budget) {
  const total = Object.values(budget.amounts).reduce((sum, amount) => sum + amount, 0);
  const hasIncome = budget.income > 0;
  const displayedShares = hasIncome && budget.remaining === 0 && Object.values(budget.shares).every(share => share >= 0)
    ? roundedBudgetShares(budget.shares) : budget.shares;
  const scale = Math.max(budget.income, total) || 1;
  let end = 0;
  const slices = [];
  const rows = [];
  for (const [key, label] of Object.entries(budgetFields)) {
    const amount = budget.amounts[key];
    const start = end;
    end += amount / scale * 100;
    slices.push('var(--' + key + ') ' + start + '% ' + end + '%');
    rows.push('<div><dt><i style="background:var(--' + key + ')"></i>' + label + '</dt><dd>' +
      (hasIncome ? budgetPercent(displayedShares[key]) : '—') + '</dd></div>');
  }
  slices.push('var(--unused) ' + end + '% 100%');
  document.querySelector('.budget-donut').style.background = hasIncome ? 'conic-gradient(' + slices.join(',') + ')' : 'var(--unused)';
  document.querySelector('#preview-legend').innerHTML = rows.join('');
  document.querySelector('#ring-percent').textContent = hasIncome ? budgetPercent(total / budget.income * 100) : '—';
  document.querySelector('#preview-income').textContent = hasIncome ? money(budget.income) : '—';
}

function updateLiveProfile() {
  for (const section of form.querySelectorAll('[data-portfolio-field]')) {
    section.hidden = noPortfolio.checked;
    for (const field of section.querySelectorAll('input, select')) field.disabled = noPortfolio.checked;
  }
  document.querySelector('#no-portfolio-note').hidden = !noPortfolio.checked;
  document.querySelector('.model-groups').hidden = noPortfolio.checked;
  if (resultCard.classList.contains('empty-result')) {
    resultCard.querySelector('p').textContent = noPortfolio.checked
      ? 'Complete your budget to see how it compares with SEBI survey households.'
      : 'Complete your profile to see your simulated investor match and monthly budget comparison.';
  }
  updateProfileConstraints();
  errorBox.hidden = true;
  updateReportStatus();
  const values = Object.fromEntries(new FormData(form).entries());
  const allocation = allocationFields
    .reduce((total, key) => total + (Number(values[key]) || 0), 0);
  const budget = readBudget(values);
  updateBudgetPreview(budget);
  const required = [...form.querySelectorAll('[required]:enabled')];
  const complete = required.filter(field => field.value !== '').length;
  const filled = Math.round(complete / required.length * 100);
  document.querySelector('#completion-meter').value = filled;
  document.querySelector('#completion-value').textContent = filled + '%';
  const budgetMessage = budgetStatus(budget);
  const budgetTotal = document.querySelector('#sebi-budget-total');
  budgetTotal.textContent = budgetMessage;
  budgetTotal.classList.toggle('budget-mismatch', budget.income > 0 && budget.remaining !== 0);
  const mobileStatus = document.querySelector('#mobile-budget-status');
  mobileStatus.hidden = !(budget.income > 0);
  mobileStatus.textContent = budgetMessage;
  mobileStatus.classList.toggle('is-balanced', budget.remaining === 0);
  const breakdown = document.querySelector('#budget-breakdown');
  breakdown.hidden = !(budget.income > 0);
  breakdown.innerHTML = Object.entries(budgetFields).map(([key, label]) =>
    '<div><dt>' + label + '</dt><dd>' + money(budget.amounts[key]) + '</dd></div>',
  ).join('');
  const status = document.querySelector('#allocation-status');
  const validAllocation = Math.abs(allocation - 100) < 0.000001;
  status.textContent = validAllocation ? 'Allocation totals 100%' : `Portfolio total: ${budgetPercent(allocation)}`;
  status.classList.toggle('is-valid', validAllocation);
  status.classList.toggle('is-invalid', !validAllocation && allocation > 0);
  if (validAllocation || noPortfolio.checked) allocationError.hidden = true;
  if (!allocationError.hidden) showAllocationError(allocation);
}

function showAllocationError(total) {
  const gap = Number(Math.abs(100 - total).toFixed(1));
  allocationError.textContent = `Portfolio allocations must total 100%. ${total < 100 ? 'Add' : 'Remove'} ${gap} percentage ${gap === 1 ? 'point' : 'points'}.`;
  allocationError.hidden = false;
}

function profileSnapshot() {
  return JSON.stringify([...new FormData(form).entries()]);
}

function updateReportStatus() {
  const status = resultCard.querySelector('#report-stale');
  if (!status) return;
  resultCard.hidden = submittedWithoutPortfolio !== noPortfolio.checked;
  status.hidden = submittedProfile === profileSnapshot();
}

form.addEventListener('input', event => {
  if (exampleSnapshot && event.target.name) editsAfterExample.add(event.target.name);
  updateLiveProfile();
});
form.addEventListener('change', updateLiveProfile);
const exampleButton = document.querySelector('#fill-example');
const exampleFeedback = document.querySelector('#example-feedback');
exampleButton.addEventListener('click', () => {
  const fields = Object.fromEntries(Object.keys(example).map(name => [name, form.elements.namedItem(name).value]));
  const differsFromExample = Object.entries(example).some(([name, value]) => fields[name] !== String(value));
  if (!exampleSnapshot || noPortfolio.checked || differsFromExample) {
    exampleSnapshot = { fields, noPortfolio: noPortfolio.checked };
    editsAfterExample.clear();
  }
  noPortfolio.checked = false;
  setForm(example);
  updateLiveProfile();
  exampleFeedback.hidden = false;
});
document.querySelector('#undo-example').addEventListener('click', () => {
  if (!exampleSnapshot) return;
  const unchanged = Object.entries(exampleSnapshot.fields).filter(([name]) => (
    !editsAfterExample.has(name)
  ));
  setForm(Object.fromEntries(unchanged));
  if (!editsAfterExample.has(noPortfolio.name)) noPortfolio.checked = exampleSnapshot.noPortfolio;
  exampleSnapshot = null;
  exampleFeedback.hidden = true;
  updateLiveProfile();
  exampleButton.focus();
});
updateLiveProfile();
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('[type="submit"]');
  if (button.disabled) return;
  errorBox.hidden = true;
  const data = Object.fromEntries(new FormData(form).entries());
  const budget = readBudget(data);
  if (!(budget.income > 0) || budget.remaining !== 0) {
    const budgetTotal = document.querySelector('#sebi-budget-total');
    budgetTotal.focus({ preventScroll: true });
    budgetTotal.scrollIntoView({ block: 'center' });
    return;
  }
  data.Savings_Percentage = budget.shares.savings;
  delete data.Monthly_Savings_INR;
  delete data.Additional_Investment_INR;
  delete data.Other_Expenses_INR;
  const numeric = ['Age','Monthly_Income_INR','Monthly_Expenses_INR','Savings_Percentage','Monthly_Debt_Payment_INR','Monthly_SIP','Equity_Allocation_Pct','FD_Allocation_Pct','Debt_Allocation_Pct','Investment_Experience_Years','Financial_Literacy_Score'];
  for (const field of numeric) data[field] = Number(data[field]);
  if (!noPortfolio.checked) {
    const allocation = allocationFields.reduce((total, key) => total + data[key], 0);
    if (Math.abs(allocation - 100) >= 0.000001) {
      showAllocationError(allocation);
      allocationError.scrollIntoView({ block: 'center' });
      form.elements.Equity_Allocation_Pct.focus({ preventScroll: true });
      return;
    }
  }
  const profile = noPortfolio.checked ? null : data;
  const snapshot = profileSnapshot();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), reportTimeoutMs);
  button.disabled = true;
  button.querySelector('span:first-child').textContent = 'Analysing your profile…';
  try {
    const response = await fetch('/report', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ profile, budget: budget.shares }), signal: controller.signal });
    const result = await response.json();
    if (snapshot !== profileSnapshot()) {
      errorBox.textContent = 'Your answers changed while the report was loading. Generate it again with your latest answers.';
      errorBox.hidden = false;
      return;
    }
    if (!response.ok) {
      errorBox.textContent = typeof result.detail === 'string' ? result.detail : 'Check your profile and budget entries, then try again.';
      errorBox.hidden = false;
      return;
    }
    submittedProfile = snapshot;
    submittedWithoutPortfolio = profile === null;
    showMatch(result.investor_cluster, data, result.sebi_budget.segment, budget.shares);
    updateReportStatus();
    resultCard.querySelector('#report-title').focus({ preventScroll: true });
    resultCard.scrollIntoView({ block: 'start' });
  } catch {
    errorBox.textContent = controller.signal.aborted
      ? 'The report took too long to load. Try generating it again.'
      : 'The report could not load. Try generating it again.';
    errorBox.hidden = false;
  } finally {
    clearTimeout(timeout);
    button.disabled = false;
    button.querySelector('span:first-child').textContent = 'Generate my report';
  }
});

fetch('/segments').then(response => {
  if (!response.ok) throw new Error('Could not load groups.');
  return response.json();
}).then(data => showSegments(data.segments)).catch(() => {
  segmentList.innerHTML = '<p class="loading">Groups are unavailable until the model is trained.</p>';
});
