import { ArrowRight, ArrowUpRight, Flower2, RotateCcw } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import './LifeBalancePanel.css';

// Preview series until the app stores dated balance measurements.
const series = [
  { id: 'health', label: 'Health', color: '#629a7a', week: [46, 61, 55, 72, 67, 78, 82], month: [46, 62, 72, 82] },
  { id: 'money', label: 'Money', color: '#b69b67', week: [52, 47, 58, 55, 64, 62, 68], month: [42, 55, 61, 68] },
  { id: 'people', label: 'People', color: '#9b89b5', week: [40, 57, 52, 65, 60, 71, 76], month: [44, 58, 65, 76] },
];

const periods = {
  week: { labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'], description: 'Here’s the shape of a week, one small step at a time.' },
  month: { labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'], description: 'Step back a little further. Small things add up over a month.' },
};

const chart = { width: 360, height: 156, inset: 12, top: 12, bottom: 144 };
const pointX = (index, count) => chart.inset + index * (chart.width - chart.inset * 2) / (count - 1);
const pointY = (value) => chart.bottom - value / 100 * (chart.bottom - chart.top);
const averageAt = (period, index) => Math.round(series.reduce((sum, item) => sum + item[period][index], 0) / series.length);

// Horizontal control points keep each curve inside its adjacent data values.
function curvePath(values) {
  return values.reduce((path, value, index) => {
    const x = pointX(index, values.length);
    const y = pointY(value);
    if (!index) return 'M ' + x + ',' + y;
    const previousX = pointX(index - 1, values.length);
    const midpoint = (previousX + x) / 2;
    return path + ' C ' + midpoint + ',' + pointY(values[index - 1]) + ' ' + midpoint + ',' + y + ' ' + x + ',' + y;
  }, '');
}

function AnimatedScore({ value }) {
  const [displayed, setDisplayed] = useState(0);
  const previous = useRef(0);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const start = previous.current;
    let frame;
    let startedAt;

    const finish = () => {
      window.cancelAnimationFrame(frame);
      previous.current = value;
      setDisplayed(value);
    };
    const animate = (time) => {
      startedAt ??= time;
      const progress = Math.min((time - startedAt) / 650, 1);
      const next = Math.round(start + (value - start) * (1 - (1 - progress) ** 3));
      previous.current = next;
      setDisplayed(next);
      if (progress < 1) frame = window.requestAnimationFrame(animate);
    };
    const onPreferenceChange = () => { if (preference.matches) finish(); };

    if (preference.matches) finish();
    else frame = window.requestAnimationFrame(animate);
    preference.addEventListener('change', onPreferenceChange);
    return () => {
      window.cancelAnimationFrame(frame);
      preference.removeEventListener('change', onPreferenceChange);
    };
  }, [value]);

  return <span data-translate-ignore="true" aria-hidden="true">{displayed}</span>;
}

export default function LifeBalancePanel({ language = 'en' }) {
  const [period, setPeriod] = useState('week');
  const [selectedSeries, setSelectedSeries] = useState('all');
  const [selectedIndex, setSelectedIndex] = useState(6);
  const [replay, setReplay] = useState(0);
  const pointButtons = useRef([]);
  const id = useId().replace(/:/g, '');
  const labels = periods[period].labels;
  const weekdayFormatter = new Intl.DateTimeFormat(language, { weekday: 'short', timeZone: 'UTC' });
  const axisLabels = period === 'week'
    ? labels.map((_, index) => weekdayFormatter.format(new Date(Date.UTC(2024, 0, 1 + index))))
    : labels;
  const activeSeries = series.find((item) => item.id === selectedSeries);
  const values = labels.map((_, index) => activeSeries ? activeSeries[period][index] : averageAt(period, index));
  const score = values[selectedIndex];
  const change = values.at(-1) - values[0];
  const color = activeSeries?.color || '#629a7a';
  const path = curvePath(values);
  const x = pointX(selectedIndex, labels.length);
  const titleId = id + '-title';
  const helpId = id + '-help';
  const detailId = id + '-detail';

  function changePeriod(next) {
    setPeriod(next);
    setSelectedIndex(periods[next].labels.length - 1);
  }

  function navigatePoints(event, index) {
    const next = {
      ArrowLeft: Math.max(0, index - 1),
      ArrowRight: Math.min(labels.length - 1, index + 1),
      Home: 0,
      End: labels.length - 1,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setSelectedIndex(next);
    pointButtons.current[next]?.focus();
  }

  return (
    <aside className="pulse-card life-balance-panel" aria-labelledby={titleId} style={{ '--balance-accent': color }}>
      <div className="pulse-topline">
        <span className="eyebrow">A MOMENT TO ZOOM OUT</span>
        <span className="balance-breath" aria-hidden="true" />
      </div>
      <div className="pulse-title-row">
        <h3 id={titleId}>Your life,<br />in balance.</h3>
        <div className="balance-score" role="group" aria-label={(activeSeries?.label || 'Life balance') + ' score: ' + score + ' out of 100'}>
          <div><AnimatedScore key={period + '-' + replay} value={score} /><small>/ 100</small></div>
          <span>{activeSeries?.label || 'Whole picture'}</span>
        </div>
      </div>
      <p className="pulse-description" key={period}>{periods[period].description}</p>

      <div className="balance-toolbar">
        <div className="balance-periods" role="group" aria-label="Chart time range">
          {['week', 'month'].map((option) => (
            <button type="button" key={option} aria-pressed={period === option} onClick={() => changePeriod(option)}>
              {option === 'week' ? 'Week' : 'Month'}
            </button>
          ))}
        </div>
        <span className="balance-trend" title="Change from the first to the last point in this sample period"><ArrowUpRight size={12} /><span data-translate-ignore="true">+{change}</span> <span>pts</span></span>
        <button type="button" className="balance-replay" onClick={() => setReplay((value) => value + 1)} aria-label="Replay chart animation" title="Replay animation">
          <RotateCcw key={replay} size={13} />
        </button>
      </div>

      <div className="balance-chart-heading">
        <button type="button" className="balance-overview" aria-pressed={selectedSeries === 'all'} onClick={() => setSelectedSeries('all')}>All areas</button>
        <span id={detailId} className="balance-point-detail" aria-live="polite" aria-atomic="true">
          <span key={period + '-' + selectedIndex}>{labels[selectedIndex]}</span><span aria-hidden="true">·</span><strong data-translate-ignore="true">{score}<small>/100</small></strong>
        </span>
      </div>

      <div className="balance-plot" role="group" aria-label="Sample life balance chart" aria-describedby={helpId}>
        <svg viewBox={'0 0 ' + chart.width + ' ' + chart.height} preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id={id + '-fill'} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity=".22" />
              <stop offset="100%" stopColor={color} stopOpacity=".015" />
            </linearGradient>
          </defs>
          {[0, 50, 100].map((value) => <line key={value} className="balance-grid-line" x1="0" x2={chart.width} y1={pointY(value)} y2={pointY(value)} />)}
          <g key={period + '-' + replay}>
            <path key={selectedSeries} className="balance-area-fill" d={path + ' L ' + (chart.width - chart.inset) + ',' + chart.bottom + ' L ' + chart.inset + ',' + chart.bottom + ' Z'} fill={'url(#' + id + '-fill)'} />
            {series.map((item, index) => (
              <path
                key={item.id}
                className={'balance-curve' + (activeSeries && item.id !== selectedSeries ? ' balance-curve-muted' : '')}
                d={curvePath(item[period])}
                fill="none"
                stroke={item.color}
                strokeWidth={item.id === selectedSeries ? 3 : 2}
                pathLength="1"
                style={{ '--draw-delay': index * 100 + 'ms' }}
              />
            ))}
          </g>
          <line className="balance-crosshair" x1={x} x2={x} y1={chart.top} y2={chart.bottom} />
          {series.filter((item) => !activeSeries || item.id === selectedSeries).map((item) => (
            <g key={item.id} style={{ '--point-color': item.color }}>
              <circle className="balance-point-halo" cx={x} cy={pointY(item[period][selectedIndex])} r="8" />
              <circle className="balance-point" cx={x} cy={pointY(item[period][selectedIndex])} r="3.6" />
            </g>
          ))}
        </svg>
        <div className="balance-point-targets">
          {labels.map((label, index) => (
            <button
              type="button"
              key={period + '-' + index}
              ref={(element) => { pointButtons.current[index] = element; }}
              tabIndex={selectedIndex === index ? 0 : -1}
              aria-pressed={selectedIndex === index}
              aria-label={label + '. Balance ' + averageAt(period, index) + ' out of 100. ' + series.map((item) => item.label + ' ' + item[period][index]).join('. ') + '.'}
              aria-describedby={detailId}
              onPointerEnter={(event) => { if (event.pointerType !== 'touch') setSelectedIndex(index); }}
              onFocus={() => setSelectedIndex(index)}
              onClick={() => setSelectedIndex(index)}
              onKeyDown={(event) => navigatePoints(event, index)}
            />
          ))}
        </div>
      </div>
      <div className="balance-axis" aria-hidden="true">
        {axisLabels.map((label) => <span key={period + label} data-translate-ignore={period === 'week' ? 'true' : undefined}>{label}</span>)}
      </div>
      <p id={helpId} className="sr-only">Sample data on a scale of 0 to 100. Tap or hover to explore. With the chart focused, use the left and right arrow keys to move between points, or Home and End to jump.</p>

      <div className="balance-series-list" role="group" aria-label="Explore a life area">
        {series.map((item) => (
          <button
            type="button"
            key={item.id}
            className="balance-series-button"
            style={{ '--series-color': item.color }}
            aria-pressed={selectedSeries === item.id}
            onClick={() => setSelectedSeries((current) => current === item.id ? 'all' : item.id)}
          >
            <span className="balance-series-dot" /><span className="balance-series-label">{item.label}</span>
            <span className="balance-meter" aria-hidden="true"><span style={{ width: item[period][selectedIndex] + '%' }}><i key={replay} /></span></span>
            <strong data-translate-ignore="true">{item[period][selectedIndex]}<small>%</small></strong>
          </button>
        ))}
      </div>
      <div className="balance-chart-caption"><span>Sample data</span><span>Hover or tap to explore</span></div>
      <a className="pulse-note" href="#life-areas"><span className="pulse-note-icon"><Flower2 size={15} /></span><span>Progress is allowed to look like you.</span><ArrowRight size={13} /></a>
    </aside>
  );
}
