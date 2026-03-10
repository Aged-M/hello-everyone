const form = document.getElementById('ask-form');
const questionInput = document.getElementById('question');
const statusEl = document.getElementById('status');
const resultsEl = document.getElementById('results');
const explanationEl = document.getElementById('explanation');
const chartsEl = document.getElementById('charts');
const newsEl = document.getElementById('news');

let charts = [];

const indicatorMap = {
  inflation: { label: 'Inflation (CPI)', url: 'https://api.worldbank.org/v2/country/USA/indicator/FP.CPI.TOTL.ZG?format=json&per_page=40' },
  unemployment: { label: 'Unemployment', url: 'https://api.worldbank.org/v2/country/USA/indicator/SL.UEM.TOTL.ZS?format=json&per_page=40' },
  gdp: { label: 'GDP Per Capita', url: 'https://api.worldbank.org/v2/country/USA/indicator/NY.GDP.PCAP.CD?format=json&per_page=40' },
  debt: { label: 'Lending Interest Rate', url: 'https://api.worldbank.org/v2/country/USA/indicator/FR.INR.LEND?format=json&per_page=40' },
};

function pickIndicators(question) {
  const q = question.toLowerCase();
  const selected = [indicatorMap.inflation, indicatorMap.unemployment];
  if (/wage|income|salary|growth/.test(q)) selected.push(indicatorMap.gdp);
  if (/loan|credit|debt|mortgage|interest/.test(q)) selected.push(indicatorMap.debt);
  return selected;
}

function neutralExplanation(question, seriesResults) {
  const lines = [
    `Question: "${question}"`,
    'Neutral interpretation framework:',
    '- Consumer perspective: focus on purchasing power and household risk.',
    '- Business perspective: focus on pricing power and demand sensitivity.',
    '- Policy perspective: focus on inflation, labor, and credit conditions together.',
  ];

  seriesResults.forEach(({ label, points }) => {
    if (points.length < 2) return;
    const prev = points[points.length - 2].value;
    const curr = points[points.length - 1].value;
    const direction = curr > prev ? 'up' : curr < prev ? 'down' : 'flat';
    lines.push(`- ${label}: latest is ${curr.toFixed(2)} (${direction} vs prior ${prev.toFixed(2)}).`);
  });

  lines.push('- Monetization path: freemium search + premium alerts + B2B API subscriptions.');
  return lines.join('\n');
}

async function fetchIndicator(indicator) {
  const res = await fetch(indicator.url);
  const payload = await res.json();
  const points = (payload[1] || [])
    .filter((r) => r.value !== null)
    .map((r) => ({ date: Number(r.date), value: Number(r.value) }))
    .sort((a, b) => a.date - b.date)
    .slice(-20);
  return { label: indicator.label, points };
}

function renderCharts(series) {
  charts.forEach((chart) => chart.destroy());
  charts = [];
  chartsEl.innerHTML = '';

  series.forEach(({ label, points }) => {
    const card = document.createElement('div');
    card.className = 'chart-card';
    const title = document.createElement('h3');
    title.textContent = label;
    const canvas = document.createElement('canvas');
    card.append(title, canvas);
    chartsEl.appendChild(card);

    charts.push(new Chart(canvas, {
      type: 'line',
      data: {
        labels: points.map((p) => p.date),
        datasets: [{ data: points.map((p) => p.value), borderWidth: 2, label }],
      },
      options: { responsive: true, maintainAspectRatio: false },
    }));
  });
}

async function fetchNews(question) {
  const url = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(question)}&mode=ArtList&maxrecords=6&format=json&sort=DateDesc`;
  const res = await fetch(url);
  const payload = await res.json();
  return payload.articles || [];
}

function renderNews(articles) {
  newsEl.innerHTML = '';
  if (!articles.length) {
    newsEl.innerHTML = '<li>No news found.</li>';
    return;
  }
  articles.forEach((a) => {
    const li = document.createElement('li');
    li.innerHTML = `<a href="${a.url}" target="_blank">${a.title}</a><div>${a.source || 'source unknown'}</div>`;
    newsEl.appendChild(li);
  });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const question = questionInput.value.trim();
  statusEl.textContent = 'Analyzing...';
  resultsEl.classList.add('hidden');

  try {
    const indicators = pickIndicators(question);
    const series = await Promise.all(indicators.map(fetchIndicator));
    const news = await fetchNews(question);

    explanationEl.textContent = neutralExplanation(question, series);
    renderCharts(series);
    renderNews(news);

    statusEl.textContent = 'Done.';
    resultsEl.classList.remove('hidden');
  } catch (err) {
    statusEl.textContent = `Error: ${err.message}`;
  }
});
