import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { ModuleDistribution, AssessmentModule } from '../../types/assessment.types';

interface QuestionDistributionProps {
  distribution: ModuleDistribution[];
  modules: AssessmentModule[];
  totalQuestions: number;
}

const MODULE_COLORS: Record<string, string> = {
  'Core Python': '#0984e3',
  'Advanced Python': '#6c5ce7',
  'SQL & Database': '#00b894',
  'Data Structures': '#fdcb6e',
  'Machine Learning': '#e17055',
  'Web Development': '#00cec9',
};

export const QuestionDistribution: React.FC<QuestionDistributionProps> = ({
  distribution,
  modules,
  totalQuestions,
}) => {
  // Map distribution items with names and colors
  const chartData = distribution.map((item) => {
    const mod = modules.find((m) => m.id === item.module_id);
    const name = item.module_name || mod?.name || 'Module';
    return {
      name,
      value: item.question_count,
      weight: item.weight_percent,
      fill: MODULE_COLORS[name] || '#636e72',
    };
  });

  const totalAllocated = distribution.reduce((sum, d) => sum + d.question_count, 0);

  return (
    <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="section-title" style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
          Question Distribution
        </h3>
        <span className="badge badge-purple" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
          {totalAllocated} / {totalQuestions} Questions
        </span>
      </div>

      {chartData.length > 0 ? (
        <>
          <div style={{ width: '100%', height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any, name: any, item: any) => [
                    `${val} Questions (${item.payload.weight}%)`,
                    name,
                  ]}
                  contentStyle={{
                    borderRadius: 8,
                    fontSize: '0.8rem',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg)',
                    color: 'var(--text-primary)',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.55rem',
              marginTop: '0.5rem',
              overflowY: 'auto',
              maxHeight: 220,
            }}
          >
            {chartData.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.45rem 0.6rem',
                  borderRadius: 6,
                  background: 'var(--card-hover-bg)',
                  fontSize: '0.82rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: item.fill,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.name}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>{item.weight}%</span>
                  <span
                    style={{
                      fontWeight: 700,
                      color: 'var(--accent)',
                      background: 'rgba(108, 92, 231, 0.12)',
                      padding: '0.1rem 0.4rem',
                      borderRadius: 4,
                      fontSize: '0.78rem',
                    }}
                  >
                    {item.value}Q
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '2rem 1rem',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: '50%',
              border: '2px dashed var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              fontSize: '1.2rem',
            }}
          >
            📊
          </div>
          <p style={{ fontSize: '0.85rem', fontWeight: 500, margin: 0 }}>
            Select modules & weights to calculate question distribution
          </p>
        </div>
      )}
    </div>
  );
};
