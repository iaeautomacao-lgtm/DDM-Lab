// Builders de opção ECharts com o tema DDM (dark). Compartilhado pelo DashboardRenderer.
// Uma série [{name, value}] vira line (área c/ gradiente), bar (barra arredondada) ou donut.

export const PALETTE = ['#FF5706', '#4C9AED', '#34C77B', '#F0B429', '#B98CF2', '#FF8754', '#2DD4BF', '#F472B6'];
const GRID = '#2A2A2F';
const AXIS = '#9A9AA0';
const BG_CARD = '#161618';

type Point = { name: string; value: number };

const fmtNum = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });

const baseTooltip = {
  trigger: 'item' as const,
  backgroundColor: BG_CARD,
  borderColor: GRID,
  borderWidth: 1,
  textStyle: { color: '#F5F5F4', fontSize: 12 },
  padding: [8, 12],
};

const baseGrid = { top: 16, right: 16, bottom: 28, left: 48, containLabel: true };

function axisCommon() {
  return {
    axisLine: { lineStyle: { color: GRID } },
    axisTick: { show: false },
    axisLabel: { color: AXIS, fontSize: 11, hideOverlap: true },
    splitLine: { lineStyle: { color: GRID, type: 'dashed' as const } },
  };
}

export function lineOption(series: Point[], primary = PALETTE[0]) {
  return {
    color: [primary],
    tooltip: { ...baseTooltip, trigger: 'axis', axisPointer: { type: 'line', lineStyle: { color: GRID } } },
    grid: baseGrid,
    xAxis: { type: 'category', data: series.map((s) => s.name), boundaryGap: false, ...axisCommon(), splitLine: { show: false } },
    yAxis: { type: 'value', ...axisCommon(), axisLine: { show: false }, axisLabel: { color: AXIS, fontSize: 11, formatter: fmtNum } },
    series: [
      {
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        data: series.map((s) => s.value),
        lineStyle: { width: 2.5, color: primary },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: primary + '55' }, { offset: 1, color: primary + '05' }],
          },
        },
      },
    ],
  };
}

export function barOption(series: Point[], primary = PALETTE[0]) {
  return {
    color: [primary],
    tooltip: { ...baseTooltip, trigger: 'axis', axisPointer: { type: 'shadow', shadowStyle: { color: '#ffffff0d' } } },
    grid: baseGrid,
    xAxis: { type: 'category', data: series.map((s) => s.name), ...axisCommon(), splitLine: { show: false } },
    yAxis: { type: 'value', ...axisCommon(), axisLine: { show: false }, axisLabel: { color: AXIS, fontSize: 11, formatter: fmtNum } },
    series: [
      {
        type: 'bar',
        data: series.map((s) => s.value),
        barMaxWidth: 42,
        itemStyle: {
          borderRadius: [6, 6, 0, 0],
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [{ offset: 0, color: primary }, { offset: 1, color: primary + '88' }],
          },
        },
      },
    ],
  };
}

export function donutOption(series: Point[]) {
  return {
    color: PALETTE,
    tooltip: { ...baseTooltip, formatter: '{b}: {c} ({d}%)' },
    legend: {
      type: 'scroll', orient: 'horizontal', bottom: 0,
      textStyle: { color: AXIS, fontSize: 11 },
      icon: 'circle', itemWidth: 8, itemHeight: 8,
    },
    series: [
      {
        type: 'pie',
        radius: ['52%', '74%'],
        center: ['50%', '44%'],
        avoidLabelOverlap: true,
        itemStyle: { borderColor: '#0A0A0B', borderWidth: 2, borderRadius: 4 },
        label: { show: false },
        emphasis: { scale: true, scaleSize: 6, label: { show: false } },
        data: series.map((s) => ({ name: s.name, value: s.value })),
      },
    ],
  };
}
