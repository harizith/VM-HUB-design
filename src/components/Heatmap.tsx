'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { ShieldCheck, Building2, TrendingUp } from 'lucide-react';

interface HeatmapCell {
  department: string;
  deptName: string;
  month: string;
  monthIndex: number;
  percentage: number;
  totalHours: number;
  presentHours: number;
  status: string;
}

interface HeatmapPayload {
  matrix: HeatmapCell[];
  departments: { code: string; name: string }[];
  months: string[];
  deptSummaries: { code: string; name: string; averagePercentage: number; totalHours: number; status: string }[];
  summary: {
    campusAverage: number;
    bestDept: string;
    warningCount: number;
    semesterLabel: string;
    regulation: string;
    complianceNorm: string;
  };
}

export default function Heatmap() {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<HeatmapPayload | null>(null);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/hod/attendance/heatmap')
      .then(res => res.json())
      .then(res => {
        if (res.success && res.data) {
          setData(res.data);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Heatmap loading error:', err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data || data.matrix.length === 0) return;

    const matrix = data.matrix;
    const departments = data.departments.map(d => d.code);
    const months = data.months;

    const width = 760;
    const height = 340;
    const margin = { top: 35, right: 30, bottom: 40, left: 80 };

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', 'auto');

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // X Scale: Months
    const x = d3.scaleBand()
      .domain(months)
      .range([0, innerWidth])
      .padding(0.08);

    // Y Scale: Departments
    const y = d3.scaleBand()
      .domain(departments)
      .range([0, innerHeight])
      .padding(0.12);

    // Color interpolation function
    const getColor = (pct: number) => {
      if (pct >= 88) return '#10b981'; // Exemplary Green
      if (pct >= 75) return '#0284c7'; // Compliant Sky/Navy Blue
      if (pct >= 65) return '#f59e0b'; // Amber Condonation
      return '#ef4444'; // Red Detention
    };

    // Draw X Axis (Months)
    g.append('g')
      .attr('transform', `translate(0, 0)`)
      .call(d3.axisTop(x).tickSize(0))
      .call(axis => axis.select('.domain').remove())
      .selectAll('text')
      .style('fill', 'var(--text-muted, #94a3b8)')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .style('letter-spacing', '0.02em');

    // Draw Y Axis (Departments)
    g.append('g')
      .call(d3.axisLeft(y).tickSize(0))
      .call(axis => axis.select('.domain').remove())
      .selectAll('text')
      .style('fill', 'var(--text-main, #f8fafc)')
      .style('font-size', '11px')
      .style('font-weight', '700');

    // Draw Heatmap Cells
    const cellGroups = g.selectAll('.heatmap-cell')
      .data(matrix)
      .enter()
      .append('g')
      .attr('class', 'heatmap-cell')
      .style('cursor', 'pointer')
      .on('mouseenter', (event, d) => {
        setSelectedCell(d);
      })
      .on('click', (event, d) => {
        setSelectedCell(d);
      });

    cellGroups.append('rect')
      .attr('x', d => x(d.month) || 0)
      .attr('y', d => y(d.department) || 0)
      .attr('width', x.bandwidth())
      .attr('height', y.bandwidth())
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', d => getColor(d.percentage))
      .attr('opacity', 0.88)
      .attr('stroke', 'rgba(255, 255, 255, 0.08)')
      .attr('stroke-width', 1)
      .style('transition', 'all 0.2s ease')
      .on('mouseenter', function() {
        d3.select(this)
          .attr('opacity', 1)
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);
      })
      .on('mouseleave', function() {
        d3.select(this)
          .attr('opacity', 0.88)
          .attr('stroke', 'rgba(255, 255, 255, 0.08)')
          .attr('stroke-width', 1);
      });

    // Cell Text Label (percentage)
    cellGroups.append('text')
      .attr('x', d => (x(d.month) || 0) + x.bandwidth() / 2)
      .attr('y', d => (y(d.department) || 0) + y.bandwidth() / 2 + 4)
      .attr('text-anchor', 'middle')
      .style('fill', '#ffffff')
      .style('font-size', '10.5px')
      .style('font-weight', '700')
      .style('pointer-events', 'none')
      .style('font-family', 'inherit')
      .text(d => `${d.percentage}%`);

  }, [data]);

  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
        Loading campus departmental attendance matrix...
      </div>
    );
  }

  if (!data) return null;

  return (
    <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Top Analytics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
        <div style={{ backgroundColor: 'var(--bg-input)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(2, 132, 199, 0.15)', color: 'var(--sky-blue)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Campus Mean</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>{data.summary.campusAverage}%</div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-input)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Leading Department</div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--text-main)' }}>{data.summary.bestDept}</div>
          </div>
        </div>

        <div style={{ backgroundColor: 'var(--bg-input)', padding: '0.9rem 1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={18} />
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>University Norm</div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#10b981' }}>≥ 75% Mandatory</div>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div style={{ width: '100%', overflowX: 'auto', backgroundColor: 'var(--bg-card)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
        <svg ref={svgRef}></svg>
      </div>

      {/* Interactive Detail Inspector */}
      {selectedCell && (
        <div style={{
          backgroundColor: 'var(--bg-input)',
          padding: '1rem 1.25rem',
          borderRadius: '10px',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
              Selected Cell Detail • {selectedCell.month}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)', marginTop: '0.2rem' }}>
              {selectedCell.deptName} ({selectedCell.department})
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Academic Hours Attended: <strong>{selectedCell.presentHours}</strong> / {selectedCell.totalHours} hrs
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: '900', color: selectedCell.percentage >= 75 ? '#10b981' : '#ef4444' }}>
                {selectedCell.percentage}%
              </div>
              <div style={{ fontSize: '0.75rem', fontWeight: '700', color: selectedCell.percentage >= 75 ? '#10b981' : selectedCell.percentage >= 65 ? '#f59e0b' : '#ef4444' }}>
                {selectedCell.percentage >= 88 ? 'Exemplary Attendance' : selectedCell.percentage >= 75 ? 'Anna Univ Eligible' : selectedCell.percentage >= 65 ? 'Condonation Required' : 'Detention Threshold'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Institutional Legend Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', padding: '0.75rem 1rem', backgroundColor: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
        <div style={{ fontWeight: '600', color: 'var(--text-muted)' }}>
          Attendance Bands (Regulation 2023):
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#10b981' }}></span>
            <span>≥ 88% Exemplary</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#0284c7' }}></span>
            <span>75% - 87% Compliant</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#f59e0b' }}></span>
            <span>65% - 74% Condonation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ width: '12px', height: '12px', borderRadius: '3px', backgroundColor: '#ef4444' }}></span>
            <span>&lt; 65% Detention</span>
          </div>
        </div>
      </div>
    </div>
  );
}
