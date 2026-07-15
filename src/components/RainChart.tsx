/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";

interface RainChartProps {
  labels: string[];
  values: number[];
}

export const RainChart: React.FC<RainChartProps> = ({ labels, values }) => {
  const maxValue = Math.max(...values, 0.5); // Minimum y-scale of 0.5mm

  // Chart proportions
  const width = 800;
  const height = 180;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  return (
    <div className="w-full bg-white p-4 rounded border border-gray-100 flex flex-col items-center">
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[650px] overflow-visible">
          {/* Background Grid Lines (Horizontal) */}
          {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            const val = (maxValue * ratio).toFixed(2);
            return (
              <g key={ratio} className="opacity-40">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeWidth="1"
                  strokeDasharray="3,3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="font-mono text-[10px] fill-gray-400"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X Axis Line */}
          <line
            x1={paddingLeft}
            y1={height - paddingBottom}
            x2={width - paddingRight}
            y2={height - paddingBottom}
            stroke="#CBD5E1"
            strokeWidth="1"
          />

          {/* bars and labels */}
          {labels.map((label, idx) => {
            const val = values[idx] || 0;
            const barWidth = Math.max(8, (chartWidth / labels.length) * 0.5);
            const x = paddingLeft + (idx * (chartWidth / labels.length)) + (chartWidth / labels.length) / 2 - barWidth / 2;
            const barHeight = maxValue > 0 ? (val / maxValue) * chartHeight : 0;
            const y = height - paddingBottom - barHeight;

            return (
              <g key={label} className="group">
                {/* Visual Bar */}
                {val > 0 && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill="#3b82f6"
                    rx="1"
                    className="transition-all duration-300 hover:fill-blue-600"
                  />
                )}
                
                {/* Tiny value label above bar */}
                {val > 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 4}
                    textAnchor="middle"
                    className="font-mono text-[9px] fill-blue-700 font-semibold"
                  >
                    {val}
                  </text>
                )}

                {/* X axis labels */}
                {idx % (window.innerWidth < 640 && labels.length > 20 ? 4 : 1) === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={height - paddingBottom + 16}
                    textAnchor="middle"
                    className="font-mono text-[9px] fill-gray-500"
                  >
                    {label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend & Grid footer */}
      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500 font-sans">
        <span className="w-3 h-3 bg-blue-500 rounded-sm"></span>
        <span>Precipitação (mm)</span>
      </div>
    </div>
  );
};
